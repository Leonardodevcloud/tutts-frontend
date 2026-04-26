/**
 * modulo-liberacao.js
 * Componente React Vanilla — Liberar Ponto da OS via Agente RPA.
 *
 * Tela MUITO mais simples que a de Correção:
 *   - 1 input: número da OS
 *   - 1 botão: Liberar
 *   - Polling até finalizar
 *
 * Endpoints usados:
 *   POST /agent/liberar-ponto
 *   GET  /agent/liberar-ponto/status/:id  (polling 5s)
 *   GET  /agent/liberar-ponto/meu-historico
 *
 * Exporta como: window.ModuloLiberacaoComponent
 */

(function () {
  'use strict';

  const { useState, useEffect, useRef } = React;
  const h = React.createElement;

  function ModuloLiberacaoComponent({ usuario, API_URL, fetchAuth, showToast }) {
    const [aba, setAba] = useState('liberar'); // 'liberar' | 'historico'
    const [osNumero, setOsNumero] = useState('');
    const [fase, setFase] = useState('idle'); // idle | enviando | polling | sucesso | erro | os_duplicada
    const [solId, setSolId] = useState(null);
    const [statusAtual, setStatusAtual] = useState(null); // resposta do polling
    const [detalhe, setDetalhe] = useState('');
    const [loading, setLoading] = useState(false);

    const [historico, setHistorico] = useState([]);
    const [carregandoHist, setCarregandoHist] = useState(false);

    const pollingRef = useRef(null);
    const timeoutRef = useRef(null);

    const showToastFn = showToast || ((msg) => alert(msg));

    function pararPolling() {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    }

    useEffect(() => () => pararPolling(), []);

    // Carregar histórico ao abrir aba
    useEffect(() => {
      if (aba === 'historico') carregarHistorico();
    }, [aba]);

    async function carregarHistorico() {
      setCarregandoHist(true);
      try {
        const res = await fetchAuth(`${API_URL}/agent/liberar-ponto/meu-historico`);
        const data = await res.json();
        setHistorico(data.registros || []);
      } catch {
        showToastFn('Erro ao carregar histórico', 'error');
      } finally {
        setCarregandoHist(false);
      }
    }

    // ── Submit ────────────────────────────────────────────────────────────
    async function handleSubmit() {
      const limpo = osNumero.trim();
      if (!/^\d{7}$/.test(limpo)) {
        showToastFn('Informe um número de OS válido (7 dígitos).', 'error');
        return;
      }

      setLoading(true);
      setFase('enviando');
      setDetalhe('');
      setStatusAtual(null);

      try {
        const res = await fetchAuth(`${API_URL}/agent/liberar-ponto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ os_numero: limpo }),
        });
        const data = await res.json();

        if (!res.ok) {
          const msg = data.erros ? data.erros.join(' ') : (data.erro || 'Erro ao enviar.');
          if (res.status === 409) {
            setFase('os_duplicada');
            setDetalhe(msg);
            setLoading(false);
            return;
          }
          setFase('erro');
          setDetalhe(msg);
          setLoading(false);
          return;
        }

        setSolId(data.id);
        setFase('polling');
        iniciarPolling(data.id);

      } catch (err) {
        setFase('erro');
        setDetalhe('Falha de conexão. Tente novamente.');
        setLoading(false);
      }
    }

    function iniciarPolling(id) {
      // Timeout de 90s
      timeoutRef.current = setTimeout(() => {
        pararPolling();
        setFase('erro');
        setDetalhe('Tempo limite atingido. A liberação pode ainda estar processando — confira o histórico em alguns instantes.');
        setLoading(false);
      }, 90000);

      pollingRef.current = setInterval(async () => {
        try {
          const r = await fetchAuth(`${API_URL}/agent/liberar-ponto/status/${id}`);
          const d = await r.json();
          if (!r.ok) return;
          setStatusAtual(d);

          if (d.status === 'sucesso') {
            pararPolling();
            setFase('sucesso');
            setLoading(false);
          } else if (d.status === 'falhou') {
            pararPolling();
            setFase('erro');
            setDetalhe(d.erro || 'Erro durante a liberação.');
            setLoading(false);
          }
        } catch { /* ignora — próximo tick tenta de novo */ }
      }, 5000);
    }

    function resetar() {
      pararPolling();
      setOsNumero('');
      setSolId(null);
      setFase('idle');
      setDetalhe('');
      setStatusAtual(null);
      setLoading(false);
    }

    // ── Render: Header + Tabs ─────────────────────────────────────────────
    const tabs = h('div', { className: 'flex gap-1 p-1 bg-gray-100 rounded-xl mb-4' },
      h('button', {
        onClick: () => setAba('liberar'),
        className: 'flex-1 py-2 rounded-lg text-sm font-semibold transition ' +
          (aba === 'liberar' ? 'bg-purple-600 text-white shadow' : 'bg-transparent text-gray-600 hover:bg-white'),
      }, '🔓 Liberar OS'),
      h('button', {
        onClick: () => setAba('historico'),
        className: 'flex-1 py-2 rounded-lg text-sm font-semibold transition ' +
          (aba === 'historico' ? 'bg-purple-600 text-white shadow' : 'bg-transparent text-gray-600 hover:bg-white'),
      }, '📋 Minhas Liberações')
    );

    // ── Conteúdo: Liberar ─────────────────────────────────────────────────
    function renderLiberar() {
      const disabled = loading || fase === 'polling' || fase === 'enviando';

      // Sucesso
      if (fase === 'sucesso') {
        return h('div', { className: 'flex flex-col items-center justify-center py-10 px-6 text-center' },
          h('div', { className: 'w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-5xl mb-4' }, '✅'),
          h('h2', { className: 'text-2xl font-bold text-green-700 mb-2' }, 'OS liberada!'),
          h('p', { className: 'text-gray-600 mb-6' }, `OS ${osNumero} — Ponto 1 liberado com sucesso`),
          h('p', { className: 'text-sm text-gray-500 mb-8' }, statusAtual?.mensagem_retorno
            ? `Retorno do sistema: "${statusAtual.mensagem_retorno}"`
            : 'O sistema confirmou a liberação.'
          ),
          h('button', {
            onClick: resetar,
            className: 'px-8 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition',
          }, '+ Nova Liberação')
        );
      }

      // Erro
      if (fase === 'erro') {
        return h('div', { className: 'flex flex-col items-center justify-center py-10 px-6 text-center' },
          h('div', { className: 'w-24 h-24 bg-red-100 rounded-full flex items-center justify-center text-5xl mb-4' }, '❌'),
          h('h2', { className: 'text-xl font-bold text-red-700 mb-2' }, 'Não foi possível liberar'),
          h('p', { className: 'text-gray-600 mb-6 max-w-md' }, detalhe),
          h('div', { className: 'flex gap-2' },
            h('button', { onClick: resetar, className: 'px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300' }, 'Voltar'),
            h('button', { onClick: handleSubmit, className: 'px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700' }, 'Tentar novamente')
          )
        );
      }

      // OS duplicada
      if (fase === 'os_duplicada') {
        return h('div', { className: 'flex flex-col items-center justify-center py-10 px-6 text-center' },
          h('div', { className: 'w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center text-5xl mb-4' }, '⚠️'),
          h('h2', { className: 'text-xl font-bold text-yellow-700 mb-2' }, 'Atenção'),
          h('p', { className: 'text-gray-600 mb-6 max-w-md' }, detalhe),
          h('button', { onClick: resetar, className: 'px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700' }, 'Voltar')
        );
      }

      // Polling (processando)
      if (fase === 'polling' || fase === 'enviando') {
        const pct = statusAtual?.progresso ?? 5;
        const etapa = statusAtual?.etapa_atual || 'iniciando';
        const labelEtapa = {
          iniciando: 'Iniciando...',
          login: 'Fazendo login...',
          localizando: 'Localizando OS no sistema...',
          abrindo_modal: 'Abrindo opção "Liberar App"...',
          liberando: 'Marcando ponto e liberando...',
          concluido: 'Concluído!',
        }[etapa] || etapa;

        return h('div', { className: 'flex flex-col items-center justify-center py-10 px-6 text-center' },
          h('div', { className: 'w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center text-5xl mb-4 animate-pulse' }, '🤖'),
          h('h2', { className: 'text-xl font-bold text-purple-700 mb-2' }, 'Liberando...'),
          h('p', { className: 'text-gray-600 mb-6' }, `OS ${osNumero}`),
          h('div', { className: 'w-full max-w-sm h-2 bg-gray-200 rounded-full overflow-hidden mb-2' },
            h('div', {
              className: 'h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500',
              style: { width: `${pct}%` },
            })
          ),
          h('p', { className: 'text-xs text-gray-500 mb-1' }, `${pct}%`),
          h('p', { className: 'text-sm font-semibold text-purple-600' }, labelEtapa)
        );
      }

      // Idle (form)
      return h('div', { className: 'space-y-4' },
        h('div', { className: 'bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg' },
          h('p', { className: 'text-sm text-purple-900 font-semibold mb-1' }, '🔓 Liberar Ponto da OS'),
          h('p', { className: 'text-xs text-purple-700' },
            'Informe o número da OS pra liberar o Ponto 1 no aplicativo. ' +
            'Use quando o sistema está bloqueando você de bater chegada/finalizar fora do ponto cadastrado.'
          )
        ),

        h('div', null,
          h('label', { className: 'block text-sm font-semibold text-gray-700 mb-1.5' }, 'Número da OS *'),
          h('input', {
            type: 'tel',
            inputMode: 'numeric',
            value: osNumero,
            onChange: (e) => setOsNumero(e.target.value.replace(/\D/g, '').slice(0, 7)),
            placeholder: '1234567',
            disabled,
            maxLength: 7,
            className: 'w-full px-4 py-3 rounded-xl border-2 border-purple-200 text-base font-mono tracking-wider focus:outline-none focus:border-purple-500 transition ' +
              (disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'),
          }),
          h('p', { className: 'text-xs text-gray-500 mt-1.5' }, '7 dígitos — exatamente como aparece no app')
        ),

        h('button', {
          onClick: handleSubmit,
          disabled: disabled || osNumero.length !== 7,
          className: 'w-full py-4 rounded-xl font-bold text-white text-lg transition ' +
            (disabled || osNumero.length !== 7
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 to-pink-500 hover:opacity-90 active:scale-[0.98] shadow-lg'),
        }, '🚀 Liberar agora')
      );
    }

    // ── Conteúdo: Histórico ───────────────────────────────────────────────
    function renderHistorico() {
      if (carregandoHist) {
        return h('div', { className: 'text-center py-10 text-gray-500' }, 'Carregando...');
      }
      if (historico.length === 0) {
        return h('div', { className: 'text-center py-10 text-gray-500' },
          h('p', { className: 'text-4xl mb-2' }, '📭'),
          h('p', null, 'Nenhuma liberação ainda.')
        );
      }
      return h('div', { className: 'space-y-2' },
        h('div', { className: 'flex justify-between items-center mb-2' },
          h('p', { className: 'text-sm text-gray-600' }, `${historico.length} liberação(ões)`),
          h('button', {
            onClick: carregarHistorico,
            className: 'text-xs px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-semibold',
          }, '🔄 Atualizar')
        ),
        ...historico.map((r) => {
          const corStatus = {
            sucesso: 'bg-green-100 text-green-700 border-green-300',
            falhou: 'bg-red-100 text-red-700 border-red-300',
            processando: 'bg-blue-100 text-blue-700 border-blue-300',
            pendente: 'bg-yellow-100 text-yellow-700 border-yellow-300',
          }[r.status] || 'bg-gray-100 text-gray-700 border-gray-300';
          const labelStatus = {
            sucesso: '✅ Sucesso',
            falhou: '❌ Falhou',
            processando: '⏳ Processando',
            pendente: '⏸️ Pendente',
          }[r.status] || r.status;
          const data = new Date(r.criado_em).toLocaleString('pt-BR');

          return h('div', {
            key: r.id,
            className: 'p-3 bg-white rounded-xl border border-gray-200 shadow-sm',
          },
            h('div', { className: 'flex justify-between items-start' },
              h('div', null,
                h('p', { className: 'font-bold text-gray-800' }, `OS ${r.os_numero}`),
                h('p', { className: 'text-xs text-gray-500' }, data)
              ),
              h('span', {
                className: `text-xs font-semibold px-2 py-1 rounded-lg border ${corStatus}`,
              }, labelStatus)
            ),
            r.status === 'falhou' && r.erro && h('p', {
              className: 'text-xs text-red-600 mt-2 bg-red-50 p-2 rounded',
            }, '⚠️ ', r.erro),
            r.status === 'sucesso' && r.mensagem_retorno && h('p', {
              className: 'text-xs text-green-600 mt-2',
            }, '✓ ', r.mensagem_retorno)
          );
        })
      );
    }

    // ── Render principal ──────────────────────────────────────────────────
    return h('div', { className: 'min-h-screen bg-gray-50 pb-24' },
      h('div', { className: 'max-w-2xl mx-auto px-4 py-6' },
        h('div', { className: 'bg-white rounded-2xl shadow-lg p-4 sm:p-6' },
          tabs,
          aba === 'liberar' ? renderLiberar() : renderHistorico()
        )
      )
    );
  }

  // Expor globalmente (mesmo padrão do ModuloAgenteComponent)
  window.ModuloLiberacaoComponent = ModuloLiberacaoComponent;
})();
