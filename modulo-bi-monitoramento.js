/* UI_UNIFICADO_V1: emojis -> sprite de icones; cores na paleta unica (CORES_TOKENS_V1). */
/* BI_ICONS_V1 */
/* BI_ABAS_V1: BI Monitoramento no padrão clean — cabeçalho Sora 24, abas internas, faixa única
   de KPIs, tabelas com cabeçalho #f9fafb e status em pílula suave, modal de filtros branco.
   Cálculos, filtros e chamadas de API inalterados. */
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
    if (taxa >= 75) return 'text-green-800';
    if (taxa >= 60) return 'text-amber-800';
    return 'text-red-800';
  }
  // BI_ABAS_V1: tom da pílula de % prazo (fundo 50 + texto 800 + ponto 600)
  function tomPct(taxa) {
    if (taxa === null || taxa === undefined) return ['#f3f4f6', '#374151', '#9ca3af'];
    if (taxa >= 75) return ['#f0fdf4', '#166534', '#16a34a'];
    if (taxa >= 60) return ['#fffbeb', '#92400e', '#d97706'];
    return ['#fef2f2', '#991b1b', '#dc2626'];
  }
  function pillPct(taxa) {
    const t = tomPct(taxa);
    return h('span', { className: 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap', style: { background: t[0], color: t[1] } },
      h('span', { style: { width: 6, height: 6, borderRadius: 999, background: t[2] } }),
      taxa != null ? Number(taxa).toFixed(1) + '%' : '—');
  }
  function ico(nome, sz, extra) {
    return h('svg', { className: 'ico', style: Object.assign({ width: sz || 15, height: sz || 15, flexShrink: 0 }, extra || {}), 'aria-hidden': 'true' }, h('use', { href: '#i-' + nome }));
  }
  const CARD = 'bg-white border border-gray-200 rounded-[14px]';
  const TH = 'px-3 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap';
  const TD = 'px-3 py-2.5';
  const INPUT = 'w-full h-[38px] bg-white border border-gray-200 rounded-[10px] px-3 text-[13px] text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100';
  const BTN_SEC = 'inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-[10px] text-[13px] font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 whitespace-nowrap';
  const BTN_PRI = 'inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-[10px] text-[13px] font-semibold text-white whitespace-nowrap';
  function cabecalhoCard(titulo, sub, direita) {
    return h('div', { className: 'flex items-center justify-between gap-3 flex-wrap px-4 py-3 border-b border-gray-100' },
      h('div', { className: 'min-w-0' },
        h('h2', { className: 'text-[15px] font-semibold text-gray-900', style: { margin: 0 } }, titulo),
        sub ? h('div', { className: 'text-[13px] text-gray-500 mt-0.5' }, sub) : null),
      direita || null);
  }
  function busca(valor, setValor, placeholder) {
    return h('div', { className: 'relative' },
      ico('search', 14, { position: 'absolute', left: 10, top: 10, color: '#9ca3af' }),
      h('input', {
        type: 'text', placeholder, 'aria-label': placeholder,
        value: valor, onChange: (e) => setValor(e.target.value),
        className: 'h-[34px] pl-8 pr-3 border border-gray-200 rounded-[10px] w-52 bg-white text-[13px]'
      }));
  }
  // Faixa única de KPIs: [{ label, valor, sub }]
  function FaixaKpis({ itens, rotulo }) {
    return h('section', { 'aria-label': rotulo || 'Indicadores', className: CARD + ' overflow-hidden', style: { display: 'flex', flexWrap: 'wrap' } },
      itens.map((k, i) => h('div', {
        key: k.label,
        style: { flex: '1 1 180px', padding: '14px 20px', borderRight: i === itens.length - 1 ? 0 : '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6', marginBottom: -1, minWidth: 0 }
      },
        h('div', { style: { fontSize: 12, color: '#6b7280' } }, k.label),
        h('div', { style: { fontFamily: 'Sora, Inter, sans-serif', fontSize: 24, fontWeight: 700, color: k.cor || '#111827', fontVariantNumeric: 'tabular-nums', lineHeight: 1.25, margin: '2px 0', whiteSpace: 'nowrap' } }, k.valor),
        k.sub ? h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, k.sub) : null
      )));
  }
  function estadoErro(msg) {
    return h('div', { role: 'alert', className: 'rounded-[14px] p-4 text-[13px]', style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' } }, msg);
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
  // BI_ABAS_V1: par semântico sucesso (#16a34a) x erro (#dc2626)
  function DonutPrazo({ taxa, dentro, fora }) {
    const t = Number(taxa) || 0;
    const r = 78, c = 2 * Math.PI * r;
    const offset = c * (1 - t / 100);
    return h('div', { className: 'flex items-center justify-center gap-8 flex-wrap' },
      h('svg', { viewBox: '0 0 200 200', width: 168, height: 168, role: 'img', 'aria-label': t.toFixed(1) + '% no prazo' },
        h('circle', { cx: 100, cy: 100, r, fill: 'none', stroke: '#dc2626', strokeWidth: 20 }),
        h('circle', {
          cx: 100, cy: 100, r, fill: 'none', stroke: '#16a34a', strokeWidth: 20,
          strokeDasharray: c, strokeDashoffset: offset,
          transform: 'rotate(-90 100 100)', strokeLinecap: 'butt'
        }),
        h('text', { x: 100, y: 100, textAnchor: 'middle', fontSize: 30, fontWeight: 700, fill: '#111827', fontFamily: 'Sora, Inter, sans-serif' },
          t.toFixed(1) + '%'),
        h('text', { x: 100, y: 122, textAnchor: 'middle', fontSize: 12, fill: '#6b7280' },
          'no prazo')
      ),
      h('div', { className: 'flex flex-col gap-3 text-[13px]', style: { minWidth: 180 } },
        h('div', { className: 'flex items-start gap-2' },
          h('span', { style: { width: 10, height: 10, borderRadius: 3, background: '#16a34a', marginTop: 4, flexShrink: 0 } }),
          h('div', null,
            h('div', { className: 'text-gray-500' }, 'No prazo'),
            h('div', { className: 'font-semibold text-gray-900 tabular-nums' }, fmtNum(dentro), h('span', { className: 'font-normal text-gray-500' }, ' · ' + t.toFixed(1) + '%')))),
        h('div', { className: 'flex items-start gap-2' },
          h('span', { style: { width: 10, height: 10, borderRadius: 3, background: '#dc2626', marginTop: 4, flexShrink: 0 } }),
          h('div', null,
            h('div', { className: 'text-gray-500' }, 'Fora do prazo'),
            h('div', { className: 'font-semibold text-gray-900 tabular-nums' }, fmtNum(fora), h('span', { className: 'font-normal text-gray-500' }, ' · ' + (100 - t).toFixed(1) + '%'))))
      )
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

    const caixaLista = (titulo, qtdSel, onLimpar, conteudo, rodape) =>
      h('div', { className: 'border border-gray-200 rounded-[12px] overflow-hidden bg-white' },
        h('div', { className: 'flex justify-between items-center px-3 py-2 bg-gray-50 border-b border-gray-100' },
          h('div', { className: 'text-xs font-semibold text-gray-700' }, titulo,
            qtdSel > 0 ? h('span', { className: 'font-medium text-purple-800' }, ' · ' + qtdSel + ' selec.') : null),
          h('button', { type: 'button', className: 'text-xs font-semibold text-gray-500 hover:text-gray-900', onClick: onLimpar }, 'Limpar')
        ),
        h('div', { className: 'p-2' }, conteudo),
        rodape ? h('div', { className: 'px-3 py-1.5 text-xs text-gray-500 border-t border-gray-100' }, rodape) : null
      );
    const itemCheck = (key, checked, onChange, texto) =>
      h('label', { key, className: 'flex items-center gap-2 text-[13px] text-gray-700 py-1 cursor-pointer hover:bg-gray-50 rounded-md px-1.5' },
        h('input', { type: 'checkbox', checked, onChange, style: { accentColor: '#770fa8' } }), texto);

    return h('div', {
      className: 'fixed inset-0 z-50 flex items-center justify-center p-4',
      style: { background: 'rgba(17,24,39,0.45)' }, onClick: onFechar
    },
      h('div', {
        role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'bimon-filtros-titulo',
        className: 'bg-white rounded-[14px] border border-gray-200 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col',
        onClick: (e) => e.stopPropagation()
      },
        h('div', { className: 'flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100' },
          h('div', null,
            h('div', { id: 'bimon-filtros-titulo', className: 'text-base font-semibold text-gray-900' }, 'Filtros'),
            h('div', { className: 'text-[13px] text-gray-500 mt-0.5' }, 'Valem para todas as abas do BI Monitoramento.')),
          h('button', { type: 'button', 'aria-label': 'Fechar', title: 'Fechar', className: 'inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100', onClick: onFechar }, ico('x', 16))
        ),
        h('div', { className: 'p-5 overflow-y-auto flex-1 flex flex-col gap-4' },
          h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3' },
            h('div', null,
              h('label', { htmlFor: 'bimon-ini', className: 'text-xs font-semibold text-gray-700 block mb-1.5' }, 'Data início'),
              h('input', {
                id: 'bimon-ini', type: 'date', value: local.data_inicio || '',
                onChange: (e) => setLocal({ ...local, data_inicio: e.target.value }),
                className: INPUT
              })
            ),
            h('div', null,
              h('label', { htmlFor: 'bimon-fim', className: 'text-xs font-semibold text-gray-700 block mb-1.5' }, 'Data fim'),
              h('input', {
                id: 'bimon-fim', type: 'date', value: local.data_fim || '',
                onChange: (e) => setLocal({ ...local, data_fim: e.target.value }),
                className: INPUT
              })
            ),
            h('div', null,
              h('label', { htmlFor: 'bimon-prazo', className: 'text-xs font-semibold text-gray-700 block mb-1.5' }, 'Status do prazo'),
              h('select', {
                id: 'bimon-prazo',
                value: local.status_prazo || '',
                onChange: (e) => setLocal({ ...local, status_prazo: e.target.value }),
                className: INPUT
              },
                h('option', { value: '' }, 'Todos'),
                h('option', { value: 'dentro' }, 'No Prazo'),
                h('option', { value: 'fora' }, 'Fora do Prazo')
              )
            ),
            h('div', null,
              h('label', { htmlFor: 'bimon-ret', className: 'text-xs font-semibold text-gray-700 block mb-1.5' }, 'Retorno'),
              h('select', {
                id: 'bimon-ret',
                value: local.status_retorno || '',
                onChange: (e) => setLocal({ ...local, status_retorno: e.target.value }),
                className: INPUT
              },
                h('option', { value: '' }, 'Todos'),
                h('option', { value: 'com_retorno' }, 'Com Retorno'),
                h('option', { value: 'sem_retorno' }, 'Sem Retorno')
              )
            )
          ),
          h('div', { className: 'md:w-1/3' },
            h('label', { htmlFor: 'bimon-regiao', className: 'text-xs font-semibold text-gray-700 block mb-1.5' }, 'Região'),
            h('select', {
              id: 'bimon-regiao',
              value: local.regiao || '',
              onChange: (e) => setLocal({ ...local, regiao: e.target.value }),
              className: INPUT
            },
              h('option', { value: '' }, 'Todas as Regiões'),
              regioes.map(r => h('option', { key: r.id, value: r.nome }, r.nome))
            )
          ),
          caixaLista('Categoria', arrCat.length, () => setLocal({ ...local, categoria: [] }),
            h('div', { className: 'max-h-32 overflow-y-auto' },
              categorias.map(cat => itemCheck(cat, arrCat.includes(cat), () => setLocal({ ...local, categoria: toggleArr(arrCat, cat) }), cat))
            ),
            `${categorias.length} disponíveis · ${arrCat.length === 0 ? 'Sem seleção = Todas' : arrCat.length + ' selecionada(s)'}`),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
            caixaLista('Cliente (loja)', arrCli.length, () => setLocal({ ...local, cod_cliente: [] }),
              h(React.Fragment, null,
                h('div', { className: 'relative mb-2' },
                  ico('search', 14, { position: 'absolute', left: 10, top: 12, color: '#9ca3af' }),
                  h('input', {
                    type: 'text', placeholder: 'Buscar por código ou nome', 'aria-label': 'Buscar cliente',
                    value: buscaCliente, onChange: (e) => setBuscaCliente(e.target.value),
                    className: INPUT + ' pl-8'
                  })),
                h('div', { className: 'max-h-32 overflow-y-auto' },
                  clientesFiltrados.slice(0, 200).map(c =>
                    itemCheck(c.cod_cliente, arrCli.some(v => String(v) === String(c.cod_cliente)), () => setLocal({ ...local, cod_cliente: toggleArr(arrCli, c.cod_cliente) }), `${c.cod_cliente} - ${c.nome_fantasia || ''}`))
                )
              )),
            caixaLista('Centro de custo', arrCC.length, () => setLocal({ ...local, centro_custo: [] }),
              h('div', { className: 'max-h-40 overflow-y-auto' },
                centros.slice(0, 500).map(cc => itemCheck(cc, arrCC.includes(cc), () => setLocal({ ...local, centro_custo: toggleArr(arrCC, cc) }), cc))
              ),
              `${centros.length} disponíveis · ${arrCC.length === 0 ? 'Sem seleção = Todos' : arrCC.length + ' selecionado(s)'}`)
          )
        ),
        h('div', { className: 'border-t border-gray-100 px-5 py-3 flex justify-between gap-2 flex-wrap' },
          h('button', { type: 'button', className: BTN_SEC, onClick: limpar }, 'Limpar filtros'),
          h('div', { className: 'flex gap-2' },
            h('button', { type: 'button', className: BTN_SEC, onClick: onFechar }, 'Cancelar'),
            h('button', { type: 'button', className: BTN_PRI, style: { background: '#770fa8' }, onClick: aplicar }, 'Aplicar filtros'))
        )
      )
    );
  }

  /* ───────── ABA DASHBOARD ───────── */
  function AbaDashboard({ apiUrl, fetchAuth, filtros }) {
    const [dados, setDados] = useState(null);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState(null);
    const [busca_, setBusca] = useState('');
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
      const q = (busca_ || '').toLowerCase().trim();
      if (!q) return fonte;
      return fonte.filter(l =>
        String(l.nome_display || '').toLowerCase().includes(q) ||
        String(l.nome_fantasia || '').toLowerCase().includes(q) ||
        String(l.nome_cliente || '').toLowerCase().includes(q) ||
        String(l.cod_cliente || '').includes(q)
      );
    }, [dados, busca_]);

    if (erro) {
      return estadoErro('Não foi possível carregar o dashboard (' + erro + '). Tente de novo em instantes.');
    }

    return h('div', { className: 'flex flex-col gap-4' },
      // Faixa de KPIs operacionais
      h(FaixaKpis, { rotulo: 'Indicadores operacionais', itens: [
        { label: 'Ordens de serviço', valor: loading ? '—' : fmtNum(m.total_os), sub: 'Total de OS no período' },
        { label: 'Entregas', valor: loading ? '—' : fmtNum(m.total_entregas), sub: loading ? '' : `Realizadas · ${fmtNum(m.retornos)} retornos` },
        { label: 'Tempo médio', valor: loading ? '—' : fmtMin(m.tempo_medio), sub: 'Da coleta até a entrega' },
        { label: 'Média ent./profissional', valor: loading ? '—' : (m.media_entregas_entregador != null ? Number(m.media_entregas_entregador).toFixed(1) : '—'), sub: loading ? '' : `${fmtNum(m.total_entregadores)} profissionais ativos` }
      ] }),

      // Prazo de entrega
      h('section', { className: CARD },
        cabecalhoCard('Prazo de entrega', 'Entregas no prazo x fora do prazo no período'),
        h('div', { className: 'p-5' },
          loading ? h('div', { className: 'h-40 flex items-center justify-center text-gray-500 text-[13px]' }, 'Carregando...')
          : h(DonutPrazo, {
              taxa: m.taxa_dentro,
              dentro: m.dentro_prazo,
              fora: m.fora_prazo
            })
        )
      ),

      // Tabela por cliente
      h('section', { className: CARD + ' overflow-hidden' },
        cabecalhoCard('Resumo operacional por cliente', `${linhas.length} clientes`, busca(busca_, setBusca, 'Buscar cliente')),
        h('div', { className: 'overflow-x-auto' },
          h('table', { className: 'w-full text-[13px]', style: { minWidth: 1000, borderCollapse: 'collapse' } },
            h('thead', null,
              h('tr', { className: 'bg-gray-50' },
                h('th', { className: TH + ' text-left' }, 'Cliente'),
                h('th', { className: TH + ' text-right' }, 'OS'),
                h('th', { className: TH + ' text-right' }, 'Entregas'),
                h('th', { className: TH + ' text-right' }, 'Retornos'),
                h('th', { className: TH + ' text-right' }, 'No prazo'),
                h('th', { className: TH + ' text-right' }, 'Fora do prazo'),
                h('th', { className: TH + ' text-right' }, 'Tempo médio'),
                h('th', { className: TH + ' text-right' }, 'Profissionais'),
                h('th', { className: TH + ' text-right' }, 'Ent./prof.'),
                h('th', { className: TH + ' text-right' }, 'Últ. entrega')
              )
            ),
            h('tbody', { className: 'tabular-nums' },
              loading ?
                h('tr', null, h('td', { colSpan: 10, className: 'p-6 text-center text-gray-500 border-t border-gray-100' }, 'Carregando...'))
              : linhas.length === 0 ?
                h('tr', null, h('td', { colSpan: 10, className: 'p-6 text-center text-gray-500 border-t border-gray-100' }, busca_ ? 'Nenhum cliente para essa busca.' : 'Nenhum dado encontrado no período.'))
              : linhas.flatMap(l => {
                  const aberto = expandidos.has(l.cod_cliente);
                  const temCcs = (l.centros_custo || []).length > 0;
                  const linhaCli = h('tr', { key: 'cli-' + l.cod_cliente, className: 'border-t border-gray-100 hover:bg-gray-50' },
                    h('td', { className: TD + ' text-gray-900' },
                      h('div', { className: 'flex items-center gap-2' },
                        h('button', {
                          type: 'button',
                          className: 'inline-flex items-center justify-center w-6 h-6 rounded-md text-gray-500 hover:bg-gray-100 ' + (temCcs ? '' : 'opacity-30 cursor-not-allowed'),
                          onClick: () => temCcs && toggleExpand(l.cod_cliente),
                          disabled: !temCcs,
                          'aria-expanded': temCcs ? aberto : undefined,
                          'aria-label': temCcs ? (aberto ? 'Recolher centros de custo' : 'Expandir centros de custo') : 'Sem centros de custo',
                          title: temCcs ? (aberto ? 'Recolher centros de custo' : 'Expandir centros de custo') : 'Sem centros de custo'
                        }, ico('arrowright', 13, { transform: aberto ? 'rotate(90deg)' : 'none', transition: 'transform .15s' })),
                        h('span', { className: 'font-semibold' }, l.cod_cliente),
                        h('span', { className: 'text-gray-400' }, '·'),
                        h('span', { className: 'truncate' }, l.nome_display || l.nome_fantasia || l.nome_cliente || '—')
                      )
                    ),
                    h('td', { className: TD + ' text-right' }, fmtNum(l.total_os)),
                    h('td', { className: TD + ' text-right' }, fmtNum(l.total_entregas)),
                    h('td', { className: TD + ' text-right' }, fmtNum(l.retornos)),
                    h('td', { className: TD + ' text-right whitespace-nowrap' },
                      h('span', { className: 'font-semibold text-gray-900' }, fmtNum(l.dentro_prazo)),
                      ' ',
                      h('span', { className: 'text-xs', style: { color: '#166534' } },
                        l.taxa_prazo != null ? Number(l.taxa_prazo).toFixed(1) + '%' : '')
                    ),
                    h('td', { className: TD + ' text-right whitespace-nowrap' },
                      h('span', { className: 'font-semibold text-gray-900' }, fmtNum(l.fora_prazo)),
                      ' ',
                      h('span', { className: 'text-xs', style: { color: '#991b1b' } },
                        l.taxa_prazo != null ? (100 - Number(l.taxa_prazo)).toFixed(1) + '%' : '')
                    ),
                    h('td', { className: TD + ' text-right' }, fmtMin(l.tempo_medio)),
                    h('td', { className: TD + ' text-right' }, fmtNum(l.total_profissionais)),
                    h('td', { className: TD + ' text-right' },
                      l.media_ent_prof != null ? Number(l.media_ent_prof).toFixed(2) : '—'),
                    h('td', { className: TD + ' text-right text-gray-500 whitespace-nowrap' }, fmtDataBr(l.ultima_entrega))
                  );

                  if (!aberto || !temCcs) return [linhaCli];

                  // Linhas-filhas (centros de custo)
                  const filhas = l.centros_custo.map(cc =>
                    h('tr', { key: `cc-${l.cod_cliente}-${cc.centro_custo}`, className: 'border-t border-gray-100 bg-gray-50 text-[12.5px]' },
                      h('td', { className: 'px-3 py-2 text-gray-700' },
                        h('span', { style: { paddingLeft: 32 }, className: 'inline-flex items-center gap-1.5' },
                          ico('pin', 12, { color: '#9ca3af' }),
                          h('span', { className: 'font-medium' }, cc.centro_custo)
                        )
                      ),
                      h('td', { className: 'px-3 py-2 text-right' }, fmtNum(cc.total_os)),
                      h('td', { className: 'px-3 py-2 text-right' }, fmtNum(cc.total_entregas)),
                      h('td', { className: 'px-3 py-2 text-right' }, fmtNum(cc.retornos)),
                      h('td', { className: 'px-3 py-2 text-right whitespace-nowrap' },
                        fmtNum(cc.dentro_prazo),
                        ' ',
                        h('span', { className: 'text-xs', style: { color: '#166534' } },
                          cc.taxa_prazo != null ? Number(cc.taxa_prazo).toFixed(1) + '%' : '')
                      ),
                      h('td', { className: 'px-3 py-2 text-right' }, fmtNum(cc.fora_prazo)),
                      h('td', { className: 'px-3 py-2 text-right' }, fmtMin(cc.tempo_medio)),
                      h('td', { className: 'px-3 py-2 text-right' }, fmtNum(cc.total_profissionais)),
                      h('td', { className: 'px-3 py-2 text-right text-gray-400' }, '—'),
                      h('td', { className: 'px-3 py-2 text-right text-gray-400' }, '')
                    )
                  );
                  return [linhaCli, ...filhas];
                })
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
    const [busca_, setBusca] = useState('');
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
      const q = (busca_ || '').toLowerCase().trim();
      if (q) {
        fonte = fonte.filter(p =>
          String(p.nome_prof || '').toLowerCase().includes(q) ||
          String(p.cod_prof || '').includes(q)
        );
      }
      return [...fonte].sort((a, b) => (Number(b[ordem]) || 0) - (Number(a[ordem]) || 0));
    }, [dados, busca_, ordem]);

    if (erro) {
      return estadoErro('Não foi possível carregar os profissionais (' + erro + '). Tente de novo em instantes.');
    }

    return h('section', { className: CARD + ' overflow-hidden' },
      cabecalhoCard('Por profissional', `${linhas.length} profissionais`,
        h('div', { className: 'flex gap-2 flex-wrap' },
          busca(busca_, setBusca, 'Buscar nome ou código'),
          h('select', {
            value: ordem, onChange: (e) => setOrdem(e.target.value), 'aria-label': 'Ordenar por',
            className: 'h-[34px] px-2 border border-gray-200 rounded-[10px] bg-white text-[13px]'
          },
            h('option', { value: 'total_entregas' }, 'Mais entregas'),
            h('option', { value: 'taxa_prazo' }, 'Maior % prazo'),
            h('option', { value: 'retornos' }, 'Mais retornos'),
            h('option', { value: 'km_total' }, 'Maior KM')
          )
        )),
      h('div', { className: 'overflow-x-auto' },
        h('table', { className: 'w-full text-[13px]', style: { minWidth: 960, borderCollapse: 'collapse' } },
          h('thead', null,
            h('tr', { className: 'bg-gray-50' },
              h('th', { className: TH + ' text-left' }, 'Profissional'),
              h('th', { className: TH + ' text-right' }, 'OS'),
              h('th', { className: TH + ' text-right' }, 'Entregas'),
              h('th', { className: TH + ' text-right' }, 'No prazo'),
              h('th', { className: TH + ' text-right' }, 'Fora do prazo'),
              h('th', { className: TH + ' text-right' }, '% prazo'),
              h('th', { className: TH + ' text-right' }, 'Retornos'),
              h('th', { className: TH + ' text-right' }, 'Tempo médio'),
              h('th', { className: TH + ' text-right' }, 'KM total'),
              h('th', { className: TH + ' text-right' }, 'Clientes')
            )
          ),
          h('tbody', { className: 'tabular-nums' },
            loading ?
              h('tr', null, h('td', { colSpan: 10, className: 'p-6 text-center text-gray-500 border-t border-gray-100' }, 'Carregando...'))
            : linhas.length === 0 ?
              h('tr', null, h('td', { colSpan: 10, className: 'p-6 text-center text-gray-500 border-t border-gray-100' }, busca_ ? 'Nenhum profissional para essa busca.' : 'Nenhum profissional encontrado no período.'))
            : linhas.map(p =>
                h('tr', { key: p.cod_prof, className: 'border-t border-gray-100 hover:bg-gray-50' },
                  h('td', { className: TD },
                    h('div', { className: 'flex items-center gap-2.5' },
                      h('div', {
                        'aria-hidden': 'true',
                        className: 'w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0',
                        style: { background: '#f3e8fb', color: '#5d0b85' }
                      }, iniciaisDe(p.nome_prof)),
                      h('div', { className: 'min-w-0' },
                        h('div', { className: 'text-gray-900 font-semibold leading-tight truncate' }, p.nome_prof || '—'),
                        h('div', { className: 'text-xs text-gray-500' }, 'Cód. ' + p.cod_prof)
                      )
                    )
                  ),
                  h('td', { className: TD + ' text-right' }, fmtNum(p.total_os)),
                  h('td', { className: TD + ' text-right font-semibold text-gray-900' }, fmtNum(p.total_entregas)),
                  h('td', { className: TD + ' text-right' }, fmtNum(p.dentro_prazo)),
                  h('td', { className: TD + ' text-right' }, fmtNum(p.fora_prazo)),
                  h('td', { className: TD + ' text-right' }, pillPct(p.taxa_prazo)),
                  h('td', { className: TD + ' text-right' }, fmtNum(p.retornos)),
                  h('td', { className: TD + ' text-right' }, fmtMin(p.tempo_medio)),
                  h('td', { className: TD + ' text-right whitespace-nowrap' },
                    p.km_total != null ? Number(p.km_total).toFixed(1) + ' km' : '—'),
                  h('td', { className: TD + ' text-right' }, fmtNum(p.total_clientes))
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
      return estadoErro('Não foi possível carregar as regiões (' + erro + '). Tente de novo em instantes.');
    }

    const regioes = dados?.regioes || [];
    const totalEntregas = regioes.reduce((s, r) => s + (r.total_entregas || 0), 0);

    return h('section', { className: CARD + ' overflow-hidden' },
      cabecalhoCard('Por região', `${regioes.length} regiões · ${fmtNum(totalEntregas)} entregas no total`),
      h('div', { className: 'overflow-x-auto' },
        h('table', { className: 'w-full text-[13px]', style: { minWidth: 960, borderCollapse: 'collapse' } },
          h('thead', null,
            h('tr', { className: 'bg-gray-50' },
              h('th', { className: TH + ' text-left' }, 'Região'),
              h('th', { className: TH + ' text-right' }, 'OS'),
              h('th', { className: TH + ' text-right' }, 'Entregas'),
              h('th', { className: TH + ' text-right' }, 'No prazo'),
              h('th', { className: TH + ' text-right' }, 'Fora do prazo'),
              h('th', { className: TH + ' text-right' }, '% prazo'),
              h('th', { className: TH + ' text-right' }, 'Tempo médio'),
              h('th', { className: TH + ' text-right' }, 'Profissionais'),
              h('th', { className: TH + ' text-right' }, 'Clientes'),
              h('th', { className: TH + ' text-right' }, 'Retornos')
            )
          ),
          h('tbody', { className: 'tabular-nums' },
            loading ?
              h('tr', null, h('td', { colSpan: 10, className: 'p-6 text-center text-gray-500 border-t border-gray-100' }, 'Carregando...'))
            : regioes.length === 0 ?
              h('tr', null, h('td', { colSpan: 10, className: 'p-6 text-center text-gray-500 border-t border-gray-100' }, 'Nenhuma região com dados no período.'))
            : regioes.map(r => {
                const pctTotal = totalEntregas > 0 ? (100 * r.total_entregas / totalEntregas) : 0;
                return h('tr', { key: r.regiao, className: 'border-t border-gray-100 hover:bg-gray-50' },
                  h('td', { className: TD },
                    h('div', { className: 'flex items-center gap-2' },
                      ico(r.regiao === 'Sem Região' ? 'help' : 'pin', 14, { color: '#9ca3af' }),
                      h('div', null,
                        h('div', { className: 'text-gray-900 font-semibold' }, r.regiao),
                        h('div', { className: 'mt-1 h-1 bg-gray-100 rounded-full overflow-hidden w-32', title: pctTotal.toFixed(1) + '% das entregas' },
                          h('div', {
                            className: 'h-full rounded-full',
                            style: { width: pctTotal + '%', background: '#770fa8' }
                          })
                        )
                      )
                    )
                  ),
                  h('td', { className: TD + ' text-right' }, fmtNum(r.total_os)),
                  h('td', { className: TD + ' text-right font-semibold text-gray-900' }, fmtNum(r.total_entregas)),
                  h('td', { className: TD + ' text-right' }, fmtNum(r.dentro_prazo)),
                  h('td', { className: TD + ' text-right' }, fmtNum(r.fora_prazo)),
                  h('td', { className: TD + ' text-right' }, pillPct(r.taxa_prazo)),
                  h('td', { className: TD + ' text-right' }, fmtMin(r.tempo_medio)),
                  h('td', { className: TD + ' text-right' }, fmtNum(r.total_profissionais)),
                  h('td', { className: TD + ' text-right' }, fmtNum(r.total_clientes)),
                  h('td', { className: TD + ' text-right' }, fmtNum(r.retornos))
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
      return estadoErro('Não foi possível carregar a distribuição por hora (' + erro + '). Tente de novo em instantes.');
    }

    const horas = dados?.horas || [];
    const resumo = dados?.resumo || {};
    const maxOs = Math.max(...horas.map(h => h.total_os || 0), 1);

    return h('div', { className: 'flex flex-col gap-4' },
      h(FaixaKpis, { rotulo: 'Resumo por hora', itens: [
        { label: 'Horário de pico', valor: loading ? '—' : (resumo.hora_pico != null ? String(resumo.hora_pico).padStart(2, '0') + ':00' : '—'), sub: loading ? '' : fmtNum(resumo.os_hora_pico) + ' OS' },
        { label: 'OS no pico (8h–18h)', valor: loading ? '—' : fmtNum(resumo.os_pico), sub: loading ? '' : (resumo.pct_pico != null ? resumo.pct_pico.toFixed(1) + '% do total' : '') },
        { label: 'Média por hora (pico)', valor: loading ? '—' : fmtNum(resumo.media_por_hora_pico), sub: 'OS por hora' },
        { label: 'Fora do pico', valor: loading ? '—' : fmtNum(resumo.os_fora_pico), sub: loading ? '' : (resumo.pct_fora_pico != null ? resumo.pct_fora_pico.toFixed(1) + '% do total' : '') }
      ] }),
      h('section', { className: CARD },
        cabecalhoCard('Acompanhamento hora a hora', fmtNum(resumo.total_os) + ' OS no período' + (resumo.pct_pico != null ? ' · ' + resumo.pct_pico.toFixed(1) + '% entre 8h e 18h' : ''),
          h('div', { className: 'flex items-center gap-4 text-xs text-gray-500' },
            h('span', { className: 'inline-flex items-center gap-1.5' }, h('span', { style: { width: 10, height: 10, borderRadius: 3, background: '#770fa8' } }), 'Pico (8h–18h)'),
            h('span', { className: 'inline-flex items-center gap-1.5' }, h('span', { style: { width: 10, height: 10, borderRadius: 3, background: '#d1d5db' } }), 'Fora do pico'))),
        loading ?
          h('div', { className: 'h-72 flex items-center justify-center text-gray-500 text-[13px]' }, 'Carregando...')
        : h('div', { className: 'px-4 py-3 overflow-x-auto' },
            h('svg', { viewBox: '0 0 760 260', width: '100%', height: 260, style: { minWidth: 600 }, role: 'img', 'aria-label': 'OS por hora do dia' },
              // grid
              [0, 0.25, 0.5, 0.75, 1].map(p => {
                const y = 30 + (200 - 200 * p);
                return h('g', { key: 'g' + p },
                  h('line', { x1: 40, y1: y, x2: 740, y2: y, stroke: '#f3f4f6', strokeWidth: 1 }),
                  h('text', { x: 36, y: y + 3, textAnchor: 'end', fontSize: 10, fill: '#6b7280' },
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
                    fill: noPico ? '#770fa8' : '#d1d5db', rx: 3
                  }),
                  hh.total_os > 0 ? h('text', {
                    x: x + 11, y: y - 4, textAnchor: 'middle',
                    fontSize: 9.5, fill: '#374151', fontWeight: 500
                  }, hh.total_os) : null,
                  h('text', {
                    x: x + 11, y: 248, textAnchor: 'middle',
                    fontSize: 10, fill: '#6b7280'
                  }, String(i).padStart(2, '0') + 'h')
                );
              })
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

    const ABAS = [
      { id: 'dashboard',    label: 'Dashboard' },
      { id: 'profissional', label: 'Por profissional' },
      { id: 'regiao',       label: 'Por região' },
      { id: 'hora',         label: 'Hora a hora' }
    ];

    return h('div', { className: 'min-h-screen', style: { background: '#f9fafb', color: '#111827' } },
      // Navbar global do app (mesma de todos os módulos)
      HeaderCompacto ? h(HeaderCompacto, {
        usuario, moduloAtivo, abaAtiva, socialProfile, isLoading, lastUpdate,
        onRefresh, onLogout, onGoHome, onNavigate, onChangeTab
      }) : null,

      h('div', { className: 'px-4 md:px-5 pt-5 pb-8 max-w-[1600px] mx-auto flex flex-col gap-4' },
        // Cabeçalho da página
        h('div', { className: 'flex flex-wrap items-end justify-between gap-3' },
          h('div', { className: 'min-w-0' },
            h('h1', { style: { margin: 0, fontFamily: 'Sora, Inter, sans-serif', fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em', color: '#111827' } }, 'BI Monitoramento'),
            h('p', { style: { margin: '4px 0 0', fontSize: 13, color: '#6b7280' } },
              'Visão operacional sem dados financeiros · ',
              info.ultima_data ? `dados até ${fmtDataBr(info.ultima_data)}` : 'carregando...')
          ),
          h('div', { className: 'flex items-center gap-2 flex-wrap min-w-0' },
            filtrosResumo.length > 0 ?
              h('div', { className: 'text-[13px] text-gray-600 truncate', style: { maxWidth: 420 }, title: filtrosResumo.join(' · ') },
                filtrosResumo.join(' · '))
              : null,
            h('button', {
              type: 'button',
              className: BTN_SEC,
              onClick: () => setFiltrosAbertos(true)
            }, ico('filter', 15), 'Filtros')
          )
        ),

        // Abas internas
        h('div', { role: 'tablist', 'aria-label': 'Visões do BI Monitoramento', className: 'flex gap-1 border-b border-gray-200 overflow-x-auto' },
          ABAS.map(t =>
            h('button', {
              key: t.id,
              type: 'button',
              role: 'tab',
              'aria-selected': aba === t.id,
              onClick: () => setAba(t.id),
              className: 'px-3 py-2.5 text-[13px] border-b-2 -mb-px whitespace-nowrap transition-colors ' +
                (aba === t.id
                  ? 'font-semibold text-purple-800 border-purple-700'
                  : 'font-medium border-transparent text-gray-500 hover:text-gray-800')
            }, t.label)
          )
        ),

        // Conteúdo
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
  console.log('[bi-monitoramento] window.ModuloBiMonitoramento registrado');
})();
