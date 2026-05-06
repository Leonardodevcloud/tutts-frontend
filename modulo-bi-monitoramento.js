/* ============================================================================
 * modulo-bi-monitoramento.js
 *
 * BI Monitoramento — versão operacional do BI principal SEM dados financeiros.
 * Acesso restrito a admin e admin_master (validação adicional no backend).
 *
 * 4 abas:
 *   - Dashboard        (KPIs + donut prazo + tabela por cliente)
 *   - Por Profissional (ranking de motoboys)
 *   - Por Região       (agregação via bi_regioes)
 *   - Hora a Hora      (distribuição por hora do dia)
 *
 * Reaproveita 100% as regras de cálculo do BI principal (campo
 * dentro_prazo já vem pré-calculado no upload, com regras especiais
 * por cliente/centro de custo aplicadas pelo módulo bi-import).
 *
 * Registra-se em window.ModuloBiMonitoramento e é montado pelo app.js
 * quando moduloAtivo === "bi-monitoramento".
 *
 * Props:
 *   - apiUrl: string (prefixo da API)
 *   - fetchAuth: função autenticada (mesma usada em app.js)
 * ============================================================================ */

(function () {
  'use strict';

  if (!window.React) {
    console.warn('[bi-monitoramento] React não disponível');
    return;
  }

  const h = React.createElement;
  const { useState, useEffect, useRef, useMemo, useCallback } = React;

  /* ───────── HELPERS ───────── */
  function fmtNum(v) {
    if (v === null || v === undefined || v === '') return '—';
    return Number(v).toLocaleString('pt-BR');
  }
  function fmtPct(v, casas) {
    if (v === null || v === undefined || v === '') return '—';
    const c = casas == null ? 1 : casas;
    return Number(v).toFixed(c) + '%';
  }
  function fmtMin(min) {
    if (min === null || min === undefined || min === '' || isNaN(min) || min < 0) return '—';
    const total = Number(min);
    const hh = Math.floor(total / 60);
    const mm = Math.floor(total % 60);
    const ss = Math.floor((total - Math.floor(total)) * 60);
    return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
  }
  function fmtDataBr(iso) {
    if (!iso) return '—';
    const s = String(iso);
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return s;
    return `${m[3]}/${m[2]}/${m[1]}`;
  }
  function corPct(taxa) {
    if (taxa === null || taxa === undefined) return 'text-gray-500';
    if (taxa >= 90) return 'text-green-700';
    if (taxa >= 75) return 'text-emerald-700';
    if (taxa >= 60) return 'text-yellow-700';
    return 'text-red-700';
  }
  function corPctBg(taxa) {
    if (taxa === null || taxa === undefined) return 'bg-gray-100 text-gray-700';
    if (taxa >= 90) return 'bg-green-50 text-green-700';
    if (taxa >= 75) return 'bg-emerald-50 text-emerald-700';
    if (taxa >= 60) return 'bg-yellow-50 text-yellow-700';
    return 'bg-red-50 text-red-700';
  }
  function iniciaisDe(nome) {
    if (!nome) return '??';
    const partes = String(nome).trim().split(/\s+/).filter(p => p.length >= 2);
    if (partes.length === 0) return '??';
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }
  function dataHojeISO() {
    const d = new Date();
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
  }
  function dataNDiasAtrasISO(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
  }

  /* ───────── DONUT SVG ───────── */
  function DonutPrazo({ taxa, dentro, fora }) {
    const t = Number(taxa) || 0;
    const r = 78, c = 2 * Math.PI * r;
    const offset = c * (1 - t / 100);
    return h('div', { className: 'flex flex-col items-center justify-center' },
      h('svg', { viewBox: '0 0 200 200', width: 180, height: 180 },
        h('circle', { cx: 100, cy: 100, r, fill: 'none', stroke: '#fee2e2', strokeWidth: 22 }),
        h('circle', {
          cx: 100, cy: 100, r, fill: 'none', stroke: '#10b981', strokeWidth: 22,
          strokeDasharray: c, strokeDashoffset: offset,
          transform: 'rotate(-90 100 100)', strokeLinecap: 'butt'
        }),
        h('text', { x: 100, y: 98, textAnchor: 'middle', fontSize: 32, fontWeight: 500, fill: '#10b981' },
          t.toFixed(1) + '%'),
        h('text', { x: 100, y: 118, textAnchor: 'middle', fontSize: 10, letterSpacing: 2, fill: '#6b7280' },
          'NO PRAZO')
      ),
      h('div', { className: 'flex justify-between w-full px-2 pt-2 mt-2 border-t border-gray-100 text-xs' },
        h('div', null,
          h('span', { className: 'text-emerald-500' }, '● '),
          h('span', { className: 'text-gray-600' }, 'No Prazo'),
          h('br'),
          h('span', { className: 'font-semibold text-gray-900' }, fmtNum(dentro)),
          ' ',
          h('span', { className: 'text-emerald-600' }, '(' + t.toFixed(1) + '%)')
        ),
        h('div', { className: 'text-right' },
          h('span', { className: 'text-gray-600' }, 'Fora Prazo '),
          h('span', { className: 'text-red-500' }, '●'),
          h('br'),
          h('span', { className: 'font-semibold text-gray-900' }, fmtNum(fora)),
          ' ',
          h('span', { className: 'text-red-600' }, '(' + (100 - t).toFixed(1) + '%)')
        )
      )
    );
  }

  /* ───────── KPI CARD ───────── */
  function KpiCard({ icone, iconeBg, label, labelCor, labelBg, valor, sub, accent }) {
    return h('div', {
      className: 'bg-white border border-gray-200 rounded-xl p-4 relative'
    },
      accent ? h('div', {
        className: 'absolute left-0 top-3 bottom-3 w-1 rounded-r',
        style: { background: accent }
      }) : null,
      h('div', { className: 'flex justify-between items-start' },
        h('div', {
          className: 'w-9 h-9 rounded-lg flex items-center justify-center',
          style: { background: iconeBg || '#f5f3ff' }
        }, h('span', { style: { fontSize: '18px' } }, icone)),
        h('span', {
          className: 'text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full',
          style: { color: labelCor || '#7c3aed', background: labelBg || '#f5f3ff' }
        }, label)
      ),
      h('div', { className: 'text-[28px] font-medium text-gray-900 leading-none mt-3 tabular-nums' },
        valor),
      sub ? h('div', { className: 'text-[11px] text-gray-500 mt-1.5' }, sub) : null
    );
  }

  /* ───────── MODAL DE FILTROS ───────── */
  function ModalFiltros({ aberto, onFechar, filtros, setFiltros, apiUrl, fetchAuth }) {
    const [categorias, setCategorias] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [centros, setCentros] = useState([]);
    const [regioes, setRegioes] = useState([]);
    const [buscaCliente, setBuscaCliente] = useState('');
    const [local, setLocal] = useState(filtros);

    useEffect(() => { if (aberto) setLocal(filtros); }, [aberto, filtros]);

    useEffect(() => {
      if (!aberto) return;
      let cancel = false;
      (async () => {
        try {
          const [rCat, rCli, rCC, rReg] = await Promise.all([
            fetchAuth(apiUrl + '/bi-monitoramento/categorias'),
            fetchAuth(apiUrl + '/bi-monitoramento/clientes'),
            fetchAuth(apiUrl + '/bi-monitoramento/centros-custo'),
            fetchAuth(apiUrl + '/bi-monitoramento/regioes-cadastradas')
          ]);
          if (cancel) return;
          if (rCat.ok) setCategorias(await rCat.json());
          if (rCli.ok) setClientes(await rCli.json());
          if (rCC.ok)  setCentros(await rCC.json());
          if (rReg.ok) setRegioes(await rReg.json());
        } catch (e) {
          console.warn('[bi-monitoramento] erro carregar filtros:', e);
        }
      })();
      return () => { cancel = true; };
    }, [aberto, apiUrl, fetchAuth]);

    const clientesFiltrados = useMemo(() => {
      const q = (buscaCliente || '').toLowerCase().trim();
      if (!q) return clientes;
      return clientes.filter(c =>
        String(c.nome_fantasia || '').toLowerCase().includes(q) ||
        String(c.cod_cliente || '').includes(q)
      );
    }, [clientes, buscaCliente]);

    if (!aberto) return null;

    // Helpers de multi-seleção (arrays)
    function toggleArr(arr, val) {
      const a = Array.isArray(arr) ? [...arr] : [];
      const idx = a.indexOf(val);
      if (idx >= 0) a.splice(idx, 1); else a.push(val);
      return a;
    }
    const arrCli = Array.isArray(local.cod_cliente) ? local.cod_cliente
      : (local.cod_cliente ? [local.cod_cliente] : []);
    const arrCC  = Array.isArray(local.centro_custo) ? local.centro_custo
      : (local.centro_custo ? [local.centro_custo] : []);
    const arrCat = Array.isArray(local.categoria) ? local.categoria
      : (local.categoria ? [local.categoria] : []);

    function aplicar() { setFiltros(local); onFechar(); }
    function limpar() {
      setLocal({
        data_inicio: dataNDiasAtrasISO(5),
        data_fim: dataHojeISO(),
        status_prazo: '', status_retorno: '', regiao: '',
        categoria: [], cod_cliente: [], centro_custo: []
      });
    }

    return h('div', {
      className: 'fixed inset-0 z-50 flex items-center justify-center p-4',
      style: { background: 'rgba(0,0,0,0.5)' }, onClick: onFechar
    },
      h('div', {
        className: 'bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl',
        onClick: (e) => e.stopPropagation()
      },
        h('div', {
          className: 'flex items-center justify-between px-5 py-3',
          style: { background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }
        },
          h('div', { className: 'flex items-center gap-2 text-white font-medium' },
            h('span', null, '🔎'), 'Filtros Inteligentes'),
          h('button', { className: 'text-white text-2xl leading-none px-2', onClick: onFechar }, '×')
        ),
        h('div', { className: 'p-4 overflow-y-auto flex-1' },
          h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3 mb-3' },
            h('div', null,
              h('label', { className: 'text-xs text-gray-600 font-medium block mb-1' }, '📅 Data Início'),
              h('input', {
                type: 'date', value: local.data_inicio || '',
                onChange: (e) => setLocal({ ...local, data_inicio: e.target.value }),
                className: 'w-full text-sm border border-gray-300 rounded-md px-2 py-1.5'
              })
            ),
            h('div', null,
              h('label', { className: 'text-xs text-gray-600 font-medium block mb-1' }, '📅 Data Fim'),
              h('input', {
                type: 'date', value: local.data_fim || '',
                onChange: (e) => setLocal({ ...local, data_fim: e.target.value }),
                className: 'w-full text-sm border border-gray-300 rounded-md px-2 py-1.5'
              })
            ),
            h('div', null,
              h('label', { className: 'text-xs text-gray-600 font-medium block mb-1' }, '⏱ Status Prazo'),
              h('select', {
                value: local.status_prazo || '',
                onChange: (e) => setLocal({ ...local, status_prazo: e.target.value }),
                className: 'w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white'
              },
                h('option', { value: '' }, 'Todos'),
                h('option', { value: 'dentro' }, 'No Prazo'),
                h('option', { value: 'fora' }, 'Fora do Prazo')
              )
            ),
            h('div', null,
              h('label', { className: 'text-xs text-gray-600 font-medium block mb-1' }, '↩️ Retorno'),
              h('select', {
                value: local.status_retorno || '',
                onChange: (e) => setLocal({ ...local, status_retorno: e.target.value }),
                className: 'w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white'
              },
                h('option', { value: '' }, 'Todos'),
                h('option', { value: 'com_retorno' }, 'Com Retorno'),
                h('option', { value: 'sem_retorno' }, 'Sem Retorno')
              )
            )
          ),
          h('div', { className: 'mb-3' },
            h('label', { className: 'text-xs text-gray-600 font-medium block mb-1' }, '🗺 Região'),
            h('select', {
              value: local.regiao || '',
              onChange: (e) => setLocal({ ...local, regiao: e.target.value }),
              className: 'text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white w-full md:w-1/3'
            },
              h('option', { value: '' }, 'Todas as Regiões'),
              regioes.map(r => h('option', { key: r.id, value: r.nome }, r.nome))
            )
          ),
          h('div', { className: 'border border-gray-200 rounded-lg p-3 mb-3 bg-blue-50/30' },
            h('div', { className: 'flex justify-between items-center mb-2' },
              h('div', { className: 'text-xs font-semibold text-gray-700' }, '🏷 Categoria'),
              h('button', {
                className: 'text-[10px] text-blue-600 hover:underline',
                onClick: () => setLocal({ ...local, categoria: [] })
              }, 'Limpar')
            ),
            h('div', { className: 'max-h-32 overflow-y-auto' },
              categorias.map(cat =>
                h('label', { key: cat, className: 'flex items-center gap-2 text-xs text-gray-700 py-1 cursor-pointer hover:bg-white rounded px-1' },
                  h('input', {
                    type: 'checkbox',
                    checked: arrCat.includes(cat),
                    onChange: () => setLocal({ ...local, categoria: toggleArr(arrCat, cat) })
                  }), cat)
              )
            ),
            h('div', { className: 'text-[10px] text-amber-600 mt-1' },
              `${categorias.length} disponíveis · ${arrCat.length === 0 ? 'Sem seleção = Todas' : arrCat.length + ' selecionada(s)'}`)
          ),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
            h('div', { className: 'border border-gray-200 rounded-lg p-3 bg-purple-50/30' },
              h('div', { className: 'flex justify-between items-center mb-2' },
                h('div', { className: 'text-xs font-semibold text-gray-700' },
                  '📚 Cliente (Loja) ',
                  arrCli.length > 0 ? h('span', { className: 'text-purple-700' }, `· ${arrCli.length} selec.`) : null
                ),
                h('button', {
                  className: 'text-[10px] text-purple-600 hover:underline',
                  onClick: () => setLocal({ ...local, cod_cliente: [] })
                }, 'Limpar')
              ),
              h('input', {
                type: 'text', placeholder: 'Buscar por código ou nome...',
                value: buscaCliente, onChange: (e) => setBuscaCliente(e.target.value),
                className: 'w-full text-xs border border-gray-300 rounded-md px-2 py-1.5 mb-2'
              }),
              h('div', { className: 'max-h-32 overflow-y-auto' },
                clientesFiltrados.slice(0, 200).map(c =>
                  h('label', {
                    key: c.cod_cliente,
                    className: 'flex items-center gap-2 text-xs text-gray-700 py-0.5 cursor-pointer hover:bg-white rounded px-1'
                  },
                    h('input', {
                      type: 'checkbox',
                      checked: arrCli.some(v => String(v) === String(c.cod_cliente)),
                      onChange: () => setLocal({ ...local, cod_cliente: toggleArr(arrCli, c.cod_cliente) })
                    }),
                    `${c.cod_cliente} - ${c.nome_fantasia || ''}`)
                )
              )
            ),
            h('div', { className: 'border border-gray-200 rounded-lg p-3 bg-emerald-50/30' },
              h('div', { className: 'flex justify-between items-center mb-2' },
                h('div', { className: 'text-xs font-semibold text-gray-700' },
                  '📁 Centro de Custo ',
                  arrCC.length > 0 ? h('span', { className: 'text-emerald-700' }, `· ${arrCC.length} selec.`) : null
                ),
                h('button', {
                  className: 'text-[10px] text-emerald-600 hover:underline',
                  onClick: () => setLocal({ ...local, centro_custo: [] })
                }, 'Limpar')
              ),
              h('div', { className: 'max-h-40 overflow-y-auto' },
                centros.slice(0, 500).map(cc =>
                  h('label', {
                    key: cc,
                    className: 'flex items-center gap-2 text-xs text-gray-700 py-0.5 cursor-pointer hover:bg-white rounded px-1'
                  },
                    h('input', {
                      type: 'checkbox',
                      checked: arrCC.includes(cc),
                      onChange: () => setLocal({ ...local, centro_custo: toggleArr(arrCC, cc) })
                    }), cc)
                )
              ),
              h('div', { className: 'text-[10px] text-emerald-700 mt-1' },
                `${centros.length} disponíveis · ${arrCC.length === 0 ? 'Sem seleção = Todos' : arrCC.length + ' selecionado(s)'}`)
            )
          )
        ),
        h('div', { className: 'border-t border-gray-200 p-3 flex justify-between bg-gray-50' },
          h('button', {
            className: 'text-xs text-gray-700 px-4 py-2 rounded-md border border-gray-300 hover:bg-white',
            onClick: limpar
          }, '🧹 Limpar Filtros'),
          h('button', {
            className: 'text-xs text-white px-5 py-2 rounded-md font-medium',
            style: { background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' },
            onClick: aplicar
          }, '● Aplicar Filtros')
        )
      )
    );
  }

  /* ───────── ABA DASHBOARD ───────── */
  function AbaDashboard({ apiUrl, fetchAuth, filtros }) {
    const [dados, setDados] = useState(null);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState(null);
    const [busca, setBusca] = useState('');
    const [expandidos, setExpandidos] = useState(() => new Set());

    function toggleExpand(codCliente) {
      const novo = new Set(expandidos);
      if (novo.has(codCliente)) novo.delete(codCliente);
      else novo.add(codCliente);
      setExpandidos(novo);
    }

    useEffect(() => {
      let cancel = false;
      (async () => {
        setLoading(true); setErro(null);
        try {
          const params = new URLSearchParams();
          Object.entries(filtros || {}).forEach(([k, v]) => {
            if (v === '' || v === null || v === undefined) return;
            if (Array.isArray(v)) {
              if (v.length === 0) return;
              params.set(k, v.join(','));
            } else {
              params.set(k, v);
            }
          });
          const r = await fetchAuth(apiUrl + '/bi-monitoramento/dashboard?' + params.toString());
          if (!r.ok) throw new Error('HTTP ' + r.status);
          const j = await r.json();
          if (!cancel) setDados(j);
        } catch (e) {
          if (!cancel) setErro(e.message || 'erro');
        } finally {
          if (!cancel) setLoading(false);
        }
      })();
      return () => { cancel = true; };
    }, [apiUrl, fetchAuth, JSON.stringify(filtros)]);

    const m = dados?.metricas || {};
    const linhas = useMemo(() => {
      const fonte = dados?.porCliente || [];
      const q = (busca || '').toLowerCase().trim();
      if (!q) return fonte;
      return fonte.filter(l =>
        String(l.nome_display || '').toLowerCase().includes(q) ||
        String(l.nome_fantasia || '').toLowerCase().includes(q) ||
        String(l.nome_cliente || '').toLowerCase().includes(q) ||
        String(l.cod_cliente || '').includes(q)
      );
    }, [dados, busca]);

    if (erro) {
      return h('div', { className: 'bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm' },
        '❌ Erro ao carregar dados: ' + erro);
    }

    return h('div', null,
      // Linha 1: KPIs operacionais
      h('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4' },
        h(KpiCard, {
          icone: '📋', iconeBg: '#f5f3ff', accent: '#7c3aed',
          label: 'Ordens de Serviço', labelCor: '#7c3aed', labelBg: '#f5f3ff',
          valor: loading ? '—' : fmtNum(m.total_os),
          sub: 'Total de OS no período'
        }),
        h(KpiCard, {
          icone: '📦', iconeBg: '#eff6ff', accent: '#3b82f6',
          label: 'Entregas', labelCor: '#3b82f6', labelBg: '#eff6ff',
          valor: loading ? '—' : fmtNum(m.total_entregas),
          sub: loading ? '' : `Realizadas — ${fmtNum(m.retornos)} retornos`
        }),
        h(KpiCard, {
          icone: '⏱', iconeBg: '#f0f9ff', accent: '#0ea5e9',
          label: 'Tempo Médio', labelCor: '#0ea5e9', labelBg: '#f0f9ff',
          valor: loading ? '—' : fmtMin(m.tempo_medio),
          sub: 'Da coleta até a entrega'
        }),
        h(KpiCard, {
          icone: '🛵', iconeBg: '#fffbeb', accent: '#f59e0b',
          label: 'Média Ent./Prof.', labelCor: '#f59e0b', labelBg: '#fffbeb',
          valor: loading ? '—' : (m.media_entregas_entregador != null ? Number(m.media_entregas_entregador).toFixed(1) : '—'),
          sub: loading ? '' : `${fmtNum(m.total_entregadores)} profissionais ativos`
        })
      ),

      // Linha 2: Donut grande
      h('div', { className: 'bg-white border border-gray-200 rounded-xl p-4 mb-4' },
        h('div', { className: 'flex justify-between items-center mb-3' },
          h('div', { className: 'text-sm font-medium text-gray-900' }, 'Prazo de Entrega'),
          h('span', {
            className: 'text-[10px] font-semibold px-2.5 py-1 rounded-full',
            style: { color: '#15803d', background: '#f0fdf4' }
          }, '🏆 Performance')
        ),
        loading ? h('div', { className: 'h-44 flex items-center justify-center text-gray-400' }, 'Carregando...')
        : h(DonutPrazo, {
            taxa: m.taxa_dentro,
            dentro: m.dentro_prazo,
            fora: m.fora_prazo
          })
      ),

      // Linha 3: tabela por cliente
      h('div', { className: 'bg-purple-50/40 border border-purple-200 rounded-xl p-4' },
        h('div', { className: 'flex justify-between items-center mb-3' },
          h('div', { className: 'text-sm font-medium text-purple-900' },
            '📊 Resumo Operacional por Cliente'),
          h('div', { className: 'flex items-center gap-2' },
            h('input', {
              type: 'text', placeholder: 'Buscar cliente...',
              value: busca, onChange: (e) => setBusca(e.target.value),
              className: 'text-xs px-2 py-1 border border-purple-200 rounded-md w-44 bg-white'
            }),
            h('span', { className: 'text-[11px] text-purple-700' },
              `${linhas.length} clientes`)
          )
        ),
        h('div', { className: 'bg-white rounded-lg overflow-hidden border border-purple-100' },
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'w-full text-xs' },
              h('thead', null,
                h('tr', { className: 'bg-gray-50 text-gray-600 font-semibold' },
                  h('th', { className: 'px-3 py-2 text-left' }, 'Cliente'),
                  h('th', { className: 'px-3 py-2 text-right' }, 'OS'),
                  h('th', { className: 'px-3 py-2 text-right' }, 'Entregas'),
                  h('th', { className: 'px-3 py-2 text-right' }, 'Retornos'),
                  h('th', { className: 'px-3 py-2 text-right bg-green-50 text-green-700' }, 'No Prazo'),
                  h('th', { className: 'px-3 py-2 text-right bg-amber-50 text-amber-700' }, 'Fora Prazo'),
                  h('th', { className: 'px-3 py-2 text-right' }, 'Tempo Médio'),
                  h('th', { className: 'px-3 py-2 text-right' }, 'Profissionais'),
                  h('th', { className: 'px-3 py-2 text-right' }, 'Ent/Prof'),
                  h('th', { className: 'px-3 py-2 text-right' }, 'Últ. Entrega')
                )
              ),
              h('tbody', null,
                loading ?
                  h('tr', null, h('td', { colSpan: 10, className: 'p-4 text-center text-gray-400' }, 'Carregando...'))
                : linhas.length === 0 ?
                  h('tr', null, h('td', { colSpan: 10, className: 'p-4 text-center text-gray-400' }, 'Nenhum dado encontrado'))
                : linhas.flatMap(l => {
                    const aberto = expandidos.has(l.cod_cliente);
                    const temCcs = (l.centros_custo || []).length > 0;
                    const linhaCli = h('tr', { key: 'cli-' + l.cod_cliente, className: 'border-t border-gray-100 hover:bg-purple-50/30' },
                      h('td', { className: 'px-3 py-2 text-gray-900' },
                        h('button', {
                          className: 'inline-flex items-center justify-center w-5 h-5 mr-2 rounded text-purple-600 hover:bg-purple-100 ' + (temCcs ? '' : 'opacity-30 cursor-not-allowed'),
                          onClick: () => temCcs && toggleExpand(l.cod_cliente),
                          disabled: !temCcs,
                          title: temCcs ? (aberto ? 'Recolher centros de custo' : 'Expandir centros de custo') : 'Sem centros de custo'
                        }, aberto ? '−' : '+'),
                        h('span', { className: 'font-medium' }, l.cod_cliente),
                        h('span', { className: 'text-gray-400' }, ' · '),
                        h('span', null, l.nome_display || l.nome_fantasia || l.nome_cliente || '—')
                      ),
                      h('td', { className: 'px-3 py-2 text-right tabular-nums' }, fmtNum(l.total_os)),
                      h('td', { className: 'px-3 py-2 text-right tabular-nums' }, fmtNum(l.total_entregas)),
                      h('td', { className: 'px-3 py-2 text-right text-purple-700 font-medium' }, fmtNum(l.retornos)),
                      h('td', { className: 'px-3 py-2 text-right bg-green-50/50' },
                        h('span', { className: 'font-medium text-green-700' }, fmtNum(l.dentro_prazo)),
                        ' ',
                        h('span', { className: 'text-[10px] text-green-600 opacity-80' },
                          l.taxa_prazo != null ? Number(l.taxa_prazo).toFixed(1) + '%' : '')
                      ),
                      h('td', { className: 'px-3 py-2 text-right bg-amber-50/50' },
                        h('span', { className: 'font-medium text-amber-700' }, fmtNum(l.fora_prazo)),
                        ' ',
                        h('span', { className: 'text-[10px] text-amber-600 opacity-80' },
                          l.taxa_prazo != null ? (100 - Number(l.taxa_prazo)).toFixed(1) + '%' : '')
                      ),
                      h('td', { className: 'px-3 py-2 text-right tabular-nums' }, fmtMin(l.tempo_medio)),
                      h('td', { className: 'px-3 py-2 text-right tabular-nums' }, fmtNum(l.total_profissionais)),
                      h('td', { className: 'px-3 py-2 text-right tabular-nums' },
                        l.media_ent_prof != null ? Number(l.media_ent_prof).toFixed(2) : '—'),
                      h('td', { className: 'px-3 py-2 text-right text-emerald-700 text-[11px]' },
                        h('span', null, '● ' + fmtDataBr(l.ultima_entrega)))
                    );

                    if (!aberto || !temCcs) return [linhaCli];

                    // Linhas-filhas (centros de custo)
                    const filhas = l.centros_custo.map(cc =>
                      h('tr', { key: `cc-${l.cod_cliente}-${cc.centro_custo}`, className: 'border-t border-purple-100 bg-purple-50/30' },
                        h('td', { className: 'px-3 py-1.5 text-gray-700 text-[11px]' },
                          h('span', { style: { paddingLeft: '32px' } },
                            h('span', { className: 'text-gray-400 mr-2' }, '└'),
                            h('span', { className: 'text-purple-700 font-medium' }, cc.centro_custo)
                          )
                        ),
                        h('td', { className: 'px-3 py-1.5 text-right tabular-nums text-[11px]' }, fmtNum(cc.total_os)),
                        h('td', { className: 'px-3 py-1.5 text-right tabular-nums text-[11px]' }, fmtNum(cc.total_entregas)),
                        h('td', { className: 'px-3 py-1.5 text-right text-purple-700 text-[11px]' }, fmtNum(cc.retornos)),
                        h('td', { className: 'px-3 py-1.5 text-right text-[11px]' },
                          h('span', { className: 'text-green-700' }, fmtNum(cc.dentro_prazo)),
                          ' ',
                          h('span', { className: 'text-[10px] text-green-600' },
                            cc.taxa_prazo != null ? Number(cc.taxa_prazo).toFixed(1) + '%' : '')
                        ),
                        h('td', { className: 'px-3 py-1.5 text-right text-[11px]' },
                          h('span', { className: 'text-amber-700' }, fmtNum(cc.fora_prazo))
                        ),
                        h('td', { className: 'px-3 py-1.5 text-right tabular-nums text-[11px]' }, fmtMin(cc.tempo_medio)),
                        h('td', { className: 'px-3 py-1.5 text-right tabular-nums text-[11px]' }, fmtNum(cc.total_profissionais)),
                        h('td', { className: 'px-3 py-1.5 text-right text-gray-400 text-[11px]' }, '—'),
                        h('td', { className: 'px-3 py-1.5 text-right text-gray-400 text-[11px]' }, '')
                      )
                    );
                    return [linhaCli, ...filhas];
                  })
              )
            )
          )
        )
      )
    );
  }

  /* ───────── ABA POR PROFISSIONAL ───────── */
  function AbaProfissional({ apiUrl, fetchAuth, filtros }) {
    const [dados, setDados] = useState(null);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState(null);
    const [busca, setBusca] = useState('');
    const [ordem, setOrdem] = useState('total_entregas');

    useEffect(() => {
      let cancel = false;
      (async () => {
        setLoading(true); setErro(null);
        try {
          const params = new URLSearchParams();
          Object.entries(filtros || {}).forEach(([k, v]) => {
            if (v === '' || v === null || v === undefined) return;
            if (Array.isArray(v)) {
              if (v.length === 0) return;
              params.set(k, v.join(','));
            } else {
              params.set(k, v);
            }
          });
          const r = await fetchAuth(apiUrl + '/bi-monitoramento/profissionais?' + params.toString());
          if (!r.ok) throw new Error('HTTP ' + r.status);
          const j = await r.json();
          if (!cancel) setDados(j);
        } catch (e) {
          if (!cancel) setErro(e.message || 'erro');
        } finally {
          if (!cancel) setLoading(false);
        }
      })();
      return () => { cancel = true; };
    }, [apiUrl, fetchAuth, JSON.stringify(filtros)]);

    const linhas = useMemo(() => {
      let fonte = dados?.profissionais || [];
      const q = (busca || '').toLowerCase().trim();
      if (q) {
        fonte = fonte.filter(p =>
          String(p.nome_prof || '').toLowerCase().includes(q) ||
          String(p.cod_prof || '').includes(q)
        );
      }
      return [...fonte].sort((a, b) => (Number(b[ordem]) || 0) - (Number(a[ordem]) || 0));
    }, [dados, busca, ordem]);

    if (erro) {
      return h('div', { className: 'bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm' },
        '❌ Erro ao carregar profissionais: ' + erro);
    }

    return h('div', { className: 'bg-white border border-gray-200 rounded-xl overflow-hidden' },
      h('div', { className: 'flex items-center justify-between p-3 border-b border-gray-100' },
        h('div', { className: 'text-sm font-medium text-gray-900' },
          '👤 Por Profissional ',
          h('span', { className: 'text-xs text-gray-500 font-normal' },
            `(${linhas.length})`)
        ),
        h('div', { className: 'flex gap-2' },
          h('input', {
            type: 'text', placeholder: 'Buscar nome ou código...',
            value: busca, onChange: (e) => setBusca(e.target.value),
            className: 'text-xs px-2 py-1 border border-gray-200 rounded-md w-48 bg-white'
          }),
          h('select', {
            value: ordem, onChange: (e) => setOrdem(e.target.value),
            className: 'text-xs px-2 py-1 border border-gray-200 rounded-md bg-white'
          },
            h('option', { value: 'total_entregas' }, 'Mais entregas'),
            h('option', { value: 'taxa_prazo' }, 'Maior % prazo'),
            h('option', { value: 'retornos' }, 'Mais retornos'),
            h('option', { value: 'km_total' }, 'Maior KM')
          )
        )
      ),
      h('div', { className: 'overflow-x-auto' },
        h('table', { className: 'w-full text-xs' },
          h('thead', null,
            h('tr', { className: 'bg-gray-50 text-gray-600 font-semibold' },
              h('th', { className: 'px-3 py-2 text-left' }, 'Profissional'),
              h('th', { className: 'px-3 py-2 text-right' }, 'OS'),
              h('th', { className: 'px-3 py-2 text-right' }, 'Entregas'),
              h('th', { className: 'px-3 py-2 text-right bg-green-50 text-green-700' }, 'No Prazo'),
              h('th', { className: 'px-3 py-2 text-right bg-amber-50 text-amber-700' }, 'Fora Prazo'),
              h('th', { className: 'px-3 py-2 text-right' }, '% Prazo'),
              h('th', { className: 'px-3 py-2 text-right' }, 'Retornos'),
              h('th', { className: 'px-3 py-2 text-right' }, 'Tempo Médio'),
              h('th', { className: 'px-3 py-2 text-right' }, 'KM Total'),
              h('th', { className: 'px-3 py-2 text-right' }, 'Clientes')
            )
          ),
          h('tbody', null,
            loading ?
              h('tr', null, h('td', { colSpan: 10, className: 'p-4 text-center text-gray-400' }, 'Carregando...'))
            : linhas.length === 0 ?
              h('tr', null, h('td', { colSpan: 10, className: 'p-4 text-center text-gray-400' }, 'Nenhum profissional encontrado'))
            : linhas.map(p =>
                h('tr', { key: p.cod_prof, className: 'border-t border-gray-100 hover:bg-purple-50/30' },
                  h('td', { className: 'px-3 py-2' },
                    h('div', { className: 'flex items-center gap-2' },
                      h('div', {
                        className: 'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium',
                        style: { background: '#f5f3ff', color: '#7c3aed' }
                      }, iniciaisDe(p.nome_prof)),
                      h('div', null,
                        h('div', { className: 'text-gray-900 font-medium leading-tight' }, p.nome_prof || '—'),
                        h('div', { className: 'text-[10px] text-gray-500' }, '#' + p.cod_prof)
                      )
                    )
                  ),
                  h('td', { className: 'px-3 py-2 text-right tabular-nums' }, fmtNum(p.total_os)),
                  h('td', { className: 'px-3 py-2 text-right tabular-nums font-medium' }, fmtNum(p.total_entregas)),
                  h('td', { className: 'px-3 py-2 text-right bg-green-50/50 text-green-700' }, fmtNum(p.dentro_prazo)),
                  h('td', { className: 'px-3 py-2 text-right bg-amber-50/50 text-amber-700' }, fmtNum(p.fora_prazo)),
                  h('td', { className: 'px-3 py-2 text-right' },
                    h('span', {
                      className: 'inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ' + corPctBg(p.taxa_prazo)
                    }, p.taxa_prazo != null ? Number(p.taxa_prazo).toFixed(1) + '%' : '—')
                  ),
                  h('td', { className: 'px-3 py-2 text-right text-purple-700' }, fmtNum(p.retornos)),
                  h('td', { className: 'px-3 py-2 text-right tabular-nums' }, fmtMin(p.tempo_medio)),
                  h('td', { className: 'px-3 py-2 text-right tabular-nums' },
                    p.km_total != null ? Number(p.km_total).toFixed(1) + ' km' : '—'),
                  h('td', { className: 'px-3 py-2 text-right tabular-nums' }, fmtNum(p.total_clientes))
                )
              )
          )
        )
      )
    );
  }

  /* ───────── ABA POR REGIÃO ───────── */
  function AbaRegiao({ apiUrl, fetchAuth, filtros }) {
    const [dados, setDados] = useState(null);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState(null);

    useEffect(() => {
      let cancel = false;
      (async () => {
        setLoading(true); setErro(null);
        try {
          const params = new URLSearchParams();
          Object.entries(filtros || {}).forEach(([k, v]) => {
            if (v === '' || v === null || v === undefined) return;
            if (Array.isArray(v)) {
              if (v.length === 0) return;
              params.set(k, v.join(','));
            } else {
              params.set(k, v);
            }
          });
          const r = await fetchAuth(apiUrl + '/bi-monitoramento/regioes?' + params.toString());
          if (!r.ok) throw new Error('HTTP ' + r.status);
          const j = await r.json();
          if (!cancel) setDados(j);
        } catch (e) {
          if (!cancel) setErro(e.message || 'erro');
        } finally {
          if (!cancel) setLoading(false);
        }
      })();
      return () => { cancel = true; };
    }, [apiUrl, fetchAuth, JSON.stringify(filtros)]);

    if (erro) {
      return h('div', { className: 'bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm' },
        '❌ Erro ao carregar regiões: ' + erro);
    }

    const regioes = dados?.regioes || [];
    const totalEntregas = regioes.reduce((s, r) => s + (r.total_entregas || 0), 0);

    return h('div', { className: 'bg-white border border-gray-200 rounded-xl overflow-hidden' },
      h('div', { className: 'flex items-center justify-between p-3 border-b border-gray-100' },
        h('div', { className: 'text-sm font-medium text-gray-900' },
          '🗺 Por Região ',
          h('span', { className: 'text-xs text-gray-500 font-normal' },
            `(${regioes.length} regiões)`)
        ),
        h('div', { className: 'text-xs text-gray-500' },
          'Total: ', h('span', { className: 'font-medium text-gray-900' }, fmtNum(totalEntregas)),
          ' entregas')
      ),
      h('div', { className: 'overflow-x-auto' },
        h('table', { className: 'w-full text-xs' },
          h('thead', null,
            h('tr', { className: 'bg-gray-50 text-gray-600 font-semibold' },
              h('th', { className: 'px-3 py-2 text-left' }, 'Região'),
              h('th', { className: 'px-3 py-2 text-right' }, 'OS'),
              h('th', { className: 'px-3 py-2 text-right' }, 'Entregas'),
              h('th', { className: 'px-3 py-2 text-right bg-green-50 text-green-700' }, 'No Prazo'),
              h('th', { className: 'px-3 py-2 text-right bg-amber-50 text-amber-700' }, 'Fora Prazo'),
              h('th', { className: 'px-3 py-2 text-right' }, '% Prazo'),
              h('th', { className: 'px-3 py-2 text-right' }, 'Tempo Médio'),
              h('th', { className: 'px-3 py-2 text-right' }, 'Profissionais'),
              h('th', { className: 'px-3 py-2 text-right' }, 'Clientes'),
              h('th', { className: 'px-3 py-2 text-right' }, 'Retornos')
            )
          ),
          h('tbody', null,
            loading ?
              h('tr', null, h('td', { colSpan: 10, className: 'p-4 text-center text-gray-400' }, 'Carregando...'))
            : regioes.length === 0 ?
              h('tr', null, h('td', { colSpan: 10, className: 'p-4 text-center text-gray-400' }, 'Nenhuma região com dados'))
            : regioes.map(r => {
                const pctTotal = totalEntregas > 0 ? (100 * r.total_entregas / totalEntregas) : 0;
                return h('tr', { key: r.regiao, className: 'border-t border-gray-100 hover:bg-purple-50/30' },
                  h('td', { className: 'px-3 py-2' },
                    h('div', { className: 'flex items-center gap-2' },
                      h('span', null, r.regiao === 'Sem Região' ? '❓' : '📍'),
                      h('div', null,
                        h('div', { className: 'text-gray-900 font-medium' }, r.regiao),
                        h('div', { className: 'mt-1 h-1 bg-gray-100 rounded-full overflow-hidden w-32' },
                          h('div', {
                            className: 'h-full',
                            style: { width: pctTotal + '%', background: '#7c3aed' }
                          })
                        )
                      )
                    )
                  ),
                  h('td', { className: 'px-3 py-2 text-right tabular-nums' }, fmtNum(r.total_os)),
                  h('td', { className: 'px-3 py-2 text-right tabular-nums font-medium' }, fmtNum(r.total_entregas)),
                  h('td', { className: 'px-3 py-2 text-right bg-green-50/50 text-green-700' }, fmtNum(r.dentro_prazo)),
                  h('td', { className: 'px-3 py-2 text-right bg-amber-50/50 text-amber-700' }, fmtNum(r.fora_prazo)),
                  h('td', { className: 'px-3 py-2 text-right' },
                    h('span', {
                      className: 'inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ' + corPctBg(r.taxa_prazo)
                    }, r.taxa_prazo != null ? Number(r.taxa_prazo).toFixed(1) + '%' : '—')
                  ),
                  h('td', { className: 'px-3 py-2 text-right tabular-nums' }, fmtMin(r.tempo_medio)),
                  h('td', { className: 'px-3 py-2 text-right tabular-nums' }, fmtNum(r.total_profissionais)),
                  h('td', { className: 'px-3 py-2 text-right tabular-nums' }, fmtNum(r.total_clientes)),
                  h('td', { className: 'px-3 py-2 text-right text-purple-700' }, fmtNum(r.retornos))
                );
              })
          )
        )
      )
    );
  }

  /* ───────── ABA HORA A HORA ───────── */
  function AbaHoraAHora({ apiUrl, fetchAuth, filtros }) {
    const [dados, setDados] = useState(null);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState(null);

    useEffect(() => {
      let cancel = false;
      (async () => {
        setLoading(true); setErro(null);
        try {
          const params = new URLSearchParams();
          Object.entries(filtros || {}).forEach(([k, v]) => {
            if (v === '' || v === null || v === undefined) return;
            if (Array.isArray(v)) {
              if (v.length === 0) return;
              params.set(k, v.join(','));
            } else {
              params.set(k, v);
            }
          });
          const r = await fetchAuth(apiUrl + '/bi-monitoramento/hora-a-hora?' + params.toString());
          if (!r.ok) throw new Error('HTTP ' + r.status);
          const j = await r.json();
          if (!cancel) setDados(j);
        } catch (e) {
          if (!cancel) setErro(e.message || 'erro');
        } finally {
          if (!cancel) setLoading(false);
        }
      })();
      return () => { cancel = true; };
    }, [apiUrl, fetchAuth, JSON.stringify(filtros)]);

    if (erro) {
      return h('div', { className: 'bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm' },
        '❌ Erro ao carregar hora a hora: ' + erro);
    }

    const horas = dados?.horas || [];
    const resumo = dados?.resumo || {};
    const maxOs = Math.max(...horas.map(h => h.total_os || 0), 1);

    return h('div', { className: 'bg-white border border-gray-200 rounded-xl p-4' },
      // Header
      h('div', { className: 'flex justify-between items-center mb-3' },
        h('div', { className: 'text-sm font-medium text-gray-900' },
          '🕐 Acompanhamento hora a hora ',
          resumo.pct_pico != null ?
            h('span', {
              className: 'text-[10px] font-medium px-2 py-0.5 rounded-full ml-1',
              style: { background: '#f5f3ff', color: '#7c3aed' }
            }, resumo.pct_pico.toFixed(1) + '% entre 8h–18h')
            : null
        ),
        h('span', { className: 'text-xs text-gray-500' },
          fmtNum(resumo.total_os) + ' OS')
      ),

      // Cards resumo
      h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-2 mb-4' },
        h('div', { className: 'bg-gray-50 rounded-lg p-3' },
          h('div', { className: 'text-[10px] text-gray-500 uppercase font-semibold' }, 'Horário de pico'),
          h('div', { className: 'text-lg font-medium text-gray-900 mt-1' },
            loading ? '—' : (resumo.hora_pico != null ? String(resumo.hora_pico).padStart(2, '0') + ':00' : '—')),
          h('div', { className: 'text-[10px] text-gray-500' },
            loading ? '' : fmtNum(resumo.os_hora_pico) + ' OS')
        ),
        h('div', { className: 'bg-gray-50 rounded-lg p-3' },
          h('div', { className: 'text-[10px] text-gray-500 uppercase font-semibold' }, 'OS no pico (8h–18h)'),
          h('div', { className: 'text-lg font-medium text-gray-900 mt-1' },
            loading ? '—' : fmtNum(resumo.os_pico)),
          h('div', { className: 'text-[10px] text-gray-500' },
            loading ? '' : (resumo.pct_pico != null ? resumo.pct_pico.toFixed(1) + '% do total' : ''))
        ),
        h('div', { className: 'bg-gray-50 rounded-lg p-3' },
          h('div', { className: 'text-[10px] text-gray-500 uppercase font-semibold' }, 'Média por hora (pico)'),
          h('div', { className: 'text-lg font-medium text-gray-900 mt-1' },
            loading ? '—' : fmtNum(resumo.media_por_hora_pico)),
          h('div', { className: 'text-[10px] text-gray-500' }, 'OS/hora')
        ),
        h('div', { className: 'bg-gray-50 rounded-lg p-3' },
          h('div', { className: 'text-[10px] text-gray-500 uppercase font-semibold' }, 'Fora do pico'),
          h('div', { className: 'text-lg font-medium text-gray-900 mt-1' },
            loading ? '—' : fmtNum(resumo.os_fora_pico)),
          h('div', { className: 'text-[10px] text-gray-500' },
            loading ? '' : (resumo.pct_fora_pico != null ? resumo.pct_fora_pico.toFixed(1) + '%' : ''))
        )
      ),

      // Gráfico de barras SVG
      loading ?
        h('div', { className: 'h-72 flex items-center justify-center text-gray-400 text-sm' }, 'Carregando...')
      : h('div', null,
          h('svg', { viewBox: '0 0 760 280', width: '100%', height: 280 },
            // grid
            [0, 0.25, 0.5, 0.75, 1].map(p => {
              const y = 30 + (200 - 200 * p);
              return h('g', { key: 'g' + p },
                h('line', { x1: 40, y1: y, x2: 740, y2: y, stroke: '#f3f4f6', strokeWidth: 1 }),
                h('text', { x: 36, y: y + 3, textAnchor: 'end', fontSize: 9, fill: '#9ca3af' },
                  Math.round(maxOs * p))
              );
            }),
            // barras
            horas.map((hh, i) => {
              const x = 50 + i * 28;
              const altura = (hh.total_os || 0) / maxOs * 200;
              const y = 230 - altura;
              const noPico = i >= 8 && i <= 18;
              return h('g', { key: 'b' + i },
                h('rect', {
                  x, y, width: 22, height: Math.max(altura, 2),
                  fill: noPico ? '#7c3aed' : '#cbd5e1', rx: 2
                }),
                hh.total_os > 0 ? h('text', {
                  x: x + 11, y: y - 4, textAnchor: 'middle',
                  fontSize: 9, fill: '#374151', fontWeight: 500
                }, hh.total_os) : null,
                h('text', {
                  x: x + 11, y: 248, textAnchor: 'middle',
                  fontSize: 9, fill: '#6b7280'
                }, String(i).padStart(2, '0') + 'h')
              );
            }),
            // legenda
            h('g', null,
              h('rect', { x: 50, y: 262, width: 10, height: 10, fill: '#7c3aed', rx: 2 }),
              h('text', { x: 65, y: 271, fontSize: 10, fill: '#6b7280' }, 'Pico (8h–18h)'),
              h('rect', { x: 160, y: 262, width: 10, height: 10, fill: '#cbd5e1', rx: 2 }),
              h('text', { x: 175, y: 271, fontSize: 10, fill: '#6b7280' }, 'Fora do pico')
            )
          )
        )
    );
  }

  /* ═════════ COMPONENTE RAIZ ═════════ */
  function ModuloBiMonitoramento(props) {
    const {
      apiUrl, fetchAuth,
      // Props pra navbar global (passadas pelo app.js)
      HeaderCompacto, usuario, moduloAtivo, abaAtiva,
      socialProfile, isLoading, lastUpdate,
      onRefresh, onLogout, onGoHome, onNavigate, onChangeTab
    } = props;

    const [aba, setAba] = useState('dashboard');
    const [filtrosAbertos, setFiltrosAbertos] = useState(false);
    const [filtros, setFiltros] = useState({
      data_inicio: dataNDiasAtrasISO(5),
      data_fim: dataHojeISO(),
      status_prazo: '', status_retorno: '', regiao: '',
      categoria: [], cod_cliente: [], centro_custo: []
    });
    const [info, setInfo] = useState({});

    useEffect(() => {
      let cancel = false;
      (async () => {
        try {
          const r = await fetchAuth(apiUrl + '/bi-monitoramento/info');
          if (!cancel && r.ok) setInfo(await r.json());
        } catch (e) {
          /* silencioso */
        }
      })();
      return () => { cancel = true; };
    }, [apiUrl, fetchAuth]);

    const filtrosResumo = useMemo(() => {
      const out = [];
      if (filtros.data_inicio || filtros.data_fim) {
        out.push(`${fmtDataBr(filtros.data_inicio)} → ${fmtDataBr(filtros.data_fim)}`);
      }
      const arrCli = Array.isArray(filtros.cod_cliente) ? filtros.cod_cliente
        : (filtros.cod_cliente ? [filtros.cod_cliente] : []);
      const arrCC = Array.isArray(filtros.centro_custo) ? filtros.centro_custo
        : (filtros.centro_custo ? [filtros.centro_custo] : []);
      const arrCat = Array.isArray(filtros.categoria) ? filtros.categoria
        : (filtros.categoria ? [filtros.categoria] : []);

      if (arrCli.length === 1) out.push('Cliente ' + arrCli[0]);
      else if (arrCli.length > 1) out.push(arrCli.length + ' clientes');

      if (arrCC.length === 1) out.push('CC: ' + arrCC[0]);
      else if (arrCC.length > 1) out.push(arrCC.length + ' centros');

      if (arrCat.length === 1) out.push(arrCat[0]);
      else if (arrCat.length > 1) out.push(arrCat.length + ' categorias');

      if (filtros.regiao) out.push('Região: ' + filtros.regiao);
      if (filtros.status_prazo) out.push(filtros.status_prazo === 'dentro' ? 'No prazo' : 'Fora do prazo');
      if (filtros.status_retorno) out.push(filtros.status_retorno === 'com_retorno' ? 'Com retorno' : 'Sem retorno');
      return out;
    }, [filtros]);

    return h('div', { className: 'min-h-screen bg-gray-50' },
      // Navbar global do app (mesma de todos os módulos)
      HeaderCompacto ? h(HeaderCompacto, {
        usuario, moduloAtivo, abaAtiva, socialProfile, isLoading, lastUpdate,
        onRefresh, onLogout, onGoHome, onNavigate, onChangeTab
      }) : null,

      // Sub-header do módulo (tabs internas + filtros)
      h('div', { className: 'bg-white border-b border-gray-200' },
        h('div', { className: 'px-5 py-3 flex items-center justify-between flex-wrap gap-2' },
          h('div', null,
            h('div', { className: 'flex items-center gap-2 text-sm font-medium text-gray-900' },
              h('span', { style: { fontSize: '18px' } }, '📡'),
              'BI Monitoramento'
            ),
            h('div', { className: 'text-[11px] text-gray-500 mt-0.5' },
              `Visão operacional · admin / master · `,
              info.ultima_data ? `dados até ${fmtDataBr(info.ultima_data)}` : 'carregando...')
          ),
          h('div', { className: 'flex items-center gap-2' },
            filtrosResumo.length > 0 ?
              h('div', { className: 'text-[11px] text-gray-600 max-w-sm truncate' },
                '🔎 ' + filtrosResumo.join(' · '))
              : null,
            h('button', {
              className: 'text-xs px-3 py-1.5 rounded-md border border-purple-200 bg-purple-50 text-purple-700 font-medium hover:bg-purple-100',
              onClick: () => setFiltrosAbertos(true)
            }, '🔎 Filtros')
          )
        ),
        h('div', { className: 'px-5 flex gap-1 border-t border-gray-100' },
          [
            { id: 'dashboard',   label: '📊 Dashboard' },
            { id: 'profissional', label: '👤 Por Profissional' },
            { id: 'regiao',      label: '🗺 Por Região' },
            { id: 'hora',        label: '🕐 Hora a Hora' }
          ].map(t =>
            h('button', {
              key: t.id,
              onClick: () => setAba(t.id),
              className: 'px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ' +
                (aba === t.id
                  ? 'border-purple-600 text-purple-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700')
            }, t.label)
          )
        )
      ),

      // Conteúdo
      h('div', { className: 'p-4 max-w-[1600px] mx-auto' },
        aba === 'dashboard'    ? h(AbaDashboard,    { apiUrl, fetchAuth, filtros }) :
        aba === 'profissional' ? h(AbaProfissional, { apiUrl, fetchAuth, filtros }) :
        aba === 'regiao'       ? h(AbaRegiao,       { apiUrl, fetchAuth, filtros }) :
        aba === 'hora'         ? h(AbaHoraAHora,    { apiUrl, fetchAuth, filtros }) :
        null
      ),

      // Modal filtros
      h(ModalFiltros, {
        aberto: filtrosAbertos,
        onFechar: () => setFiltrosAbertos(false),
        filtros, setFiltros, apiUrl, fetchAuth
      })
    );
  }

  window.ModuloBiMonitoramento = ModuloBiMonitoramento;
  console.log('✅ [bi-monitoramento] window.ModuloBiMonitoramento registrado');
})();
