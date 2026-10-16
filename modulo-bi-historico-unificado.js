/* UI_UNIFICADO_V1: emojis -> sprite de icones; cores na paleta unica (CORES_TOKENS_V1). */
/* BI_ICONS_V1 */
/* BI_ABAS_V1 */
/**
 * modulo-bi-historico-unificado.js (v2 - sem loop)
 * Componente React Vanilla — Histórico unificado de uploads (manuais + RPA)
 * Exporta: window.BiHistoricoUnificado
 *
 * Endpoints usados:
 *  - GET    /bi/uploads/historico-unificado?origem=todos|manual|auto
 *  - DELETE /bi/uploads/historico-unificado/:origem/:id
 *
 * 2026-04 v2: corrige loop infinito de re-render.
 *   Causa: fetchAuth e showToast eram funções novas a cada render do pai,
 *   o que recriava o useCallback "carregar", o que disparava o useEffect.
 *   Solução: usar useRef pra props voláteis, depender APENAS de filtro no useEffect.
 */
(function () {
  'use strict';

  const { useState, useEffect, useRef } = React;
  const h = React.createElement;

  function fmtDataHora(d) {
    if (!d) return '-';
    try {
      const dt = new Date(d);
      const dd = String(dt.getDate()).padStart(2, '0');
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const hh = String(dt.getHours()).padStart(2, '0');
      const mi = String(dt.getMinutes()).padStart(2, '0');
      const diffMs = Date.now() - dt.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60)        return 'há ' + diffSec + 's';
      if (diffSec < 3600)      return 'há ' + Math.floor(diffSec / 60) + 'min';
      if (diffSec < 86400)     return 'há ' + Math.floor(diffSec / 3600) + 'h';
      return dd + '/' + mm + ' ' + hh + ':' + mi;
    } catch (e) { return String(d).slice(0, 16); }
  }

  function BiHistoricoUnificado(props) {
    const [dados, setDados]       = useState([]);
    const [loading, setLoading]   = useState(false);
    const [filtro, setFiltro]     = useState('todos');

    // Props voláteis em ref — evita recriar callbacks a cada render
    const propsRef = useRef(props);
    propsRef.current = props;

    // Carregar dados (depende SÓ de filtro)
    useEffect(() => {
      let cancelado = false;
      const { API_URL, fetchAuth, showToast } = propsRef.current;
      
      setLoading(true);
      const url = `${API_URL}/bi/uploads/historico-unificado?origem=${filtro}&limit=100`;
      
      fetchAuth(url)
        .then(r => r.json())
        .then(json => {
          if (cancelado) return;
          if (Array.isArray(json)) setDados(json);
          else setDados([]);
        })
        .catch(e => {
          if (cancelado) return;
          console.error('Erro histórico unificado:', e);
          showToast && showToast('Erro ao carregar histórico', 'error');
          setDados([]);
        })
        .finally(() => {
          if (!cancelado) setLoading(false);
        });

      return () => { cancelado = true; };
    }, [filtro]);  // ← APENAS filtro como dependência

    function handleAtualizar() {
      // Força reload mudando filtro pra ele mesmo (cria nova ref de useEffect dep array)
      // Como filtro não muda, vou usar incremento de chave
      setFiltro(f => f); // não dispara
      // Solução real: chamar diretamente
      const { API_URL, fetchAuth, showToast } = propsRef.current;
      setLoading(true);
      fetchAuth(`${API_URL}/bi/uploads/historico-unificado?origem=${filtro}&limit=100`)
        .then(r => r.json())
        .then(json => Array.isArray(json) ? setDados(json) : setDados([]))
        .catch(() => showToast && showToast('Erro ao carregar', 'error'))
        .finally(() => setLoading(false));
    }

    async function handleExcluir(item) {
      const { API_URL, fetchAuth, showToast } = propsRef.current;
      const tipo = item.origem === 'auto' ? 'job RPA' : 'upload manual';
      const desc = item.arquivo + ' (' + (item.por || '?') + ')';
      if (!confirm('Excluir ' + tipo + ': ' + desc + ' ?')) return;
      try {
        const r = await fetchAuth(`${API_URL}/bi/uploads/historico-unificado/${item.origem}/${item.id}`, {
          method: 'DELETE'
        });
        const j = await r.json();
        if (j.success) {
          showToast && showToast('Excluído!', 'success');
          handleAtualizar();
        } else {
          showToast && showToast('Erro ao excluir', 'error');
        }
      } catch (e) {
        showToast && showToast('Erro ao excluir', 'error');
      }
    }

    // BI_ABAS_V1: card no padrão clean — título 15px, segmentado de origem, tabela padrão,
    // origem em pílula suave com ponto, excluir como botão de ícone com rótulo acessível.
    const ico = (nome, sz, extra) => h('svg', { className: 'ico', style: Object.assign({ width: sz || 15, height: sz || 15, flexShrink: 0 }, extra || {}), 'aria-hidden': 'true' }, h('use', { href: '#i-' + nome }));
    const pill = (tom, txt, title) => {
      const t = { roxo: ['#faf7fd', '#5d0b85', '#770fa8'], azul: ['#eff6ff', '#1e40af', '#2563eb'], cinza: ['#f3f4f6', '#374151', '#9ca3af'] }[tom];
      return h('span', { title, className: 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap', style: { background: t[0], color: t[1] } },
        h('span', { style: { width: 6, height: 6, borderRadius: 999, background: t[2] } }), txt);
    };

    const btnFiltro = (id, label, count) =>
      h('button', {
        type: 'button',
        onClick: () => setFiltro(id),
        'aria-pressed': filtro === id,
        className: 'px-3 h-[30px] rounded-lg text-[13px] transition border ' + (
          filtro === id
            ? 'bg-white border-gray-200 font-semibold text-purple-800'
            : 'border-transparent font-medium text-gray-600 hover:text-gray-900'
        )
      }, label, (count != null ? ' (' + count + ')' : ''));

    const totalManual = dados.filter(d => d.origem === 'manual').length;
    const totalAuto   = dados.filter(d => d.origem === 'auto').length;

    return h('section', { 'aria-labelledby': 'bihu-titulo', className: 'bg-white border border-gray-200 rounded-[14px] overflow-hidden', style: { fontVariantNumeric: 'tabular-nums' } },
      h('div', { className: 'flex items-center justify-between gap-3 flex-wrap px-5 py-4 border-b border-gray-100' },
        h('div', null,
          h('h3', { id: 'bihu-titulo', className: 'text-[15px] font-semibold text-gray-900' }, 'Histórico de uploads'),
          h('p', { className: 'text-[13px] text-gray-500 mt-0.5' }, dados.length + ' registro(s) · manuais e automáticos')
        ),
        h('div', { className: 'flex gap-2 items-center flex-wrap' },
          h('div', { role: 'group', 'aria-label': 'Filtrar por origem', className: 'inline-flex bg-gray-100 rounded-[10px] p-1 gap-0.5' },
            btnFiltro('todos', 'Todos', dados.length),
            btnFiltro('auto', 'Automáticos', totalAuto),
            btnFiltro('manual', 'Manuais', totalManual)
          ),
          h('button', {
            type: 'button',
            onClick: handleAtualizar,
            disabled: loading,
            className: 'inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] text-[13px] font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50'
          }, ico(loading ? 'clock' : 'refresh'), loading ? 'Atualizando...' : 'Atualizar')
        )
      ),

      loading && dados.length === 0
        ? h('p', { className: 'text-center text-gray-500 py-10 text-[13px]' }, 'Carregando...')
        : dados.length === 0
          ? h('p', { className: 'text-center text-gray-500 py-10 text-[13px]' }, filtro === 'todos' ? 'Nenhum upload encontrado.' : 'Nenhum upload com essa origem.')
          : h('div', { className: 'overflow-x-auto relative' },
              h('table', { className: 'w-full text-[13px]', style: { minWidth: 720, borderCollapse: 'collapse' } },
                h('thead', null,
                  h('tr', { className: 'bg-gray-50 text-xs text-gray-500' },
                    h('th', { className: 'text-left py-2.5 px-5 font-semibold' }, 'Origem'),
                    h('th', { className: 'text-left py-2.5 px-3 font-semibold' }, 'Arquivo'),
                    h('th', { className: 'text-left py-2.5 px-3 font-semibold' }, 'Por'),
                    h('th', { className: 'text-right py-2.5 px-3 font-semibold' }, 'Linhas'),
                    h('th', { className: 'text-right py-2.5 px-3 font-semibold' }, 'Quando'),
                    h('th', { className: 'py-2.5 px-5' }, h('span', { className: 'sr-only' }, 'Ações'))
                  )
                ),
                h('tbody', null,
                  dados.map(function(item) {
                    return h('tr', { key: item.origem + '-' + item.id, className: 'border-t border-gray-100 hover:bg-gray-50' },
                      h('td', { className: 'py-3 px-5' },
                        // REPROCESSO_PENDENTES_V1: reimportação automática de OS que ficaram em aberto
                        item.origem_job === 'reprocesso'
                          ? pill('azul', 'Reprocesso', 'Reimportação automática de uma data que tinha OS em aberto (em execução, sem finalização) no BI')
                          : item.origem === 'auto' ? pill('roxo', 'Automático') : pill('cinza', 'Manual')
                      ),
                      h('td', { className: 'py-3 px-3 text-gray-900' },
                        h('div', { className: 'font-medium' }, item.arquivo || '-'),
                        item.detalhe && h('div', { className: 'text-xs text-gray-500 mt-0.5' }, item.detalhe)
                      ),
                      h('td', { className: 'py-3 px-3 text-gray-700' }, item.por || '-'),
                      h('td', { className: 'py-3 px-3 text-right font-semibold text-gray-900' },
                        Number(item.linhas || 0).toLocaleString('pt-BR')
                      ),
                      h('td', { className: 'py-3 px-3 text-right text-gray-500 whitespace-nowrap' },
                        fmtDataHora(item.quando)
                      ),
                      h('td', { className: 'py-3 px-5 text-right' },
                        h('button', {
                          type: 'button',
                          onClick: function() { handleExcluir(item); },
                          className: 'inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-red-50',
                          style: { color: '#dc2626' },
                          title: 'Excluir',
                          'aria-label': 'Excluir ' + (item.arquivo || 'upload')
                        }, ico('trash'))
                      )
                    );
                  })
                )
              )
            )
    );
  }

  window.BiHistoricoUnificado = BiHistoricoUnificado;
  console.log('Módulo BI Histórico Unificado v2 carregado');
})();
