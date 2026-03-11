// ==================== MÓDULO AGENTE RPA — CORREÇÃO DE ENDEREÇOS ====================
// Arquivo: modulo-agente.js
// Dois painéis: 1) Formulário do motoboy  2) Histórico admin
// Cores: roxo #550776, laranja #f37601, dark mode responsivo
// ==================================================================================

(function () {
  'use strict';

  const { useState, useEffect, useCallback, useRef } = React;
  const h = React.createElement;

  // ── Constantes ─────────────────────────────────────────────────────────────
  const PONTOS = [2, 3, 4, 5, 6, 7];
  const POLLING_INTERVAL = 5000;   // 5s
  const POLLING_TIMEOUT  = 180000; // 3 minutos

  // ── Helpers ────────────────────────────────────────────────────────────────
  function fmtDT(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function BadgeStatus({ status }) {
    const map = {
      pendente:     { bg: 'bg-yellow-100',  text: 'text-yellow-800',  label: 'Pendente'     },
      processando:  { bg: 'bg-blue-100',    text: 'text-blue-800',    label: 'Processando'  },
      sucesso:      { bg: 'bg-green-100',   text: 'text-green-800',   label: 'Sucesso'      },
      erro:         { bg: 'bg-red-100',     text: 'text-red-800',     label: 'Erro'         },
    };
    const s = map[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status };
    return h('span', {
      className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`
    }, s.label);
  }

  // ── ABA: Formulário do motoboy ──────────────────────────────────────────────
  function TabFormulario({ API_URL, fetchAuth, showToast }) {
    const [form, setForm]           = useState({ os_numero: '', ponto: '', localizacao_raw: '' });
    const [loading, setLoading]     = useState(false);
    const [solicitacaoId, setSolId] = useState(null);
    const [fase, setFase]           = useState('idle'); // idle | polling | sucesso | erro | timeout
    const [detalheErro, setDetalhe] = useState('');
    const pollingRef                = useRef(null);
    const timeoutRef                = useRef(null);

    const pararPolling = useCallback(() => {
      if (pollingRef.current)  clearInterval(pollingRef.current);
      if (timeoutRef.current)  clearTimeout(timeoutRef.current);
      pollingRef.current = null;
      timeoutRef.current = null;
    }, []);

    useEffect(() => () => pararPolling(), [pararPolling]);

    const iniciarPolling = useCallback((id) => {
      // Timeout de segurança: 3 minutos
      timeoutRef.current = setTimeout(() => {
        pararPolling();
        setFase('timeout');
        setLoading(false);
      }, POLLING_TIMEOUT);

      pollingRef.current = setInterval(async () => {
        try {
          const res  = await fetchAuth(`${API_URL}/agent/status/${id}`);
          const data = await res.json();
          const s    = data.status;

          if (s === 'sucesso') {
            pararPolling();
            setFase('sucesso');
            setLoading(false);
          } else if (s === 'erro') {
            pararPolling();
            setDetalhe(data.detalhe_erro || 'Erro desconhecido.');
            setFase('erro');
            setLoading(false);
          }
          // pendente | processando → continua polling
        } catch {
          // Erro de rede, continua tentando
        }
      }, POLLING_INTERVAL);
    }, [fetchAuth, API_URL, pararPolling]);

    const handleChange = (e) => {
      const { name, value } = e.target;
      setForm(f => ({ ...f, [name]: value }));
    };

    const handleSubmit = async () => {
      // Validação básica no client
      if (!form.os_numero.trim() || !form.ponto || !form.localizacao_raw.trim()) {
        showToast('Preencha todos os campos.', 'error');
        return;
      }

      setLoading(true);
      setFase('polling');
      setDetalhe('');

      try {
        const res  = await fetchAuth(`${API_URL}/agent/corrigir-endereco`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            os_numero:       form.os_numero.trim(),
            ponto:           parseInt(form.ponto, 10),
            localizacao_raw: form.localizacao_raw.trim(),
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          const msg = data.erros ? data.erros.join(' ') : (data.erro || 'Erro ao enviar.');
          setFase('erro');
          setDetalhe(msg);
          setLoading(false);
          return;
        }

        setSolId(data.id);
        iniciarPolling(data.id);

      } catch (err) {
        setFase('erro');
        setDetalhe('Falha de conexão. Tente novamente.');
        setLoading(false);
      }
    };

    const resetar = () => {
      pararPolling();
      setForm({ os_numero: '', ponto: '', localizacao_raw: '' });
      setSolId(null);
      setFase('idle');
      setDetalhe('');
      setLoading(false);
    };

    // ── Render: feedback após envio ────────────────────────────────────────
    if (fase === 'sucesso') return h('div', { className: 'flex flex-col items-center justify-center py-16 px-6 text-center' },
      h('div', { className: 'w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6' },
        h('span', { className: 'text-4xl' }, '✅')
      ),
      h('h2', { className: 'text-2xl font-bold text-green-700 mb-2' }, 'Endereço corrigido com sucesso!'),
      h('p', { className: 'text-gray-500 mb-8' }, `OS ${form.os_numero || ''} — Ponto ${form.ponto || ''}`),
      h('button', {
        onClick: resetar,
        className: 'px-8 py-3 rounded-xl font-semibold text-white',
        style: { background: 'linear-gradient(135deg, #550776, #7c3aed)' },
      }, '+ Nova Correção')
    );

    if (fase === 'erro' && !loading) return h('div', { className: 'flex flex-col items-center justify-center py-16 px-6 text-center' },
      h('div', { className: 'w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6' },
        h('span', { className: 'text-4xl' }, '❌')
      ),
      h('h2', { className: 'text-xl font-bold text-red-700 mb-2' }, 'Erro ao processar correção'),
      h('p', { className: 'text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-4 mb-8 max-w-md' }, detalheErro),
      h('button', {
        onClick: resetar,
        className: 'px-8 py-3 rounded-xl font-semibold text-white',
        style: { background: 'linear-gradient(135deg, #f37601, #ea580c)' },
      }, '↩ Tentar Novamente')
    );

    if (fase === 'timeout') return h('div', { className: 'flex flex-col items-center justify-center py-16 px-6 text-center' },
      h('div', { className: 'w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mb-6' },
        h('span', { className: 'text-4xl' }, '⏱️')
      ),
      h('h2', { className: 'text-xl font-bold text-yellow-700 mb-2' }, 'Processamento em andamento'),
      h('p', { className: 'text-gray-500 mb-8' }, 'Verifique o histórico em breve para ver o resultado.'),
      h('button', {
        onClick: resetar,
        className: 'px-8 py-3 rounded-xl font-semibold text-white',
        style: { background: 'linear-gradient(135deg, #550776, #7c3aed)' },
      }, '+ Nova Correção')
    );

    // ── Render: formulário ────────────────────────────────────────────────
    const disabled = loading;

    return h('div', { className: 'max-w-lg mx-auto px-4 py-8' },

      // Cabeçalho
      h('div', { className: 'text-center mb-8' },
        h('div', { className: 'w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center',
          style: { background: 'linear-gradient(135deg, #550776, #7c3aed)' } },
          h('span', { className: 'text-3xl' }, '📍')
        ),
        h('h1', { className: 'text-2xl font-bold text-gray-900' }, 'Correção de Endereço'),
        h('p', { className: 'text-gray-500 text-sm mt-1' }, 'Informe o número da OS e a localização correta')
      ),

      // Card do formulário
      h('div', { className: 'bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-5' },

        // Campo OS
        h('div', null,
          h('label', { className: 'block text-sm font-semibold text-gray-700 mb-1.5' }, 'Número da OS *'),
          h('input', {
            name: 'os_numero',
            type: 'tel',
            inputMode: 'numeric',
            pattern: '[0-9]*',
            placeholder: 'Ex: 1071614',
            value: form.os_numero,
            onChange: handleChange,
            disabled,
            className: `w-full rounded-xl border px-4 py-3 text-gray-900 text-lg font-mono transition
              ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200'}
              outline-none`,
          })
        ),

        // Ponto
        h('div', null,
          h('label', { className: 'block text-sm font-semibold text-gray-700 mb-1.5' }, 'Ponto a corrigir *'),
          h('select', {
            name: 'ponto',
            value: form.ponto,
            onChange: handleChange,
            disabled,
            className: `w-full rounded-xl border px-4 py-3 text-gray-900 transition
              ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200'}
              outline-none appearance-none`,
          },
            h('option', { value: '' }, '— Selecione o ponto —'),
            PONTOS.map(p => h('option', { key: p, value: p }, `Ponto ${p}`))
          )
        ),

        // Localização
        h('div', null,
          h('label', { className: 'block text-sm font-semibold text-gray-700 mb-1.5' }, 'Localização *'),
          h('textarea', {
            name: 'localizacao_raw',
            rows: 3,
            placeholder: 'Cole o link do Maps ou as coordenadas\nEx: https://maps.app.goo.gl/Xxx ou -16.738952, -49.293811',
            value: form.localizacao_raw,
            onChange: handleChange,
            disabled,
            className: `w-full rounded-xl border px-4 py-3 text-gray-900 text-sm resize-none transition
              ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200'}
              outline-none`,
          }),
          h('p', { className: 'text-xs text-gray-400 mt-1' },
            'Aceita: link curto (goo.gl), link completo do Maps, ou coordenadas "-16.73, -49.29"')
        ),

        // Botão enviar
        h('button', {
          onClick: handleSubmit,
          disabled,
          className: `w-full py-4 rounded-xl font-bold text-white text-lg transition flex items-center justify-center gap-3
            ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90 active:scale-[0.98]'}`,
          style: { background: 'linear-gradient(135deg, #550776, #7c3aed)' },
        },
          loading
            ? h(React.Fragment, null,
                h('div', { className: 'w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin' }),
                'Processando...'
              )
            : h(React.Fragment, null,
                h('span', null, '🚀'),
                'Enviar Correção'
              )
        )
      ),

      // Aviso de segurança
      h('div', { className: 'mt-4 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl' },
        h('span', { className: 'text-amber-500 text-sm mt-0.5' }, '⚠️'),
        h('p', { className: 'text-xs text-amber-700' },
          'O Ponto 1 (coleta) nunca pode ser alterado. Apenas pontos de entrega (2 a 7) são corrigíveis.')
      ),

      // Status do polling
      fase === 'polling' && h('div', { className: 'mt-6 flex items-center gap-3 justify-center text-gray-500 text-sm' },
        h('div', { className: 'w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin' }),
        'Aguardando confirmação do robô...'
      )
    );
  }

  // ── ABA: Histórico Admin ────────────────────────────────────────────────────
  function TabHistorico({ API_URL, fetchAuth, showToast, usuario }) {
    const [dados, setDados]        = useState([]);
    const [total, setTotal]        = useState(0);
    const [loading, setLoading]    = useState(false);
    const [expandido, setExpandido] = useState(null);
    const [filtros, setFiltros]    = useState({ status: '', os_numero: '', de: '', ate: '' });
    const [page, setPage]          = useState(1);
    const PER_PAGE = 20;

    const carregar = useCallback(async (pg = 1, f = filtros) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: pg, per_page: PER_PAGE });
        if (f.status)    params.set('status',    f.status);
        if (f.os_numero) params.set('os_numero', f.os_numero);
        if (f.de)        params.set('de',        f.de);
        if (f.ate)       params.set('ate',       f.ate);

        const res  = await fetchAuth(`${API_URL}/agent/historico?${params}`);
        const data = await res.json();
        setDados(data.registros || []);
        setTotal(data.total || 0);
        setPage(pg);
      } catch {
        showToast('Erro ao carregar histórico', 'error');
      } finally {
        setLoading(false);
      }
    }, [fetchAuth, API_URL, showToast, filtros]);

    useEffect(() => { carregar(1); }, []);

    const handleFiltro = (e) => {
      const { name, value } = e.target;
      setFiltros(f => ({ ...f, [name]: value }));
    };

    const aplicarFiltros = () => carregar(1, filtros);

    const validar = async (id) => {
      try {
        const res = await fetchAuth(`${API_URL}/agent/validar/${id}`, { method: 'PATCH' });
        if (res.ok) {
          showToast('Registro validado!', 'success');
          carregar(page, filtros);
        }
      } catch {
        showToast('Erro ao validar', 'error');
      }
    };

    const exportarCSV = () => {
      const params = new URLSearchParams();
      if (filtros.status)    params.set('status',    filtros.status);
      if (filtros.os_numero) params.set('os_numero', filtros.os_numero);
      if (filtros.de)        params.set('de',        filtros.de);
      if (filtros.ate)       params.set('ate',       filtros.ate);
      window.open(`${API_URL}/agent/historico/csv?${params}`, '_blank');
    };

    const totalPaginas = Math.ceil(total / PER_PAGE);

    return h('div', { className: 'max-w-6xl mx-auto px-4 py-6' },

      // Título
      h('div', { className: 'flex items-center justify-between mb-6' },
        h('div', null,
          h('h2', { className: 'text-xl font-bold text-gray-900' }, '📋 Histórico de Correções'),
          h('p', { className: 'text-sm text-gray-500 mt-0.5' }, `${total} registros encontrados`)
        ),
        h('button', {
          onClick: exportarCSV,
          className: 'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50 transition',
        }, '📥 Exportar CSV')
      ),

      // Filtros
      h('div', { className: 'bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5 grid grid-cols-2 md:grid-cols-5 gap-3' },
        // Status
        h('select', {
          name: 'status', value: filtros.status, onChange: handleFiltro,
          className: 'col-span-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-400',
        },
          h('option', { value: '' }, 'Todos os status'),
          ['pendente','processando','sucesso','erro'].map(s =>
            h('option', { key: s, value: s }, s.charAt(0).toUpperCase() + s.slice(1))
          )
        ),
        // OS
        h('input', {
          name: 'os_numero', value: filtros.os_numero, onChange: handleFiltro,
          placeholder: 'Nº OS',
          className: 'col-span-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-400',
        }),
        // De
        h('input', {
          name: 'de', type: 'date', value: filtros.de, onChange: handleFiltro,
          className: 'col-span-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-400',
        }),
        // Até
        h('input', {
          name: 'ate', type: 'date', value: filtros.ate, onChange: handleFiltro,
          className: 'col-span-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-400',
        }),
        // Botão
        h('button', {
          onClick: aplicarFiltros,
          className: 'col-span-2 md:col-span-1 rounded-xl text-sm font-semibold text-white py-2 transition hover:opacity-90',
          style: { background: 'linear-gradient(135deg, #550776, #7c3aed)' },
        }, '🔍 Filtrar')
      ),

      // Loading
      loading && h('div', { className: 'flex items-center justify-center py-12 gap-3 text-gray-400' },
        h('div', { className: 'w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin' }),
        'Carregando...'
      ),

      // Tabela
      !loading && h('div', { className: 'bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden' },
        // Desktop
        h('div', { className: 'hidden md:block overflow-x-auto' },
          h('table', { className: 'w-full text-sm' },
            h('thead', null,
              h('tr', { className: 'bg-gray-50 border-b border-gray-100' },
                ['ID','OS','Ponto','Status','Criado em','Processado em','Validado por','Ações'].map(col =>
                  h('th', { key: col, className: 'px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide' }, col)
                )
              )
            ),
            h('tbody', null,
              dados.length === 0 && h('tr', null,
                h('td', { colSpan: 8, className: 'text-center py-12 text-gray-400' }, 'Nenhum registro encontrado.')
              ),
              dados.map(r => h(React.Fragment, { key: r.id },
                h('tr', {
                  className: `border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer ${expandido === r.id ? 'bg-purple-50' : ''}`,
                  onClick: () => setExpandido(expandido === r.id ? null : r.id),
                },
                  h('td', { className: 'px-4 py-3 font-mono text-gray-500 text-xs' }, `#${r.id}`),
                  h('td', { className: 'px-4 py-3 font-semibold text-gray-900' }, r.os_numero),
                  h('td', { className: 'px-4 py-3 text-gray-600' }, `Ponto ${r.ponto}`),
                  h('td', { className: 'px-4 py-3' }, h(BadgeStatus, { status: r.status })),
                  h('td', { className: 'px-4 py-3 text-gray-500 text-xs' }, fmtDT(r.criado_em)),
                  h('td', { className: 'px-4 py-3 text-gray-500 text-xs' }, fmtDT(r.processado_em)),
                  h('td', { className: 'px-4 py-3 text-gray-500 text-xs' },
                    r.validado_por
                      ? h('div', null,
                          h('div', { className: 'font-medium text-gray-700' }, r.validado_por),
                          h('div', { className: 'text-gray-400' }, fmtDT(r.validado_em))
                        )
                      : '—'
                  ),
                  h('td', { className: 'px-4 py-3' },
                    !r.validado_por && h('button', {
                      onClick: (e) => { e.stopPropagation(); validar(r.id); },
                      className: 'px-3 py-1 text-xs font-semibold rounded-lg text-white transition hover:opacity-80',
                      style: { background: '#f37601' },
                    }, '✓ Validar')
                  )
                ),
                // Expansão de erro
                expandido === r.id && r.detalhe_erro && h('tr', { key: `exp-${r.id}` },
                  h('td', { colSpan: 8, className: 'px-6 py-3 bg-red-50 border-b border-red-100' },
                    h('p', { className: 'text-xs font-semibold text-red-700 mb-1' }, '🔍 Detalhe do erro:'),
                    h('pre', { className: 'text-xs text-red-600 whitespace-pre-wrap font-mono' }, r.detalhe_erro)
                  )
                )
              ))
            )
          )
        ),

        // Mobile cards
        h('div', { className: 'md:hidden divide-y divide-gray-100' },
          dados.length === 0 && h('div', { className: 'text-center py-12 text-gray-400 text-sm' }, 'Nenhum registro encontrado.'),
          dados.map(r => h('div', { key: r.id, className: 'p-4' },
            h('div', { className: 'flex items-start justify-between mb-2' },
              h('div', null,
                h('span', { className: 'font-semibold text-gray-900' }, `OS ${r.os_numero}`),
                h('span', { className: 'ml-2 text-gray-400 text-xs' }, `Ponto ${r.ponto}`)
              ),
              h(BadgeStatus, { status: r.status })
            ),
            h('div', { className: 'text-xs text-gray-400 mb-2' }, fmtDT(r.criado_em)),
            r.detalhe_erro && h('div', {
              className: 'mt-2 p-2 bg-red-50 rounded-lg text-xs text-red-600 cursor-pointer',
              onClick: () => setExpandido(expandido === r.id ? null : r.id),
            }, expandido === r.id ? r.detalhe_erro : '🔴 Ver detalhe do erro'),
            !r.validado_por && h('button', {
              onClick: () => validar(r.id),
              className: 'mt-3 w-full py-2 text-sm font-semibold rounded-xl text-white',
              style: { background: '#f37601' },
            }, '✓ Marcar como validado')
          ))
        )
      ),

      // Paginação
      totalPaginas > 1 && h('div', { className: 'flex items-center justify-center gap-2 mt-5' },
        h('button', {
          onClick: () => carregar(page - 1, filtros),
          disabled: page <= 1,
          className: 'px-3 py-2 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50',
        }, '← Anterior'),
        h('span', { className: 'text-sm text-gray-500' }, `${page} / ${totalPaginas}`),
        h('button', {
          onClick: () => carregar(page + 1, filtros),
          disabled: page >= totalPaginas,
          className: 'px-3 py-2 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50',
        }, 'Próxima →')
      )
    );
  }

  // ── Componente raiz do módulo ───────────────────────────────────────────────
  window.ModuloAgenteComponent = function ModuloAgente({
    usuario,
    API_URL,
    fetchAuth,
    HeaderCompacto,
    showToast,
    he,         // navegarSidebar
    Ee,         // moduloAtivo
    f, E, n, i, // padrão Tutts
  }) {
    const isAdmin = usuario && (usuario.role === 'admin' || usuario.role === 'admin_master');
    const [aba, setAba] = useState(isAdmin ? 'formulario' : 'formulario');

    const ABAS = [
      { id: 'formulario', label: '📍 Correção',  visible: true },
      { id: 'historico',  label: '📋 Histórico', visible: isAdmin },
    ].filter(a => a.visible);

    return h('div', { className: 'min-h-screen bg-gray-50 flex flex-col' },

      // Toast global
      i && h(window.__TuttsToastComponent || 'div', i),

      // Header padrão Tutts
      HeaderCompacto && h(HeaderCompacto, {
        usuario,
        moduloAtivo: 'agente',
        abaAtiva: aba,
        onGoHome: () => he && he('home'),
        onLogout: () => {},
        onChangeTab: (id) => setAba(id),
      }),

      // Sub-tabs (se admin)
      isAdmin && h('div', { className: 'bg-white border-b border-gray-200 shadow-sm' },
        h('div', { className: 'max-w-6xl mx-auto px-4 flex' },
          ABAS.map(a => h('button', {
            key: a.id,
            onClick: () => setAba(a.id),
            className: `py-3 px-5 text-sm font-semibold border-b-2 transition ${
              aba === a.id
                ? 'border-purple-700 text-purple-800'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`,
          }, a.label))
        )
      ),

      // Conteúdo
      h('div', { className: 'flex-1' },
        aba === 'formulario'
          ? h(TabFormulario, { API_URL, fetchAuth, showToast })
          : h(TabHistorico,  { API_URL, fetchAuth, showToast, usuario })
      )
    );
  };

  console.log('✅ Módulo Agente RPA carregado');
})();
