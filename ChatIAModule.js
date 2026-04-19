/**
 * Chat IA Module v6.0 — Frontend Component
 * Componente standalone para substituir a seção chat-ia no app.js
 * 
 * Para integrar: no app.js, onde renderiza "chat-ia" === Et, substituir por:
 *   "chat-ia" === Et && React.createElement(ChatIAModule, { 
 *     apiUrl: API_URL, fetchAuth: fetchAuth, 
 *     chatIaRegioes: chatIaRegioes, setChatIaRegioes: setChatIaRegioes 
 *   })
 */
(function() {
  const { useState, useEffect, useRef, useCallback } = React;

  // ======================== CATEGORIAS DE CONTEXTO ========================
  const CATEGORIAS_CONTEXTO = [
    { id: 'geral', label: '📋 Geral', desc: 'Instruções gerais de comportamento' },
    { id: 'negocio', label: '💼 Regra de Negócio', desc: 'Regras específicas da operação' },
    { id: 'calculo', label: '🔢 Cálculo/Fórmula', desc: 'Como calcular métricas' },
    { id: 'glossario', label: '📖 Glossário', desc: 'Termos e definições internas' },
    { id: 'formato', label: '🎨 Formatação', desc: 'Como apresentar dados' },
  ];

  // ======================== COMPONENTE PRINCIPAL ========================
  function ChatIAModule({ apiUrl, fetchAuth }) {
    // Estado principal
    const [msgs, setMsgs] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [sql, setSql] = useState(null);
    const [filtros, setFiltros] = useState({ cod_cliente: [], nomes_clientes: [], centro_custo: [], data_inicio: '', data_fim: '', regiao: '' });
    const [iniciado, setIniciado] = useState(false);
    const [clientes, setClientes] = useState([]);
    const [centros, setCentros] = useState([]);
    const [filtrosLoading, setFiltrosLoading] = useState(false);
    const [dropAberto, setDropAberto] = useState(null);
    const [buscaCliente, setBuscaCliente] = useState('');
    const [conversas, setConversas] = useState([]);
    const [conversaAtual, setConversaAtual] = useState(null);
    const [conversasLoading, setConversasLoading] = useState(false);
    const [sidebarAberta, setSidebarAberta] = useState(false);
    const [exportando, setExportando] = useState(false);
    const [regioes, setRegioes] = useState([]);

    // v6.0: Estados do painel de contexto
    const [painelContexto, setPainelContexto] = useState(false);
    const [contextos, setContextos] = useState([]);
    const [contextosLoading, setContextosLoading] = useState(false);
    const [novoContexto, setNovoContexto] = useState({ titulo: '', conteudo: '', categoria: 'geral' });
    const [editandoContexto, setEditandoContexto] = useState(null);
    const [abaContexto, setAbaContexto] = useState('instrucoes'); // 'instrucoes' | 'memorias'
    const [memorias, setMemorias] = useState([]);
    const [novaMemoria, setNovaMemoria] = useState('');

    const chatEndRef = useRef(null);
    const inputRef = useRef(null);
    const dataLoaded = useRef(false);

    // Auto-scroll ao receber nova mensagem
    useEffect(function() {
      if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, [msgs]);

    // Carregar dados iniciais
    useEffect(function() {
      if (dataLoaded.current) return;
      dataLoaded.current = true;
      setFiltrosLoading(true);
      Promise.all([
        fetchAuth(apiUrl + '/bi/chat-ia/filtros').then(function(r) { return r.json(); }),
        fetchAuth(apiUrl + '/bi/regioes').then(function(r) { return r.json(); }).catch(function() { return []; })
      ]).then(function(results) {
        setClientes(results[0].clientes || []);
        setRegioes(Array.isArray(results[1]) ? results[1] : []);
        setFiltrosLoading(false);
      }).catch(function() { setFiltrosLoading(false); });
      // Carregar Chart.js
      if (!window.Chart && !document.getElementById('chartjs-cdn')) {
        var script = document.createElement('script');
        script.id = 'chartjs-cdn';
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
        document.head.appendChild(script);
      }
    }, []);

    // ======================== FUNÇÕES ========================
    function carregarContextos() {
      setContextosLoading(true);
      fetchAuth(apiUrl + '/bi/chat-ia/contexto').then(function(r) { return r.json(); }).then(function(data) {
        setContextos(data.contextos || []);
        setContextosLoading(false);
      }).catch(function() { setContextosLoading(false); });
    }

    function carregarMemorias() {
      fetchAuth(apiUrl + '/bi/chat-ia/memorias').then(function(r) { return r.json(); }).then(function(data) {
        setMemorias(data.memorias || []);
      }).catch(function() {});
    }

    function salvarContexto() {
      if (!novoContexto.titulo.trim() || !novoContexto.conteudo.trim()) return;
      var method = editandoContexto ? 'PUT' : 'POST';
      var url = editandoContexto ? apiUrl + '/bi/chat-ia/contexto/' + editandoContexto : apiUrl + '/bi/chat-ia/contexto';
      fetchAuth(url, { method: method, body: JSON.stringify(novoContexto) })
        .then(function(r) { return r.json(); })
        .then(function() {
          setNovoContexto({ titulo: '', conteudo: '', categoria: 'geral' });
          setEditandoContexto(null);
          carregarContextos();
        }).catch(function() {});
    }

    function deletarContexto(id) {
      if (!confirm('Remover esta instrução?')) return;
      fetchAuth(apiUrl + '/bi/chat-ia/contexto/' + id, { method: 'DELETE' })
        .then(function() { carregarContextos(); }).catch(function() {});
    }

    function toggleContexto(ctx) {
      fetchAuth(apiUrl + '/bi/chat-ia/contexto/' + ctx.id, { method: 'PUT', body: JSON.stringify({ ativo: !ctx.ativo }) })
        .then(function() { carregarContextos(); }).catch(function() {});
    }

    function salvarMemoria() {
      if (!novaMemoria.trim()) return;
      fetchAuth(apiUrl + '/bi/chat-ia/memorias', { method: 'POST', body: JSON.stringify({ conteudo: novaMemoria.trim() }) })
        .then(function() { setNovaMemoria(''); carregarMemorias(); }).catch(function() {});
    }

    function deletarMemoria(id) {
      fetchAuth(apiUrl + '/bi/chat-ia/memorias/' + id, { method: 'DELETE' })
        .then(function() { carregarMemorias(); }).catch(function() {});
    }

    function enviarMensagem(textoOverride) {
      var userPrompt = (textoOverride || input).trim();
      if (!userPrompt || loading) return;
      setInput('');
      setLoading(true);
      var novaMsgs = [].concat(msgs, [{ prompt: userPrompt, resposta: null, sql: null, dados: null, loading: true }]);
      setMsgs(novaMsgs);
      var hist = msgs.map(function(m) { return { prompt: m.prompt, resposta: m.resposta }; });
      fetchAuth(apiUrl + '/bi/chat-ia', {
        method: 'POST',
        body: JSON.stringify({ prompt: userPrompt, historico: hist, filtros: filtros, conversa_id: conversaAtual })
      }).then(function(r) { return r.json(); }).then(function(data) {
        var resposta = data.resposta || 'Erro ao processar';
        var _charts = [];
        var _textParts = [];
        var chartRegex = /\[CHART\]\s*\n?([\s\S]*?)\n?\[\/CHART\]/g;
        var cm;
        while ((cm = chartRegex.exec(resposta)) !== null) {
          try { _charts.push(JSON.parse(cm[1].trim())); } catch(e) {}
        }
        var cleanText = resposta.replace(/\[CHART\]\s*\n?[\s\S]*?\n?\[\/CHART\]/g, '\n__CHART__\n');
        _textParts = cleanText.split('__CHART__');
        setMsgs(function(prev) {
          var u = prev.slice();
          u[u.length - 1] = { prompt: userPrompt, resposta: resposta, sql: data.sql || null, dados: data.dados || null, loading: false, _charts: _charts, _textParts: _textParts, _msgId: Date.now() };
          return u;
        });
        setLoading(false);
      }).catch(function(err) {
        setMsgs(function(prev) {
          var u = prev.slice();
          u[u.length - 1] = { prompt: userPrompt, resposta: '❌ Erro: ' + err.message, sql: null, dados: null, loading: false, _charts: [], _textParts: ['❌ Erro: ' + err.message], _msgId: Date.now() };
          return u;
        });
        setLoading(false);
      });
    }

    function selecionarRegiao(regiaoId) {
      if (!regiaoId) {
        setFiltros(function(prev) { return Object.assign({}, prev, { regiao: '', cod_cliente: [], nomes_clientes: [], centro_custo: [] }); });
        setCentros([]);
        return;
      }
      var regiaoObj = regioes.find(function(r) { return String(r.id) === regiaoId; });
      if (regiaoObj && regiaoObj.clientes) {
        var itens = typeof regiaoObj.clientes === 'string' ? JSON.parse(regiaoObj.clientes) : regiaoObj.clientes;
        if (Array.isArray(itens)) {
          var cods = []; var nomes = []; var centrosArr = [];
          itens.forEach(function(item) {
            var cod = typeof item === 'number' ? item : parseInt(item.cod_cliente);
            if (!isNaN(cod) && cods.indexOf(cod) === -1) {
              cods.push(cod);
              var cl = clientes.find(function(c) { return parseInt(c.cod_cliente) === cod; });
              nomes.push(cl ? cl.nome_fantasia : ('Cod ' + cod));
            }
            if (item.centro_custo) centrosArr.push(item.centro_custo);
          });
          setFiltros(function(prev) { return Object.assign({}, prev, { regiao: regiaoId, cod_cliente: cods, nomes_clientes: nomes, centro_custo: centrosArr }); });
          if (cods.length > 0) {
            fetchAuth(apiUrl + '/bi/chat-ia/filtros?cod_cliente=' + cods.join(',')).then(function(r) { return r.json(); }).then(function(data) { setCentros(data.centros_do_cliente || []); }).catch(function() {});
          }
        }
      }
    }

    function toggleCliente(c) {
      var cod = parseInt(c.cod_cliente);
      var selecionado = filtros.cod_cliente.indexOf(cod) !== -1;
      var novosCods, novosNomes;
      if (selecionado) {
        novosCods = filtros.cod_cliente.filter(function(x) { return parseInt(x) !== cod; });
        novosNomes = filtros.nomes_clientes.filter(function(_, idx) { return parseInt(filtros.cod_cliente[idx]) !== cod; });
      } else {
        novosCods = [].concat(filtros.cod_cliente, [cod]);
        novosNomes = [].concat(filtros.nomes_clientes, [c.nome_fantasia]);
      }
      setFiltros(function(prev) { return Object.assign({}, prev, { cod_cliente: novosCods, nomes_clientes: novosNomes, centro_custo: [] }); });
      if (novosCods.length > 0) {
        fetchAuth(apiUrl + '/bi/chat-ia/filtros?cod_cliente=' + novosCods.join(',')).then(function(r) { return r.json(); }).then(function(data) { setCentros(data.centros_do_cliente || []); }).catch(function() {});
      } else { setCentros([]); }
    }

    // ======================== FORMATAÇÃO MARKDOWN ========================
    function formatMd(text) {
      return text
        .replace(/```[\s\S]*?```/g, function(m) { return '<pre class="bg-gray-900 text-green-400 p-3 rounded-lg text-xs overflow-x-auto my-2 font-mono">' + m.replace(/```\w*\n?/g, '').replace(/```/g, '') + '</pre>'; })
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900">$1</strong>')
        .replace(/#{3}\s(.+)/g, '<h4 class="font-bold text-gray-800 text-sm mt-3 mb-1">$1</h4>')
        .replace(/#{2}\s(.+)/g, '<h3 class="font-bold text-gray-800 text-base mt-4 mb-1">$1</h3>')
        .replace(/#{1}\s(.+)/g, '<h2 class="font-bold text-gray-900 text-lg mt-4 mb-1">$1</h2>')
        .replace(/\n- (.+)/g, function(_, content) { return '<div class="flex items-start gap-2 ml-3 my-0.5"><span class="text-emerald-500 mt-0.5">•</span><span>' + content + '</span></div>'; })
        .replace(/\|(.+)\|/g, function(row) {
          var cells = row.split('|').filter(function(c) { return c.trim(); });
          if (cells.every(function(c) { return /^[\s-:]+$/.test(c); })) return '';
          var tag = cells.map(function(c) { return '<td class="border border-gray-200 px-3 py-1.5 text-xs">' + c.trim() + '</td>'; }).join('');
          return tag ? '<tr class="hover:bg-gray-50">' + tag + '</tr>' : '';
        })
        .replace(/(<tr.*<\/tr>)/gs, '<div class="overflow-x-auto my-3"><table class="border-collapse border border-gray-200 w-full text-xs rounded-lg overflow-hidden">$1</table></div>')
        .replace(/🟢/g, '<span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600 text-xs">✓</span>')
        .replace(/🔴/g, '<span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs">✗</span>')
        .replace(/🟡/g, '<span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-100 text-yellow-600 text-xs">!</span>')
        .replace(/\n{3,}/g, '<br>')
        .replace(/\n{2}/g, '<br>')
        .replace(/\n/g, '<br>');
    }

    // ======================== RENDERIZAR GRÁFICO ========================
    function renderChart(container, chartCfg) {
      if (!container || container.dataset.chartDone || !window.Chart) return;
      container.dataset.chartDone = '1';

      var wrap = document.createElement('div');
      wrap.style.cssText = 'background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-radius:12px;padding:20px;border:1px solid #e2e8f0;height:320px;position:relative;box-shadow:0 1px 3px rgba(0,0,0,0.05);';
      var cvs = document.createElement('canvas');
      wrap.appendChild(cvs);
      container.appendChild(wrap);

      try {
        var chartType = chartCfg.type === 'horizontalBar' ? 'bar' : (chartCfg.type === 'area' ? 'line' : (chartCfg.type === 'stackedBar' ? 'bar' : (chartCfg.type === 'combo' ? 'bar' : chartCfg.type)));
        var isHz = chartCfg.type === 'horizontalBar';
        var isStacked = chartCfg.type === 'stackedBar' || chartCfg.options?.stacked;
        var isArea = chartCfg.type === 'area';
        var showValues = chartCfg.options?.showValues || false;

        var paleta = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#14b8a6','#f97316','#ec4899','#6366f1','#06b6d4'];

        var datasets = (chartCfg.datasets || []).map(function(ds, idx) {
          var dsType = ds.type || chartType;
          var bc = ds.color || paleta[idx % paleta.length];
          var bg = ds.colors || ((chartType === 'pie' || chartType === 'doughnut') ? paleta : (isArea ? bc + '20' : bc));
          return {
            label: ds.label || '',
            data: ds.data || [],
            backgroundColor: bg,
            borderColor: (chartType === 'line' || dsType === 'line' || isArea) ? bc : (chartType === 'pie' || chartType === 'doughnut') ? '#fff' : bg,
            borderWidth: (chartType === 'line' || dsType === 'line' || isArea) ? 2.5 : (chartType === 'pie' || chartType === 'doughnut') ? 2 : 0,
            fill: isArea || ds.fill,
            tension: 0.4,
            borderRadius: (chartType === 'bar' || dsType === 'bar') ? 6 : 0,
            pointRadius: (chartType === 'line' || dsType === 'line' || isArea) ? 4 : 0,
            pointHoverRadius: (chartType === 'line' || dsType === 'line' || isArea) ? 7 : 0,
            pointBackgroundColor: bc,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            type: ds.type || undefined,
            yAxisID: ds.yAxisID || undefined,
            order: ds.type === 'line' ? 0 : 1
          };
        });

        var hasY1 = datasets.some(function(ds) { return ds.yAxisID === 'y1'; });

        var scales = {};
        if (chartType !== 'pie' && chartType !== 'doughnut' && chartType !== 'radar') {
          scales = {
            x: { grid: { display: false }, ticks: { font: { size: 11, family: "'Inter',sans-serif" }, maxRotation: 45, color: '#64748b' }, border: { display: false }, stacked: isStacked },
            y: { grid: { color: '#f1f5f9', drawBorder: false }, ticks: { font: { size: 11, family: "'Inter',sans-serif" }, color: '#64748b', callback: function(v) { return typeof v === 'number' && v >= 1000 ? (v/1000).toFixed(1) + 'k' : v; } }, beginAtZero: true, border: { display: false }, stacked: isStacked }
          };
          if (isHz) { scales.x.stacked = isStacked; scales.y.stacked = isStacked; }
          if (hasY1) {
            scales.y1 = { position: 'right', grid: { display: false }, ticks: { font: { size: 11 }, color: '#64748b', callback: function(v) { return v + '%'; } }, beginAtZero: true, border: { display: false } };
          }
        }

        var plugins = {
          title: { display: !!chartCfg.title, text: chartCfg.title || '', font: { size: 15, weight: '600', family: "'Inter',sans-serif" }, color: '#1e293b', padding: { bottom: 20 } },
          legend: { display: (chartCfg.options?.legend !== false) && (datasets.length > 1 || chartType === 'pie' || chartType === 'doughnut'), position: 'bottom', labels: { padding: 20, usePointStyle: true, pointStyle: 'circle', font: { size: 12, family: "'Inter',sans-serif" } } },
          tooltip: { backgroundColor: '#1e293b', titleFont: { size: 13, family: "'Inter',sans-serif" }, bodyFont: { size: 12, family: "'Inter',sans-serif" }, padding: 12, cornerRadius: 8, displayColors: true, boxPadding: 6 }
        };

        if (showValues) {
          // Plugin datalabels inline
          plugins.datalabels = undefined; // Chart.js não tem built-in, usamos callbacks de animation
        }

        new Chart(cvs, {
          type: chartType,
          data: { labels: chartCfg.labels || [], datasets: datasets },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 700, easing: 'easeOutQuart' },
            indexAxis: isHz ? 'y' : 'x',
            plugins: plugins,
            scales: scales,
            interaction: { intersect: false, mode: 'index' },
            onClick: function(evt, elements) {
              if (elements.length > 0 && chartCfg.labels) {
                var el = elements[0];
                var label = chartCfg.labels[el.index];
                var value = datasets[el.datasetIndex]?.data[el.index];
                console.log('Chart click:', label, value);
              }
            }
          },
          plugins: showValues ? [{
            id: 'datalabels',
            afterDatasetsDraw: function(chart) {
              var ctx2 = chart.ctx;
              chart.data.datasets.forEach(function(dataset, i) {
                var meta = chart.getDatasetMeta(i);
                if (meta.type === 'line') return;
                meta.data.forEach(function(bar, index) {
                  var data = dataset.data[index];
                  if (data == null || data === 0) return;
                  ctx2.fillStyle = '#475569';
                  ctx2.font = 'bold 11px Inter,sans-serif';
                  ctx2.textAlign = 'center';
                  ctx2.textBaseline = 'bottom';
                  var display = typeof data === 'number' && data >= 1000 ? (data/1000).toFixed(1) + 'k' : data;
                  ctx2.fillText(display, bar.x, bar.y - 4);
                });
              });
            }
          }] : []
        });
      } catch(e) { console.error('Chart error:', e); }
    }

    // ======================== ELEMENTOS AUXILIARES ========================
    var el = React.createElement;

    // Tag de filtro ativo
    function FilterTag(props) {
      return el('span', { className: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ' + (props.color || 'bg-emerald-100 text-emerald-700') },
        props.label,
        props.onRemove && el('button', { onClick: props.onRemove, className: 'ml-0.5 hover:text-red-500 font-bold' }, '×')
      );
    }

    // ======================== RENDER ========================
    var filtroResumo = '';
    if (iniciado) {
      var parts = [];
      if (filtros.regiao) {
        var reg = regioes.find(function(r) { return String(r.id) === String(filtros.regiao); });
        if (reg) parts.push('🗺️ ' + reg.nome);
      }
      if (filtros.nomes_clientes && filtros.nomes_clientes.length > 0) {
        parts.push('📌 ' + (filtros.nomes_clientes.length <= 2 ? filtros.nomes_clientes.join(', ') : filtros.nomes_clientes.length + ' clientes'));
      } else { parts.push('📌 Todos os clientes'); }
      if (filtros.centro_custo && filtros.centro_custo.length > 0) {
        parts.push(filtros.centro_custo.length <= 2 ? filtros.centro_custo.join(', ') : filtros.centro_custo.length + ' centros');
      }
      if (filtros.data_inicio) parts.push('📅 ' + filtros.data_inicio + ' a ' + filtros.data_fim);
      filtroResumo = parts.join(' · ');
    }

    return el('div', { className: 'space-y-4', onClick: function(e) { if (!e.target.closest('[data-dropdown]') && dropAberto) setDropAberto(null); } },

      // ════════════ HEADER ════════════
      el('div', { className: 'bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl shadow-purple-200' },
        el('div', { className: 'flex items-center justify-between' },
          el('div', { className: 'flex items-center gap-4' },
            el('div', { className: 'w-14 h-14 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center text-3xl ring-2 ring-white/20' }, '🤖'),
            el('div', null,
              el('h2', { className: 'text-2xl font-bold tracking-tight' }, 'Chat IA — Analista de Dados'),
              el('p', { className: 'text-purple-200 mt-1 text-sm' }, iniciado ? filtroResumo : 'Configure os filtros para iniciar a conversa')
            )
          ),
          iniciado && el('div', { className: 'flex items-center gap-2 flex-wrap justify-end' },
            // Botão Contexto/Treinamento
            el('button', {
              onClick: function() {
                setPainelContexto(!painelContexto);
                if (!painelContexto) { carregarContextos(); carregarMemorias(); }
              },
              className: 'px-3 py-2 bg-white/15 backdrop-blur-sm rounded-xl text-sm hover:bg-white/25 transition-all ring-1 ring-white/10 flex items-center gap-1.5'
            }, '🧠', ' Treinar IA'),
            el('button', {
              onClick: function() {
                setSidebarAberta(!sidebarAberta);
                if (!sidebarAberta) {
                  setConversasLoading(true);
                  fetchAuth(apiUrl + '/bi/chat-ia/conversas').then(function(r) { return r.json(); }).then(function(data) {
                    setConversas(data.conversas || []); setConversasLoading(false);
                  }).catch(function() { setConversasLoading(false); });
                }
              },
              className: 'px-3 py-2 bg-white/15 backdrop-blur-sm rounded-xl text-sm hover:bg-white/25 transition-all ring-1 ring-white/10'
            }, '📂 Conversas'),
            msgs.length > 0 && el('button', {
              onClick: function() {
                setExportando(true);
                fetchAuth(apiUrl + '/bi/chat-ia/exportar', {
                  method: 'POST',
                  body: JSON.stringify({ mensagens: msgs.map(function(m) { return { prompt: m.prompt, resposta: m.resposta }; }), filtros: filtros })
                }).then(function(r) { return r.blob(); }).then(function(blob) {
                  var url = URL.createObjectURL(blob);
                  var a = document.createElement('a'); a.href = url; a.download = 'chat-ia-relatorio-' + new Date().toISOString().slice(0, 10) + '.docx'; a.click();
                  URL.revokeObjectURL(url); setExportando(false);
                }).catch(function() { setExportando(false); });
              },
              disabled: exportando,
              className: 'px-3 py-2 bg-white/15 backdrop-blur-sm rounded-xl text-sm hover:bg-white/25 transition-all ring-1 ring-white/10'
            }, exportando ? '⏳...' : '📄 Exportar'),
            msgs.length > 0 && !conversaAtual && el('button', {
              onClick: function() {
                var titulo = msgs[0]?.prompt?.substring(0, 60) || 'Conversa';
                fetchAuth(apiUrl + '/bi/chat-ia/conversas', { method: 'POST', body: JSON.stringify({ titulo: titulo, filtros: filtros }) })
                  .then(function(r) { return r.json(); }).then(function(data) { if (data.conversa) setConversaAtual(data.conversa.id); }).catch(function() {});
              },
              className: 'px-3 py-2 bg-white/15 backdrop-blur-sm rounded-xl text-sm hover:bg-white/25 transition-all ring-1 ring-white/10'
            }, '💾 Salvar'),
            el('button', {
              onClick: function() { setIniciado(false); setMsgs([]); setSql(null); setConversaAtual(null); setFiltros({ cod_cliente: [], nomes_clientes: [], centro_custo: [], data_inicio: '', data_fim: '', regiao: '' }); setDropAberto(null); setBuscaCliente(''); setPainelContexto(false); },
              className: 'px-3 py-2 bg-white/15 backdrop-blur-sm rounded-xl text-sm hover:bg-white/25 transition-all ring-1 ring-white/10'
            }, '🔄 Nova')
          )
        )
      ),

      // ════════════ PAINEL DE CONTEXTO / TREINAMENTO ════════════
      painelContexto && el('div', { className: 'bg-white rounded-2xl shadow-xl border border-purple-100 overflow-hidden' },
        // Abas
        el('div', { className: 'flex border-b border-gray-100' },
          el('button', {
            onClick: function() { setAbaContexto('instrucoes'); },
            className: 'flex-1 py-3.5 text-sm font-semibold transition-all ' + (abaContexto === 'instrucoes' ? 'text-purple-700 border-b-2 border-purple-600 bg-purple-50/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50')
          }, '📋 Instruções de Contexto'),
          el('button', {
            onClick: function() { setAbaContexto('memorias'); carregarMemorias(); },
            className: 'flex-1 py-3.5 text-sm font-semibold transition-all ' + (abaContexto === 'memorias' ? 'text-purple-700 border-b-2 border-purple-600 bg-purple-50/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50')
          }, '🧠 Memórias Aprendidas')
        ),

        // Conteúdo: Instruções
        abaContexto === 'instrucoes' && el('div', { className: 'p-5 space-y-4' },
          el('div', { className: 'bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100' },
            el('p', { className: 'text-sm text-purple-800 font-medium mb-1' }, '💡 O que são instruções de contexto?'),
            el('p', { className: 'text-xs text-purple-600' }, 'São regras e conhecimentos que a IA vai seguir em TODAS as conversas. Use para ensinar regras de negócio, glossário, fórmulas de cálculo, ou preferências de formatação.')
          ),
          // Formulário
          el('div', { className: 'bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100' },
            el('div', { className: 'flex gap-3' },
              el('input', {
                type: 'text', placeholder: 'Título da instrução (ex: "Como calcular margem")',
                value: novoContexto.titulo,
                onChange: function(e) { setNovoContexto(function(p) { return Object.assign({}, p, { titulo: e.target.value }); }); },
                className: 'flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500'
              }),
              el('select', {
                value: novoContexto.categoria,
                onChange: function(e) { setNovoContexto(function(p) { return Object.assign({}, p, { categoria: e.target.value }); }); },
                className: 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500'
              },
                CATEGORIAS_CONTEXTO.map(function(cat) {
                  return el('option', { key: cat.id, value: cat.id }, cat.label);
                })
              )
            ),
            el('textarea', {
              placeholder: 'Escreva a instrução que a IA deve seguir...\n\nExemplos:\n- "Quando eu pedir faturamento, sempre separe por centro de custo"\n- "O cliente 767 é o Comollati, SLA fixo de 120 minutos"\n- "Taxa de prazo ideal é >=85%, abaixo disso é crítico"',
              value: novoContexto.conteudo,
              onChange: function(e) { setNovoContexto(function(p) { return Object.assign({}, p, { conteudo: e.target.value }); }); },
              rows: 4,
              className: 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none'
            }),
            el('div', { className: 'flex justify-end gap-2' },
              editandoContexto && el('button', {
                onClick: function() { setEditandoContexto(null); setNovoContexto({ titulo: '', conteudo: '', categoria: 'geral' }); },
                className: 'px-4 py-2 text-sm text-gray-500 hover:text-gray-700'
              }, 'Cancelar'),
              el('button', {
                onClick: salvarContexto,
                disabled: !novoContexto.titulo.trim() || !novoContexto.conteudo.trim(),
                className: 'px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm'
              }, editandoContexto ? '✏️ Atualizar' : '➕ Adicionar Instrução')
            )
          ),
          // Lista
          contextosLoading ? el('div', { className: 'text-center py-6 text-gray-400 text-sm' }, '⏳ Carregando...') :
          contextos.length === 0 ? el('div', { className: 'text-center py-6' },
            el('p', { className: 'text-gray-400 text-sm' }, 'Nenhuma instrução cadastrada'),
            el('p', { className: 'text-gray-300 text-xs mt-1' }, 'Adicione instruções acima para treinar sua IA')
          ) :
          el('div', { className: 'space-y-2' },
            contextos.map(function(ctx) {
              var cat = CATEGORIAS_CONTEXTO.find(function(c) { return c.id === ctx.categoria; }) || CATEGORIAS_CONTEXTO[0];
              return el('div', {
                key: ctx.id,
                className: 'bg-white rounded-xl border p-4 group hover:shadow-md transition-all ' + (ctx.ativo ? 'border-gray-200' : 'border-gray-100 opacity-50')
              },
                el('div', { className: 'flex items-start justify-between gap-3' },
                  el('div', { className: 'flex-1 min-w-0' },
                    el('div', { className: 'flex items-center gap-2 mb-1.5' },
                      el('span', { className: 'text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium' }, cat.label),
                      !ctx.ativo && el('span', { className: 'text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400' }, 'Desativado')
                    ),
                    el('h4', { className: 'font-semibold text-gray-800 text-sm' }, ctx.titulo),
                    el('p', { className: 'text-xs text-gray-500 mt-1 whitespace-pre-wrap line-clamp-3' }, ctx.conteudo)
                  ),
                  el('div', { className: 'flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0' },
                    el('button', {
                      onClick: function() { toggleContexto(ctx); },
                      className: 'p-1.5 rounded-lg hover:bg-gray-100 text-sm',
                      title: ctx.ativo ? 'Desativar' : 'Ativar'
                    }, ctx.ativo ? '👁️' : '👁️‍🗨️'),
                    el('button', {
                      onClick: function() { setEditandoContexto(ctx.id); setNovoContexto({ titulo: ctx.titulo, conteudo: ctx.conteudo, categoria: ctx.categoria }); },
                      className: 'p-1.5 rounded-lg hover:bg-blue-50 text-sm', title: 'Editar'
                    }, '✏️'),
                    el('button', {
                      onClick: function() { deletarContexto(ctx.id); },
                      className: 'p-1.5 rounded-lg hover:bg-red-50 text-sm', title: 'Remover'
                    }, '🗑️')
                  )
                )
              );
            })
          )
        ),

        // Conteúdo: Memórias
        abaContexto === 'memorias' && el('div', { className: 'p-5 space-y-4' },
          el('div', { className: 'bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100' },
            el('p', { className: 'text-sm text-blue-800 font-medium mb-1' }, '🧠 Memórias automáticas'),
            el('p', { className: 'text-xs text-blue-600' }, 'A IA aprende suas preferências automaticamente durante as conversas. Você também pode adicionar memórias manualmente aqui.')
          ),
          // Adicionar memória manual
          el('div', { className: 'flex gap-2' },
            el('input', {
              type: 'text', placeholder: 'Ex: "Prefiro faturamento separado por centro de custo"',
              value: novaMemoria,
              onChange: function(e) { setNovaMemoria(e.target.value); },
              onKeyDown: function(e) { if (e.key === 'Enter') salvarMemoria(); },
              className: 'flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            }),
            el('button', {
              onClick: salvarMemoria,
              disabled: !novaMemoria.trim(),
              className: 'px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-all'
            }, '+ Salvar')
          ),
          memorias.length === 0 ? el('p', { className: 'text-sm text-gray-400 text-center py-4' }, 'Nenhuma memória registrada ainda') :
          el('div', { className: 'space-y-2' },
            memorias.map(function(mem) {
              return el('div', { key: mem.id, className: 'flex items-center justify-between bg-gray-50 rounded-lg p-3 group hover:bg-blue-50 transition-all border border-gray-100' },
                el('div', { className: 'flex-1' },
                  el('p', { className: 'text-sm text-gray-700' }, mem.conteudo),
                  el('p', { className: 'text-xs text-gray-400 mt-0.5' }, new Date(mem.created_at).toLocaleDateString('pt-BR'))
                ),
                el('button', {
                  onClick: function() { deletarMemoria(mem.id); },
                  className: 'ml-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all'
                }, '🗑️')
              );
            })
          )
        )
      ),

      // ════════════ SIDEBAR CONVERSAS ════════════
      sidebarAberta && el('div', { className: 'bg-white rounded-2xl shadow-xl p-5 border border-gray-100' },
        el('div', { className: 'flex items-center justify-between mb-4' },
          el('h3', { className: 'font-bold text-gray-700 text-sm' }, '📂 Conversas Salvas'),
          el('button', { onClick: function() { setSidebarAberta(false); }, className: 'text-gray-400 hover:text-gray-600 text-lg p-1' }, '✕')
        ),
        conversasLoading && el('p', { className: 'text-sm text-gray-400 text-center py-6' }, '⏳ Carregando...'),
        !conversasLoading && conversas.length === 0 && el('p', { className: 'text-sm text-gray-400 text-center py-6' }, 'Nenhuma conversa salva'),
        !conversasLoading && conversas.length > 0 && el('div', { className: 'space-y-2 max-h-72 overflow-y-auto' },
          conversas.map(function(conv) {
            return el('div', { key: conv.id, className: 'flex items-center justify-between p-3 rounded-xl border hover:border-purple-300 hover:bg-purple-50 cursor-pointer group transition-all ' + (conversaAtual === conv.id ? 'border-purple-500 bg-purple-50' : 'border-gray-100') },
              el('div', { className: 'flex-1 min-w-0', onClick: function() {
                fetchAuth(apiUrl + '/bi/chat-ia/conversas/' + conv.id).then(function(r) { return r.json(); }).then(function(data) {
                  if (data.historico) {
                    setMsgs(data.historico.map(function(h) {
                      var _charts = []; var _textParts = [h.resposta || ''];
                      var chartRegex = /\[CHART\]\s*\n?([\s\S]*?)\n?\[\/CHART\]/g; var cm;
                      while ((cm = chartRegex.exec(h.resposta || '')) !== null) { try { _charts.push(JSON.parse(cm[1].trim())); } catch(e) {} }
                      var cleanText = (h.resposta || '').replace(/\[CHART\]\s*\n?[\s\S]*?\n?\[\/CHART\]/g, '\n__CHART__\n');
                      _textParts = cleanText.split('__CHART__');
                      return { prompt: h.prompt, resposta: h.resposta, sql: h.sql, dados: h.dados, loading: false, _charts: _charts, _textParts: _textParts, _msgId: Date.now() + Math.random() };
                    }));
                    setConversaAtual(conv.id);
                    if (data.conversa?.filtros) { try { setFiltros(JSON.parse(data.conversa.filtros)); } catch(e) {} }
                    setIniciado(true); setSidebarAberta(false);
                  }
                }).catch(function() {});
              }},
                el('p', { className: 'text-sm font-medium text-gray-700 truncate' }, conv.titulo),
                el('p', { className: 'text-xs text-gray-400 mt-0.5' }, (conv.total_mensagens || 0) + ' msgs · ' + new Date(conv.updated_at).toLocaleDateString('pt-BR'))
              ),
              el('button', { onClick: function(e) { e.stopPropagation(); if(confirm('Deletar conversa?')) { fetchAuth(apiUrl + '/bi/chat-ia/conversas/' + conv.id, {method:'DELETE'}).then(function() { setConversas(function(p){return p.filter(function(c){return c.id!==conv.id})}); if(conversaAtual===conv.id){setConversaAtual(null);setMsgs([]);} }).catch(function(){}); } }, className: 'ml-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all' }, '🗑️')
            );
          })
        )
      ),

      // ════════════ TELA DE FILTROS (antes de iniciar) ════════════
      !iniciado && el('div', { className: 'bg-white rounded-2xl shadow-xl p-6 space-y-5 border border-gray-100' },
        el('h3', { className: 'text-lg font-bold text-gray-800 flex items-center gap-2' }, '🎯 Configurar Contexto da Conversa'),
        el('p', { className: 'text-sm text-gray-500' }, 'A IA vai responder TODAS as perguntas respeitando esses filtros. Deixe em branco para consultar todos os dados.'),

        // Filtro por Região
        regioes.length > 0 && el('div', { className: 'bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200' },
          el('label', { className: 'block text-sm font-bold text-purple-800 mb-2' }, '🗺️ Filtrar por Região'),
          el('select', {
            value: filtros.regiao || '',
            onChange: function(e) { selecionarRegiao(e.target.value); },
            className: 'w-full border border-purple-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 bg-white'
          },
            el('option', { value: '' }, '— Sem filtro de região —'),
            regioes.map(function(reg) {
              var itens = typeof reg.clientes === 'string' ? JSON.parse(reg.clientes) : (reg.clientes || []);
              var qtd = Array.isArray(itens) ? new Set(itens.map(function(i) { return typeof i === 'number' ? i : i.cod_cliente; })).size : 0;
              return el('option', { key: reg.id, value: reg.id }, reg.nome + ' (' + qtd + ' clientes)');
            })
          ),
          filtros.regiao && el('p', { className: 'text-xs text-purple-500 mt-1.5' }, '✅ ' + filtros.nomes_clientes.length + ' cliente(s) selecionados automaticamente')
        ),

        // Grid de filtros
        el('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
          // Multi-select Clientes
          el('div', { className: 'relative', 'data-dropdown': true },
            el('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, '👤 Clientes'),
            el('div', {
              onClick: function() { setDropAberto(dropAberto === 'cliente' ? null : 'cliente'); },
              className: 'w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm cursor-pointer flex items-center justify-between hover:border-purple-400 transition-colors ' + (dropAberto === 'cliente' ? 'ring-2 ring-purple-500 border-purple-500' : '')
            },
              el('span', { className: filtros.cod_cliente.length === 0 ? 'text-gray-400' : 'text-gray-800 truncate' },
                filtros.cod_cliente.length === 0 ? 'Todos os clientes' :
                filtros.nomes_clientes.length <= 2 ? filtros.nomes_clientes.join(', ') :
                filtros.nomes_clientes.length + ' clientes selecionados'
              ),
              el('span', { className: 'text-gray-400 ml-2' }, dropAberto === 'cliente' ? '▲' : '▼')
            ),
            // Tags dos selecionados
            filtros.cod_cliente.length > 0 && el('div', { className: 'flex flex-wrap gap-1 mt-1.5' },
              filtros.nomes_clientes.map(function(nome, i) {
                return el(FilterTag, {
                  key: i,
                  label: nome.length > 20 ? nome.substring(0, 20) + '...' : nome,
                  color: 'bg-purple-100 text-purple-700',
                  onRemove: function() {
                    var novosCods = filtros.cod_cliente.filter(function(_, idx) { return idx !== i; });
                    var novosNomes = filtros.nomes_clientes.filter(function(_, idx) { return idx !== i; });
                    setFiltros(function(prev) { return Object.assign({}, prev, { cod_cliente: novosCods, nomes_clientes: novosNomes, centro_custo: [] }); });
                    if (novosCods.length > 0) {
                      fetchAuth(apiUrl + '/bi/chat-ia/filtros?cod_cliente=' + novosCods.join(',')).then(function(r) { return r.json(); }).then(function(data) { setCentros(data.centros_do_cliente || []); }).catch(function() {});
                    } else { setCentros([]); }
                  }
                });
              })
            ),
            // Dropdown clientes
            dropAberto === 'cliente' && el('div', { className: 'absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-2xl max-h-72 overflow-hidden', style: { top: '100%' } },
              el('div', { className: 'p-2.5 border-b border-gray-100 sticky top-0 bg-white' },
                el('input', {
                  type: 'text', placeholder: '🔍 Buscar cliente...',
                  value: buscaCliente,
                  onChange: function(e) { setBuscaCliente(e.target.value); },
                  onClick: function(e) { e.stopPropagation(); },
                  className: 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500',
                  autoFocus: true
                })
              ),
              el('div', { className: 'overflow-y-auto', style: { maxHeight: '220px' } },
                clientes.filter(function(c) {
                  if (!buscaCliente) return true;
                  return c.nome_fantasia.toLowerCase().includes(buscaCliente.toLowerCase()) || String(c.cod_cliente).includes(buscaCliente);
                }).map(function(c) {
                  var sel = filtros.cod_cliente.indexOf(parseInt(c.cod_cliente)) !== -1;
                  return el('label', { key: c.cod_cliente, className: 'flex items-center gap-2.5 px-3 py-2 hover:bg-purple-50 cursor-pointer transition-colors text-sm ' + (sel ? 'bg-purple-50' : ''), onClick: function(e) { e.stopPropagation(); } },
                    el('input', {
                      type: 'checkbox', checked: sel,
                      onChange: function() { toggleCliente(c); },
                      className: 'rounded border-gray-300 text-purple-600 focus:ring-purple-500'
                    }),
                    el('span', { className: 'truncate' }, c.nome_fantasia),
                    el('span', { className: 'text-gray-400 text-xs ml-auto flex-shrink-0' }, '#' + c.cod_cliente)
                  );
                }),
                clientes.filter(function(c) {
                  if (!buscaCliente) return true;
                  return c.nome_fantasia.toLowerCase().includes(buscaCliente.toLowerCase()) || String(c.cod_cliente).includes(buscaCliente);
                }).length === 0 && el('div', { className: 'px-3 py-4 text-sm text-gray-400 text-center' }, 'Nenhum cliente encontrado')
              ),
              filtros.cod_cliente.length > 0 && el('div', { className: 'p-2.5 border-t border-gray-100 bg-gray-50 flex justify-between items-center' },
                el('span', { className: 'text-xs text-gray-500' }, filtros.cod_cliente.length + ' selecionado(s)'),
                el('button', {
                  onClick: function(e) { e.stopPropagation(); setFiltros(function(prev) { return Object.assign({}, prev, { cod_cliente: [], nomes_clientes: [], centro_custo: [] }); }); setCentros([]); },
                  className: 'text-xs text-red-500 hover:text-red-700 font-medium'
                }, 'Limpar tudo')
              )
            )
          ),

          // Multi-select Centros de Custo
          el('div', { className: 'relative', 'data-dropdown': true },
            el('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, '🏢 Centro de Custo'),
            el('div', {
              onClick: function() { if (filtros.cod_cliente.length > 0) setDropAberto(dropAberto === 'centro' ? null : 'centro'); },
              className: 'w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm flex items-center justify-between transition-colors ' + (filtros.cod_cliente.length === 0 ? 'bg-gray-50 cursor-not-allowed' : 'cursor-pointer hover:border-purple-400') + (dropAberto === 'centro' ? ' ring-2 ring-purple-500 border-purple-500' : '')
            },
              el('span', { className: filtros.centro_custo.length === 0 ? 'text-gray-400' : 'text-gray-800 truncate' },
                filtros.cod_cliente.length === 0 ? 'Selecione um cliente primeiro' :
                filtros.centro_custo.length === 0 ? 'Todos os centros' :
                filtros.centro_custo.length <= 2 ? filtros.centro_custo.join(', ') :
                filtros.centro_custo.length + ' centros selecionados'
              ),
              el('span', { className: 'text-gray-400 ml-2' }, filtros.cod_cliente.length === 0 ? '' : dropAberto === 'centro' ? '▲' : '▼')
            ),
            filtros.centro_custo.length > 0 && el('div', { className: 'flex flex-wrap gap-1 mt-1.5' },
              filtros.centro_custo.map(function(cc, i) {
                return el(FilterTag, {
                  key: i, label: cc.length > 25 ? cc.substring(0, 25) + '...' : cc,
                  color: 'bg-blue-100 text-blue-700',
                  onRemove: function() {
                    setFiltros(function(prev) { return Object.assign({}, prev, { centro_custo: prev.centro_custo.filter(function(_, idx) { return idx !== i; }) }); });
                  }
                });
              })
            ),
            dropAberto === 'centro' && el('div', { className: 'absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-2xl max-h-52 overflow-y-auto', style: { top: '100%' } },
              centros.map(function(cc) {
                var sel = filtros.centro_custo.indexOf(cc) !== -1;
                return el('label', { key: cc, className: 'flex items-center gap-2.5 px-3 py-2 hover:bg-blue-50 cursor-pointer transition-colors text-sm ' + (sel ? 'bg-blue-50' : ''), onClick: function(e) { e.stopPropagation(); } },
                  el('input', {
                    type: 'checkbox', checked: sel,
                    onChange: function() {
                      setFiltros(function(prev) {
                        var novos = sel ? prev.centro_custo.filter(function(x) { return x !== cc; }) : [].concat(prev.centro_custo, [cc]);
                        return Object.assign({}, prev, { centro_custo: novos });
                      });
                    },
                    className: 'rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                  }),
                  el('span', { className: 'truncate' }, cc)
                );
              }),
              centros.length === 0 && el('div', { className: 'px-3 py-4 text-sm text-gray-400 text-center' }, 'Nenhum centro disponível')
            )
          ),

          // Data início
          el('div', null,
            el('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, '📅 Data Início'),
            el('input', {
              type: 'date', value: filtros.data_inicio,
              onChange: function(e) { setFiltros(function(prev) { return Object.assign({}, prev, { data_inicio: e.target.value }); }); },
              className: 'w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500'
            })
          ),
          // Data fim
          el('div', null,
            el('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, '📅 Data Fim'),
            el('input', {
              type: 'date', value: filtros.data_fim,
              onChange: function(e) { setFiltros(function(prev) { return Object.assign({}, prev, { data_fim: e.target.value }); }); },
              className: 'w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500'
            })
          )
        ),

        // Botão iniciar
        el('button', {
          onClick: function() { setDropAberto(null); setIniciado(true); },
          className: 'w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold text-lg hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 ring-1 ring-purple-500/20'
        }, '💬 Iniciar Conversa com a IA')
      ),

      // ════════════ CONVERSA (após iniciar) ════════════
      iniciado && el(React.Fragment, null,
        // Indicador de filtros ativos (badge fixo)
        (filtros.cod_cliente.length > 0 || filtros.data_inicio) && el('div', { className: 'bg-purple-50 rounded-xl px-4 py-2.5 border border-purple-200 flex items-center gap-2 text-xs' },
          el('span', { className: 'text-purple-600 font-semibold' }, '🔒 Filtros ativos:'),
          filtros.nomes_clientes.length > 0 && el('span', { className: 'bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full' },
            filtros.nomes_clientes.length <= 2 ? filtros.nomes_clientes.join(', ') : filtros.nomes_clientes.length + ' clientes'
          ),
          filtros.data_inicio && el('span', { className: 'bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full' }, filtros.data_inicio + ' a ' + filtros.data_fim),
          el('span', { className: 'text-purple-400 ml-auto' }, 'Toda consulta respeita esses filtros')
        ),

        // Exemplos de prompts
        msgs.length === 0 && el('div', { className: 'bg-white rounded-2xl shadow-lg p-6 border border-gray-100' },
          el('h3', { className: 'text-sm font-bold text-gray-500 mb-3 uppercase tracking-wide' }, '💡 Sugestões de perguntas'),
          el('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2' },
            (filtros.cod_cliente.length > 0 ? [
              'Me dá o faturamento líquido do período selecionado',
              'Quais motoboys fizeram mais de 20 entregas e tiveram prazo abaixo de 70%?',
              'Qual a evolução dia a dia da taxa de prazo?',
              'Me mostra os retornos — quantos, quais tipos e tendência',
              'Distribuição de entregas por hora do dia em gráfico',
              'Ranking dos 10 melhores motoboys por taxa de prazo'
            ] : [
              'Me dá um panorama geral da operação neste período',
              'Top 10 motoboys por entregas com taxa de prazo — com gráfico',
              'Quais clientes estão com retorno acima de 5%?',
              'Faturamento líquido por cliente, do maior pro menor',
              'Quantas motos rodaram por dia e média de entregas por moto?',
              'Evolução semanal de entregas — gráfico de linha'
            ]).map(function(exemplo, i) {
              return el('button', {
                key: i,
                onClick: function() { enviarMensagem(exemplo); },
                className: 'text-left p-3.5 border border-gray-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all text-sm text-gray-600 hover:text-gray-800 group'
              }, el('span', { className: 'text-purple-400 group-hover:text-purple-600 mr-2' }, '→'), exemplo);
            })
          )
        ),

        // Área de mensagens
        msgs.length > 0 && el('div', { className: 'space-y-4' },
          msgs.map(function(msg, i) {
            return el('div', { key: i, className: 'space-y-3' },
              // Mensagem do usuário
              el('div', { className: 'flex justify-end' },
                el('div', { className: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl rounded-br-md px-5 py-3 max-w-[80%] shadow-lg' },
                  el('p', { className: 'text-sm leading-relaxed' }, msg.prompt)
                )
              ),
              // Resposta da IA
              msg.resposta && !msg.loading && el('div', { className: 'flex justify-start' },
                el('div', { className: 'bg-white rounded-2xl rounded-bl-md px-5 py-4 max-w-[90%] shadow-lg border border-gray-100' },
                  msg.sql && el('details', { className: 'mb-3' },
                    el('summary', { className: 'text-xs text-gray-400 cursor-pointer hover:text-purple-600 flex items-center gap-1' }, '🔍 Ver SQL executada'),
                    el('pre', { className: 'mt-2 bg-gray-900 text-green-400 text-xs p-3 rounded-xl overflow-x-auto font-mono' }, msg.sql)
                  ),
                  // Conteúdo intercalado
                  el('div', null,
                    (function() {
                      var textParts = msg._textParts || [msg.resposta];
                      var chartConfigs = msg._charts || [];
                      var els = [];
                      for (var pi = 0; pi < textParts.length; pi++) {
                        if (textParts[pi].trim()) {
                          els.push(el('div', { key: 't' + pi, className: 'max-w-none text-gray-700 text-sm leading-relaxed', dangerouslySetInnerHTML: { __html: formatMd(textParts[pi]) } }));
                        }
                        if (pi < chartConfigs.length) {
                          els.push(el('div', { key: 'c' + pi, className: 'my-4', ref: (function(cfg) { return function(container) { renderChart(container, cfg); }; })(chartConfigs[pi]) }));
                        }
                      }
                      return els;
                    })()
                  ),
                  msg.dados && msg.dados.total > 0 && el('div', { className: 'mt-3 pt-3 border-t border-gray-100 flex items-center gap-2' },
                    el('span', { className: 'text-xs text-gray-400' }, '📊 ' + msg.dados.total + ' registros consultados')
                  )
                )
              ),
              // Loading
              msg.loading && el('div', { className: 'flex justify-start' },
                el('div', { className: 'bg-white rounded-2xl px-5 py-4 shadow-lg border border-gray-100 flex items-center gap-3' },
                  el('div', { className: 'flex gap-1' },
                    el('div', { className: 'w-2 h-2 bg-purple-400 rounded-full animate-bounce', style: { animationDelay: '0ms' } }),
                    el('div', { className: 'w-2 h-2 bg-purple-400 rounded-full animate-bounce', style: { animationDelay: '150ms' } }),
                    el('div', { className: 'w-2 h-2 bg-purple-400 rounded-full animate-bounce', style: { animationDelay: '300ms' } })
                  ),
                  el('span', { className: 'text-sm text-gray-500' }, 'Consultando e analisando dados...')
                )
              )
            );
          }),
          el('div', { ref: chatEndRef })
        ),

        // Input de mensagem
        el('div', { className: 'sticky bottom-0 bg-gradient-to-t from-gray-50 via-gray-50/95 to-transparent pt-6 pb-2' },
          el('div', { className: 'bg-white rounded-2xl shadow-xl border border-gray-200 p-3 flex gap-3 items-end ring-1 ring-gray-100' },
            el('textarea', {
              ref: inputRef,
              value: input,
              onChange: function(e) { setInput(e.target.value); },
              onKeyDown: function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  enviarMensagem();
                }
              },
              placeholder: 'Pergunte qualquer coisa sobre os dados... (Enter para enviar)',
              rows: 2,
              className: 'flex-1 resize-none border-0 focus:ring-0 text-sm text-gray-700 placeholder-gray-400',
              style: { outline: 'none' }
            }),
            el('button', {
              onClick: function() { enviarMensagem(); },
              disabled: !input.trim() || loading,
              className: 'px-5 py-2.5 rounded-xl font-bold text-sm transition-all ' + (input.trim() && !loading ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-200' : 'bg-gray-200 text-gray-400 cursor-not-allowed')
            }, loading ? '⏳' : 'Enviar ➤'),
            msgs.length > 0 && el('button', {
              onClick: function() { setMsgs([]); setSql(null); },
              className: 'px-3 py-2.5 rounded-xl text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all',
              title: 'Limpar conversa'
            }, '🗑️')
          ),
          el('p', { className: 'text-xs text-gray-400 text-center mt-2.5' }, 'Powered by Gemini · Os filtros ativos são aplicados automaticamente em toda consulta')
        )
      )
    );
  }

  // Expor globalmente
  window.ChatIAModule = ChatIAModule;
})();
