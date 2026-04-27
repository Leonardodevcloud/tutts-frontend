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
          showToast && showToast('✅ Excluído!', 'success');
          handleAtualizar();
        } else {
          showToast && showToast('Erro ao excluir', 'error');
        }
      } catch (e) {
        showToast && showToast('Erro ao excluir', 'error');
      }
    }

    const btnFiltro = (id, label, count) =>
      h('button', {
        type: 'button',
        onClick: () => setFiltro(id),
        className: 'px-3 py-1.5 rounded-md text-xs font-semibold border transition ' + (
          filtro === id
            ? 'bg-purple-100 text-purple-800 border-purple-300'
            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
        )
      }, label + (count != null ? ' (' + count + ')' : ''));

    const totalManual = dados.filter(d => d.origem === 'manual').length;
    const totalAuto   = dados.filter(d => d.origem === 'auto').length;

    return h('div', { className: 'bg-white rounded-xl shadow p-5' },
      h('div', { className: 'flex items-center justify-between mb-3 flex-wrap gap-2' },
        h('h3', { className: 'text-base font-semibold text-purple-900' },
          '📋 Histórico de Uploads (' + dados.length + ')'
        ),
        h('div', { className: 'flex gap-1' },
          btnFiltro('todos', 'Todos', dados.length),
          btnFiltro('auto', '🤖 Auto', totalAuto),
          btnFiltro('manual', '📄 Manual', totalManual),
          h('button', {
            type: 'button',
            onClick: handleAtualizar,
            disabled: loading,
            className: 'px-3 py-1.5 rounded-md text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50'
          }, loading ? '⏳' : '🔄 Atualizar')
        )
      ),

      loading && dados.length === 0
        ? h('p', { className: 'text-center text-gray-400 py-4 text-sm' }, '⏳ Carregando...')
        : dados.length === 0
          ? h('p', { className: 'text-center text-gray-400 py-4 text-sm' }, 'Nenhum upload encontrado')
          : h('div', { className: 'overflow-x-auto' },
              h('table', { className: 'w-full text-sm' },
                h('thead', null,
                  h('tr', { className: 'border-b border-gray-200 text-xs text-gray-500 uppercase' },
                    h('th', { className: 'text-left py-2 px-2 font-medium' }, 'Origem'),
                    h('th', { className: 'text-left py-2 px-2 font-medium' }, 'Arquivo'),
                    h('th', { className: 'text-left py-2 px-2 font-medium' }, 'Por'),
                    h('th', { className: 'text-right py-2 px-2 font-medium' }, 'Linhas'),
                    h('th', { className: 'text-right py-2 px-2 font-medium' }, 'Quando'),
                    h('th', { className: 'py-2 px-2' })
                  )
                ),
                h('tbody', null,
                  dados.map(function(item) {
                    return h('tr', { key: item.origem + '-' + item.id, className: 'border-b border-gray-100 hover:bg-purple-50' },
                      h('td', { className: 'py-2 px-2' },
                        h('span', {
                          className: item.origem === 'auto'
                            ? 'inline-block px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold'
                            : 'inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold'
                        }, item.origem === 'auto' ? '🤖 Auto' : '📄 Manual')
                      ),
                      h('td', { className: 'py-2 px-2 text-gray-800' }, item.arquivo || '-'),
                      h('td', { className: 'py-2 px-2 text-gray-600' }, item.por || '-'),
                      h('td', { className: 'py-2 px-2 text-right font-semibold text-green-700' },
                        Number(item.linhas || 0).toLocaleString('pt-BR')
                      ),
                      h('td', { className: 'py-2 px-2 text-right text-gray-500 text-xs' },
                        fmtDataHora(item.quando)
                      ),
                      h('td', { className: 'py-2 px-2 text-right' },
                        h('button', {
                          type: 'button',
                          onClick: function() { handleExcluir(item); },
                          className: 'text-red-500 hover:text-red-700 text-base',
                          title: 'Excluir'
                        }, '🗑️')
                      )
                    );
                  })
                )
              )
            )
    );
  }

  window.BiHistoricoUnificado = BiHistoricoUnificado;
  console.log('✅ Módulo BI Histórico Unificado v2 carregado');
})();
