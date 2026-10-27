/* UI_UNIFICADO_V1: emojis -> sprite de icones; cores na paleta unica (CORES_TOKENS_V1). */
/* BI_ICONS_V1 */
/* BI_ABAS_V1: Acompanhamento periódico no padrão clean — título de seção 15px, segmentados,
   faixa única de KPIs, tabela com cabeçalho #f9fafb e total em cinza claro, modal branco.
   Lógica, catálogo de métricas (paleta categórica) e chamadas inalterados. */
/**
 * BI · Acompanhamento Periódico
 *
 * Componente isolado renderizado na aba Dashboard do BI, ACIMA do mapa de calor.
 * Mostra:
 *   - 3 KPIs: Total Entregas · % No Prazo · Qtd Retornos
 *   - Toggle granularidade (Diário/Semanal/Mensal) + Toggle eixo (Por Cliente/Por Período)
 *   - Gráfico SVG simples de evolução (entregas + % no prazo)
 *   - Tabela compacta com drilldown modal
 *
 * Recebe via props:
 *   - apiUrl: prefixo da API
 *   - fetchAuth: função autenticada
 *   - filtros: { data_inicio, data_fim, cod_cliente, centro_custo } — sincroniza com filtros do dashboard
 *
 * Registra-se como window.AcompanhamentoPeriodico — o app.js renderiza com:
 *   React.createElement(window.AcompanhamentoPeriodico, { apiUrl, fetchAuth, filtros })
 */
(function () {
    if (!window.React) { console.warn('AcompanhamentoPeriodico: React não disponível'); return; }
    const h = React.createElement;
    const { useState, useEffect, useRef, useMemo } = React;

    function fmtMinTime(min) {
        if (!min || min < 0) return '-';
        const h = Math.floor(min / 60);
        const m = Math.floor(min % 60);
        const s = Math.floor((min - Math.floor(min)) * 60);
        return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }
    function fmtMoneyShort(v) {
        if (!v) return 'R$ 0';
        if (v >= 1000000) return 'R$ ' + (v / 1000000).toFixed(1) + 'M';
        if (v >= 1000) return 'R$ ' + (v / 1000).toFixed(1) + 'k';
        return 'R$ ' + v.toFixed(2);
    }
    function fmtMoney(v) {
        return 'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    // 🚀 2026-05 v6: parser de data ISO que IGNORA timezone (PostgreSQL retorna '2026-04-05',
    // JS interpreta como UTC e em UTC-3 vira sábado 21:00 → bug crítico nos S/D do gráfico).
    // Aqui montamos a Date manualmente com componentes Y/M/D pra ela ficar em local time.
    function parseDataLocal(iso) {
        if (!iso) return null;
        const s = String(iso);
        // Aceita '2026-04-05' ou '2026-04-05T00:00:00.000Z' — pega só YYYY-MM-DD
        const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!match) return new Date(iso); // fallback
        const [_, y, m, d] = match;
        return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    }

    function fmtData(iso, granu) {
        if (!iso) return '';
        const d = parseDataLocal(iso);
        if (!d) return '';
        if (granu === 'mes') return d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
        if (granu === 'semana') return 'sem ' + d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }

    // BI_ABAS_V1: helpers visuais
    function seg(ativo) {
        return 'px-3 h-[28px] rounded-lg text-xs transition-colors border ' + (ativo ? 'bg-white border-gray-200 font-semibold text-purple-800' : 'border-transparent font-medium text-gray-600 hover:text-gray-900');
    }
    function icoA(nome, sz, extra) {
        return h('svg', { className: 'ico', style: Object.assign({ width: sz || 14, height: sz || 14, flexShrink: 0 }, extra || {}), 'aria-hidden': 'true' }, h('use', { href: '#i-' + nome }));
    }
    function pctPill(v, txt) {
        const t = v >= 80 ? ['#f0fdf4', '#166534', '#16a34a'] : v >= 60 ? ['#fffbeb', '#92400e', '#d97706'] : ['#fef2f2', '#991b1b', '#dc2626'];
        return h('span', { className: 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold', style: { background: t[0], color: t[1] } },
            h('span', { style: { width: 6, height: 6, borderRadius: 999, background: t[2] } }), txt);
    }
    const thCls = 'text-xs font-semibold text-gray-500 px-3 py-2.5 whitespace-nowrap';

    // Catálogo de métricas plotáveis no gráfico.
    // Cada uma tem: chave da serie, label, cor, escala (0-100 ou auto), formatação.
    const METRICAS_CATALOGO = [
        { id: 'total_os',         label: 'OS',                cor: '#770fa8', escala: 'auto', fmt: v => Math.round(v).toLocaleString('pt-BR') },
        { id: 'total_entregas',   label: 'Entregas',          cor: '#2563eb', escala: 'auto', fmt: v => Math.round(v).toLocaleString('pt-BR') },
        { id: 'no_prazo',         label: 'No Prazo',          cor: '#16a34a', escala: 'auto', fmt: v => Math.round(v).toLocaleString('pt-BR') },
        { id: 'fora_prazo',       label: 'Fora Prazo',        cor: '#d97706', escala: 'auto', fmt: v => Math.round(v).toLocaleString('pt-BR') },
        { id: 'pct_prazo',        label: '% No Prazo',        cor: '#16a34a', escala: 'pct',  fmt: v => v.toFixed(1) + '%' },
        { id: 'retornos',         label: 'Retornos',          cor: '#dc2626', escala: 'auto', fmt: v => Math.round(v).toLocaleString('pt-BR') },
        { id: 'valor_total',      label: 'Valor Total',       cor: '#c084e6', escala: 'auto', fmt: v => fmtMoneyShort(v) },
        { id: 'valor_prof',       label: 'Valor Prof.',       cor: '#c084e6', escala: 'auto', fmt: v => fmtMoneyShort(v) },
        { id: 'fat_total',        label: 'Fat. Total',        cor: '#166534', escala: 'auto', fmt: v => fmtMoneyShort(v) },
        { id: 'ticket_medio',     label: 'Ticket Médio',      cor: '#f67602', escala: 'auto', fmt: v => 'R$ ' + (v || 0).toFixed(2) },
        { id: 'tempo_medio_min',  label: 'Tempo Médio Entrega',   cor: '#6b7280', escala: 'auto', fmt: v => fmtMinTime(v) },
        // BI_TEMPOS_SERIE_V1: mediana = tempo da entrega "típica" (a média sobe com poucas corridas que viram o dia)
        { id: 'tempo_mediano_min', label: 'Tempo Mediano Entrega', cor: '#0f766e', escala: 'auto', fmt: v => fmtMinTime(v) },
        // BI_TEMPOS_SERIE_V1: medidos no ponto 1 — alocação = criação → alocado; coleta = alocado → chegada na coleta
        { id: 'tempo_alocacao_min', label: 'Tempo Médio Alocação', cor: '#374151', escala: 'auto', fmt: v => fmtMinTime(v) },
        { id: 'tempo_coleta_min', label: 'Tempo Médio Coleta',    cor: '#64748b', escala: 'auto', fmt: v => fmtMinTime(v) },
        { id: 'total_entregadores', label: 'Total Entregadores',  cor: '#1e40af', escala: 'auto', fmt: v => Math.round(v).toLocaleString('pt-BR') },
        { id: 'media_ent_prof',   label: 'Média Ent./Profissional', cor: '#1e40af', escala: 'auto', fmt: v => v.toFixed(1) },
    ];

    function AcompanhamentoPeriodico({ apiUrl, fetchAuth, filtros }) {
        const [granu, setGranu] = useState('dia');
        const [eixo, setEixo] = useState('cliente'); // 'cliente' | 'periodo'
        // 🚀 2026-05: métricas plotáveis selecionáveis (default: entregas + % prazo)
        const [metricasSelecionadas, setMetricasSelecionadas] = useState(['total_entregas', 'pct_prazo']);
        const [dropdownMetricas, setDropdownMetricas] = useState(false);
        const dropdownRef = useRef(null);

        // Fecha dropdown ao clicar fora
        useEffect(() => {
            if (!dropdownMetricas) return;
            const onClick = (e) => {
                if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                    setDropdownMetricas(false);
                }
            };
            document.addEventListener('mousedown', onClick);
            return () => document.removeEventListener('mousedown', onClick);
        }, [dropdownMetricas]);
        const [busca, setBusca] = useState('');
        const [ordem, setOrdem] = useState('total_entregas');
        const [dados, setDados] = useState(null);
        const [loading, setLoading] = useState(true);
        const [erro, setErro] = useState(null);
        const [drilldown, setDrilldown] = useState(null); // cliente selecionado pro modal

        const fetchAuthRef = useRef(fetchAuth);
        useEffect(() => { fetchAuthRef.current = fetchAuth; }, [fetchAuth]);

        // Carrega quando granularidade ou filtros mudam
        useEffect(() => {
            let cancelado = false;
            (async () => {
                setLoading(true); setErro(null);
                try {
                    const params = new URLSearchParams();
                    params.set('granularidade', granu);
                    if (filtros?.data_inicio) params.set('data_inicio', filtros.data_inicio);
                    if (filtros?.data_fim) params.set('data_fim', filtros.data_fim);
                    if (filtros?.cod_cliente) params.set('cod_cliente', filtros.cod_cliente);
                    if (filtros?.centro_custo) params.set('centro_custo', filtros.centro_custo);
                    if (filtros?.clientes_sem_filtro_cc) params.set('clientes_sem_filtro_cc', filtros.clientes_sem_filtro_cc);
                    if (filtros?.categoria) params.set('categoria', filtros.categoria);
                    if (filtros?.cidade) params.set('cidade', filtros.cidade);
                    if (filtros?.status_prazo) params.set('status_prazo', filtros.status_prazo);
                    if (filtros?.status_retorno) params.set('status_retorno', filtros.status_retorno);
                    const r = await fetchAuthRef.current(apiUrl + '/bi/serie-temporal?' + params.toString());
                    if (!r.ok) throw new Error('HTTP ' + r.status);
                    const j = await r.json();
                    if (!cancelado) setDados(j);
                } catch (e) {
                    if (!cancelado) setErro(e.message || 'erro');
                } finally {
                    if (!cancelado) setLoading(false);
                }
            })();
            return () => { cancelado = true; };
        }, [
            apiUrl, granu,
            filtros?.data_inicio, filtros?.data_fim,
            filtros?.cod_cliente, filtros?.centro_custo, filtros?.clientes_sem_filtro_cc,
            filtros?.categoria, filtros?.cidade,
            filtros?.status_prazo, filtros?.status_retorno
        ]);

        // Linhas filtradas+ordenadas pra tabela
        const linhas = useMemo(() => {
            if (!dados) return [];
            const fonte = eixo === 'cliente' ? (dados.porCliente || []) : (dados.serie || []);
            const q = (busca || '').toLowerCase().trim();
            const filtradas = q ? fonte.filter(l => {
                if (eixo === 'cliente') {
                    return String(l.nome_cliente || '').toLowerCase().includes(q) ||
                        String(l.cod_cliente || '').includes(q);
                }
                return fmtData(l.periodo, granu).toLowerCase().includes(q);
            }) : fonte;
            return [...filtradas].sort((a, b) => (b[ordem] || 0) - (a[ordem] || 0));
        }, [dados, eixo, busca, ordem, granu]);

        // Totais da tabela (footer)
        const totais = useMemo(() => {
            const total = linhas.reduce((s, l) => s + (l.total_entregas || 0), 0);
            const noPrazo = linhas.reduce((s, l) => s + (l.no_prazo || 0), 0);
            const faturamento = linhas.reduce((s, l) => s + (l.faturamento || l.valor_total || 0), 0);
            return {
                total_entregas: total,
                pct_prazo: total > 0 ? (noPrazo / total * 100) : 0,
                faturamento,
            };
        }, [linhas]);

        // ====== RENDER ======

        // Container externo
        return h('section', { 'data-bi-acomp': '1', 'aria-labelledby': 'acomp-titulo', className: 'mb-6 flex flex-col gap-3' },
            // HEADER: título + toggles
            h('div', { className: 'flex items-end justify-between gap-3 flex-wrap' },
                h('div', null,
                    h('h2', { id: 'acomp-titulo', className: 'text-[15px] font-semibold text-gray-900', style: { margin: 0 } }, 'Acompanhamento periódico'),
                    h('div', { className: 'text-[13px] text-gray-500 mt-0.5' },
                        loading ? 'Carregando...' :
                        erro ? ('Não foi possível carregar (' + erro + ')') :
                        (dados ? (dados.serie?.length || 0) + ' ' + (granu === 'dia' ? 'dia(s)' : granu === 'semana' ? 'semana(s)' : 'mês(es)') + ' · ' + (dados.porCliente?.length || 0) + ' clientes' : '')
                    )
                ),
                h('div', { className: 'flex gap-2 items-center flex-wrap' },
                    // Granularidade
                    h('div', { role: 'group', 'aria-label': 'Granularidade', className: 'inline-flex bg-gray-100 rounded-[10px] p-1 gap-0.5' },
                        ['dia', 'semana', 'mes'].map(g => h('button', {
                            key: g, type: 'button', onClick: () => setGranu(g), 'aria-pressed': granu === g,
                            className: seg(granu === g)
                        }, g === 'dia' ? 'Diário' : g === 'semana' ? 'Semanal' : 'Mensal'))
                    ),
                    // Eixo da tabela
                    h('div', { role: 'group', 'aria-label': 'Agrupar tabela', className: 'inline-flex bg-gray-100 rounded-[10px] p-1 gap-0.5' },
                        h('button', { type: 'button', onClick: () => setEixo('cliente'), 'aria-pressed': eixo === 'cliente', className: seg(eixo === 'cliente') }, 'Por cliente'),
                        h('button', { type: 'button', onClick: () => setEixo('periodo'), 'aria-pressed': eixo === 'periodo', className: seg(eixo === 'periodo') }, 'Por período')
                    )
                )
            ),

            // KPIS — faixa única (Total Entregas, % No Prazo, Qtd Retornos)
            h('div', { className: 'bg-white border border-gray-200 rounded-[14px] overflow-hidden', style: { display: 'flex', flexWrap: 'wrap' } },
                [
                    ['Total de entregas', loading ? '—' : (dados?.kpis?.total_entregas || 0).toLocaleString('pt-BR'), '#111827', 'No período filtrado'],
                    ['No prazo', loading ? '—' : (dados?.kpis?.pct_no_prazo?.toFixed(1) || '0') + '%',
                        !dados ? '#9ca3af' : dados.kpis?.pct_no_prazo >= 80 ? '#166534' : dados.kpis?.pct_no_prazo >= 60 ? '#92400e' : '#991b1b', 'Entregas dentro do prazo'],
                    ['Retornos', loading ? '—' : (dados?.kpis?.qtd_retornos || 0).toLocaleString('pt-BR'), '#111827', 'Quantidade no período']
                ].map((k, i, arr) => h('div', {
                    key: k[0],
                    style: { flex: '1 1 180px', padding: '14px 20px', borderRight: i === arr.length - 1 ? 0 : '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6', marginBottom: -1, minWidth: 0 }
                },
                    h('div', { style: { fontSize: 12, color: '#6b7280' } }, k[0]),
                    h('div', { style: { fontFamily: 'Sora, Inter, sans-serif', fontSize: 24, fontWeight: 700, color: k[2], fontVariantNumeric: 'tabular-nums', lineHeight: 1.25, margin: '2px 0' } }, k[1]),
                    h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, k[3])
                ))
            ),

            // GRÁFICO de evolução (SVG inline simples)
            h('div', { className: 'bg-white border border-gray-200 rounded-[14px] p-4' },
                h('div', { className: 'flex items-center justify-between gap-2 flex-wrap mb-3' },
                    h('div', { className: 'text-[13px] font-semibold text-gray-900' }, 'Evolução por ' + (granu === 'dia' ? 'dia' : granu === 'semana' ? 'semana' : 'mês')),
                    h('div', {
                        ref: dropdownRef,
                        className: 'flex gap-1.5 text-[10px] items-center flex-wrap justify-end',
                        style: { position: 'relative' }
                    },
                        // Badges das métricas ATIVAS (max 4 visíveis, resto "+ N")
                        METRICAS_CATALOGO.filter(m => metricasSelecionadas.includes(m.id)).slice(0, 4).map(m =>
                            h('span', {
                                key: m.id,
                                className: 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-medium border border-gray-200 bg-white text-gray-700'
                            },
                                h('span', {
                                    style: { width: 6, height: 6, borderRadius: 999, background: m.cor, display: 'inline-block' }
                                }),
                                m.label
                            )
                        ),
                        metricasSelecionadas.length > 4 && h('span', {
                            className: 'inline-flex items-center px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600'
                        }, '+' + (metricasSelecionadas.length - 4)),

                        // Botão pra abrir dropdown
                        h('button', {
                            type: 'button',
                            'aria-expanded': dropdownMetricas,
                            onClick: () => setDropdownMetricas(prev => !prev),
                            className: 'inline-flex items-center gap-1.5 h-8 px-3 rounded-[10px] text-xs font-semibold border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-colors'
                        },
                            icoA('settings', 14), 'Métricas (' + metricasSelecionadas.length + '/' + METRICAS_CATALOGO.length + ')'
                        ),

                        // Dropdown com checkboxes
                        dropdownMetricas && h('div', {
                            style: {
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: 6,
                                background: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: 12,
                                padding: 8,
                                width: 240,
                                maxHeight: 360,
                                overflowY: 'auto',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                                zIndex: 50
                            }
                        },
                            h('div', { className: 'flex items-center justify-between px-1 pb-2 mb-1 border-b border-gray-100' },
                                h('span', { className: 'text-xs font-semibold text-gray-700' }, 'Métricas no gráfico'),
                                h('button', {
                                    type: 'button',
                                    onClick: () => setMetricasSelecionadas(['total_entregas']),
                                    className: 'text-xs font-semibold text-gray-500 hover:text-purple-800'
                                }, 'Limpar')
                            ),
                            METRICAS_CATALOGO.map(m => {
                                const ativo = metricasSelecionadas.includes(m.id);
                                return h('label', {
                                    key: m.id,
                                    className: 'flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer text-[12px]'
                                },
                                    h('input', {
                                        type: 'checkbox',
                                        checked: ativo,
                                        onChange: () => setMetricasSelecionadas(prev =>
                                            prev.includes(m.id)
                                                ? (prev.length > 1 ? prev.filter(x => x !== m.id) : prev)
                                                : [...prev, m.id]
                                        ),
                                        className: 'w-3.5 h-3.5', style: { accentColor: '#770fa8' }
                                    }),
                                    h('span', {
                                        style: { width: 8, height: 8, borderRadius: 999, background: m.cor, display: 'inline-block', flexShrink: 0 }
                                    }),
                                    h('span', { className: 'text-gray-800 flex-1', style: { fontWeight: 400 } }, m.label)
                                );
                            })
                        )
                    )
                ),
                loading ? h('div', { className: 'text-center py-8 text-gray-500 text-[13px]' }, 'Carregando...') :
                (!dados?.serie || dados.serie.length === 0) ? h('div', { className: 'text-center py-8 text-gray-500 text-[13px]' }, 'Sem dados no período. Ajuste os filtros do dashboard.') :
                h(MiniChart, {
                    serie: dados.serie,
                    granu,
                    metricas: METRICAS_CATALOGO.filter(m => metricasSelecionadas.includes(m.id))
                })
            ),

            // 🚀 2026-05 v4: TABELA com colunas dinâmicas (segue métricas selecionadas)
            // + pivot Cliente × Período quando granu=semana/mes e eixo=cliente
            (() => {
                const metricasAtivas = METRICAS_CATALOGO.filter(m => metricasSelecionadas.includes(m.id));
                const podePivotar = eixo === 'cliente' && granu !== 'dia' && dados?.porClientePeriodo?.length > 0;

                if (podePivotar) {
                    // PIVOT: linha = cliente, colunas = períodos (1 métrica principal mostrada)
                    return h(TabelaPivotada, {
                        rows: dados.porClientePeriodo,
                        granu,
                        metricaPrincipal: metricasAtivas[0],
                        busca, setBusca, ordem, setOrdem,
                        onDrilldown: (cli) => setDrilldown(cli)
                    });
                }

                return h('div', { className: 'bg-white border border-gray-200 rounded-[14px] overflow-hidden' },
                    h('div', { className: 'flex items-center justify-between px-4 py-3 border-b border-gray-100 gap-2 flex-wrap' },
                        h('div', { className: 'text-[13px] font-semibold text-gray-900' },
                            eixo === 'cliente' ? 'Por cliente · ' + (linhas.length || 0) + ' resultado(s)'
                                                : 'Por período · ' + (linhas.length || 0) + ' resultado(s)'
                        ),
                        h('div', { className: 'flex gap-2 items-center flex-wrap' },
                            h('div', { className: 'relative' },
                                icoA('search', 14, { position: 'absolute', left: 10, top: 10, color: '#9ca3af' }),
                                h('input', {
                                    type: 'text', value: busca, 'aria-label': eixo === 'cliente' ? 'Buscar cliente' : 'Buscar período',
                                    placeholder: eixo === 'cliente' ? 'Buscar cliente' : 'Buscar período',
                                    onChange: e => setBusca(e.target.value),
                                    className: 'text-[13px] h-[34px] pl-8 pr-3 border border-gray-200 rounded-[10px] w-48 bg-white'
                                })
                            ),
                            h('select', {
                                value: ordem, onChange: e => setOrdem(e.target.value), 'aria-label': 'Ordenar por',
                                className: 'text-[13px] h-[34px] px-2 border border-gray-200 rounded-[10px] bg-white'
                            },
                                metricasAtivas.map(m => h('option', {
                                    key: m.id, value: m.id
                                }, 'Ordenar: ' + m.label + ' ↓'))
                            )
                        )
                    ),
                    loading ? h('div', { className: 'text-center py-10 text-gray-500 text-[13px]' }, 'Carregando...') :
                    linhas.length === 0 ? h('div', { className: 'text-center py-10 text-gray-500 text-[13px]' }, busca ? 'Nenhum resultado para essa busca.' : 'Nenhum resultado') :
                    h('div', { className: 'overflow-x-auto relative' },
                        h('table', { className: 'w-full text-sm' },
                            h('thead', { className: 'bg-gray-50' },
                                h('tr', null,
                                    h('th', {
                                        className: 'text-left ' + thCls + ' sticky left-0 bg-gray-50 z-10'
                                    }, eixo === 'cliente' ? 'Cliente' : 'Período'),
                                    metricasAtivas.map(m => h('th', {
                                        key: m.id,
                                        className: 'text-right ' + thCls
                                    }, m.label)),
                                    eixo === 'cliente' && h('th', {
                                        className: 'w-8 ' + thCls
                                    }, h('span', { className: 'sr-only' }, 'Detalhar'))
                                )
                            ),
                            h('tbody', null,
                                linhas.map((l, i) => {
                                    const onClick = eixo === 'cliente' ? () => setDrilldown(l) : null;
                                    return h('tr', {
                                        key: eixo === 'cliente' ? l.cod_cliente : l.periodo,
                                        onClick,
                                        className: 'border-t border-gray-100 ' + (onClick ? 'cursor-pointer hover:bg-gray-50' : '')
                                    },
                                        h('td', { className: 'px-3 py-2.5 sticky left-0 bg-white z-10' },
                                            eixo === 'cliente'
                                                ? h('div', null,
                                                    h('div', { className: 'font-medium text-gray-900' }, l.nome_cliente),
                                                    h('div', { className: 'text-xs text-gray-500' }, 'Cód. ' + l.cod_cliente)
                                                )
                                                : h('div', { className: 'font-medium text-gray-900' }, fmtData(l.periodo, granu))
                                        ),
                                        metricasAtivas.map(m => {
                                            const v = l[m.id] || 0;
                                            // % prazo recebe pill colorida
                                            if (m.id === 'pct_prazo') {
                                                return h('td', { key: m.id, className: 'px-3 py-2.5 text-right' }, pctPill(v, m.fmt(v)));
                                            }
                                            return h('td', {
                                                key: m.id,
                                                className: 'px-3 py-2.5 text-right whitespace-nowrap tabular-nums text-gray-900'
                                            }, m.fmt(v));
                                        }),
                                        eixo === 'cliente' && h('td', { className: 'px-3 py-2.5 text-center text-gray-400' }, icoA('arrowright', 14))
                                    );
                                }),
                                // Linha total (footer)
                                h('tr', { className: 'bg-gray-50 text-gray-900 border-t border-gray-200' },
                                    h('td', { className: 'px-3 py-2.5 font-semibold sticky left-0 bg-gray-50 z-10' },
                                        'Total · ' + linhas.length + (eixo === 'cliente' ? ' clientes' : ' períodos')
                                    ),
                                    metricasAtivas.map(m => {
                                        // Métricas % e médias: recalcula o total como média ponderada quando faz sentido,
                                        // se não, soma direto.
                                        let v;
                                        if (m.id === 'pct_prazo') {
                                            const totEnt = linhas.reduce((s, l) => s + (l.total_entregas || 0), 0);
                                            const totNoPrazo = linhas.reduce((s, l) => s + (l.no_prazo || 0), 0);
                                            v = totEnt > 0 ? (totNoPrazo / totEnt * 100) : 0;
                                        } else if (m.id.startsWith('tempo_') || m.id === 'media_ent_prof' || m.id === 'ticket_medio') {
                                            // Médias — calcula média ponderada simples
                                            const totEnt = linhas.reduce((s, l) => s + (l.total_entregas || 0), 0);
                                            const totWeighted = linhas.reduce((s, l) => s + ((l[m.id] || 0) * (l.total_entregas || 0)), 0);
                                            v = totEnt > 0 ? (totWeighted / totEnt) : 0;
                                        } else {
                                            v = linhas.reduce((s, l) => s + (l[m.id] || 0), 0);
                                        }
                                        return h('td', {
                                            key: m.id,
                                            className: 'px-3 py-2.5 text-right font-semibold whitespace-nowrap tabular-nums'
                                        }, m.fmt(v));
                                    }),
                                    eixo === 'cliente' && h('td', { className: 'px-3 py-2.5' })
                                )
                            )
                        )
                    )
                );
            })(),

            // Modal drilldown (só pra eixo=cliente)
            drilldown && h(DrilldownModal, {
                cliente: drilldown,
                granu,
                onFechar: () => setDrilldown(null)
            })
        );
    }

    // Mini chart SVG dinâmico: renderiza N métricas selecionadas com auto-escala.
    // 🚀 2026-05 v4: largura proporcional aos pontos + TODAS as datas no eixo X com rotação 45° + S/D em vermelho
    function MiniChart({ serie, granu, metricas }) {
        // Largura mínima por ponto pra labels caberem rotacionados
        const MIN_W_POR_PONTO = granu === 'dia' ? 32 : 56;
        const PAD_L = 56, PAD_R = 56, PAD_T = 12, PAD_B = 60; // PAD_B aumentado pros labels rotacionados
        const W = Math.max(700, PAD_L + PAD_R + serie.length * MIN_W_POR_PONTO);
        const H = 220;
        const innerW = W - PAD_L - PAD_R;
        const innerH = H - PAD_T - PAD_B;

        // Separa métricas por escala
        const metricasAuto = metricas.filter(m => m.escala === 'auto');
        const metricasPct = metricas.filter(m => m.escala === 'pct');

        // Max das métricas auto (eixo esquerdo)
        const maxAuto = Math.max(1, ...serie.flatMap(s => metricasAuto.map(m => s[m.id] || 0)));

        const xStep = serie.length > 1 ? innerW / (serie.length - 1) : 0;
        const xAt = (i) => serie.length === 1 ? PAD_L + innerW / 2 : PAD_L + i * xStep;

        const yAt = (m, v) => {
            const max = m.escala === 'pct' ? 100 : maxAuto;
            return PAD_T + (1 - (v || 0) / max) * innerH;
        };

        const [hover, setHover] = useState(null);

        // Helper: identifica sábado/domingo (0=domingo, 6=sábado).
        // Usa parseDataLocal pra evitar shift de timezone (UTC → local).
        const isFimDeSemana = (iso) => {
            if (!iso || granu !== 'dia') return false;
            const d = parseDataLocal(iso);
            if (!d) return false;
            const dow = d.getDay();
            return dow === 0 || dow === 6;
        };

        return h('div', { style: { position: 'relative' } },
            // Container com scroll horizontal quando o gráfico é maior que viewport
            h('div', { style: { overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch' } },
            h('svg', {
                viewBox: '0 0 ' + W + ' ' + H,
                style: { width: W < 700 ? '100%' : W + 'px', height: H + 'px', display: 'block', minWidth: '100%' },
                onMouseLeave: () => setHover(null)
            },
                // 🔴 Faixa de fundo S/D (granularidade=dia apenas)
                // Cada faixa centralizada no ponto correspondente — largura = xStep (1 dia)
                serie.map((s, i) => isFimDeSemana(s.periodo) ? h('rect', {
                    key: 'wkn' + i,
                    x: xAt(i) - (xStep || innerW) / 2,
                    y: PAD_T,
                    width: xStep || innerW, height: innerH,
                    fill: '#fef2f2', opacity: 0.5
                }) : null),

                // gridlines
                [0.25, 0.5, 0.75, 1].map((p, i) => h('line', {
                    key: 'gl' + i,
                    x1: PAD_L, x2: W - PAD_R,
                    y1: PAD_T + p * innerH,
                    y2: PAD_T + p * innerH,
                    stroke: '#e5e7eb', strokeWidth: 1
                })),

                // y-labels esquerdo (auto)
                metricasAuto.length > 0 && [0, 0.5, 1].map((p, i) => h('text', {
                    key: 'yl' + i,
                    x: PAD_L - 4, y: PAD_T + (1 - p) * innerH + 3,
                    fontSize: 9, fill: '#6b7280', textAnchor: 'end'
                }, Math.round(maxAuto * p).toLocaleString('pt-BR'))),

                // y-labels direito (pct)
                metricasPct.length > 0 && [0, 50, 100].map((v, i) => h('text', {
                    key: 'yr' + i,
                    x: W - PAD_R + 4, y: PAD_T + (1 - v / 100) * innerH + 3,
                    fontSize: 9, fill: '#166534', textAnchor: 'start'
                }, v + '%')),

                // hover area
                serie.map((s, i) => h('rect', {
                    key: 'hv' + i,
                    x: xAt(i) - (xStep || innerW) / 2,
                    y: PAD_T,
                    width: xStep || innerW, height: innerH,
                    fill: 'transparent',
                    onMouseEnter: () => setHover({ idx: i, ...s, x: xAt(i) })
                })),

                // hover line vertical
                hover && h('line', {
                    x1: hover.x, x2: hover.x, y1: PAD_T, y2: H - PAD_B,
                    stroke: '#6b7280', strokeWidth: 0.5, strokeDasharray: '2,2'
                }),

                // polylines (apenas se serie tem 2+ pontos)
                serie.length > 1 && metricas.map(m => h('polyline', {
                    key: 'line-' + m.id,
                    fill: 'none',
                    stroke: m.cor,
                    strokeWidth: 2,
                    points: serie.map((s, i) => xAt(i) + ',' + yAt(m, s[m.id])).join(' ')
                })),

                // pontos
                metricas.map(m => serie.map((s, i) => h('circle', {
                    key: 'pt-' + m.id + '-' + i,
                    cx: xAt(i), cy: yAt(m, s[m.id]),
                    r: serie.length === 1 ? 5 : 3,
                    fill: m.cor,
                    stroke: 'white',
                    strokeWidth: 1
                }))).flat(),

                // hover circles maiores
                hover && metricas.map(m => h('circle', {
                    key: 'hov-' + m.id,
                    cx: hover.x, cy: yAt(m, hover[m.id]),
                    r: 5, fill: m.cor
                })),

                // 🚀 x-labels: TODAS as datas, rotacionadas 45°, S/D em vermelho
                // Ancoradas no ponto: ligeiro offset pra direita (+3px) garante que o último
                // caractere da label fique visualmente colado ao tick, evitando ilusão de deslocamento.
                serie.map((s, i) => {
                    const fds = isFimDeSemana(s.periodo);
                    const lx = xAt(i) + 3;
                    const ly = H - PAD_B + 14;
                    return h('text', {
                        key: 'xl' + i,
                        x: lx,
                        y: ly,
                        fontSize: 10,
                        fill: fds ? '#991b1b' : '#374151',
                        fontWeight: fds ? 600 : 400,
                        textAnchor: 'end',
                        transform: 'rotate(-45 ' + lx + ' ' + ly + ')'
                    }, fmtData(s.periodo, granu));
                }),

                // 🔧 Tick vertical curto pra cada ponto — elimina ambiguidade visual
                // entre label rotacionado e posição real do ponto
                serie.map((s, i) => h('line', {
                    key: 'tick' + i,
                    x1: xAt(i), x2: xAt(i),
                    y1: H - PAD_B, y2: H - PAD_B + 4,
                    stroke: isFimDeSemana(s.periodo) ? '#991b1b' : '#9ca3af',
                    strokeWidth: 1
                }))
            )
            ),
            // Tooltip flutuante
            hover && h('div', {
                style: {
                    position: 'absolute',
                    left: ((hover.x / W) * 100) + '%',
                    top: 8,
                    transform: hover.x > W * 0.7 ? 'translateX(-100%)' : (hover.x < W * 0.3 ? 'translateX(0)' : 'translateX(-50%)'),
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: '6px 10px',
                    fontSize: 11,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                }
            },
                h('div', { style: { fontWeight: 600, marginBottom: 4, color: '#111827' } }, fmtData(hover.periodo, granu)),
                metricas.map(m => h('div', {
                    key: 'tt-' + m.id,
                    style: { color: '#374151', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }
                }, h('span', { style: { width: 7, height: 7, borderRadius: 999, background: m.cor } }), m.label + ': ', h('strong', { style: { color: '#111827', fontVariantNumeric: 'tabular-nums' } }, m.fmt(hover[m.id] || 0))))
            )
        );
    }

    // 🚀 2026-05 v4: Tabela pivotada cliente × período (Sem 1, Sem 2... + Total)
    // Usado quando granu=semana/mês e eixo=cliente. Mostra UMA métrica principal.
    function TabelaPivotada({ rows, granu, metricaPrincipal, busca, setBusca, ordem, setOrdem, onDrilldown }) {
        // Agrupa rows por cliente e extrai lista única de períodos (em ordem)
        const { clientes, periodos } = useMemo(() => {
            const map = {};
            const setPer = new Set();
            (rows || []).forEach(r => {
                const k = r.cod_cliente;
                if (!map[k]) {
                    map[k] = { cod_cliente: r.cod_cliente, nome_cliente: r.nome_cliente, total: 0, porPeriodo: {} };
                }
                map[k].porPeriodo[r.periodo] = r;
                setPer.add(r.periodo);
            });
            // total = soma da métrica principal (ou ponderada se for %)
            const m = metricaPrincipal;
            Object.values(map).forEach(c => {
                if (m.id === 'pct_prazo') {
                    let totEnt = 0, totNoPrazo = 0;
                    Object.values(c.porPeriodo).forEach(p => {
                        totEnt += (p.total_entregas || 0);
                        totNoPrazo += (p.no_prazo || 0);
                    });
                    c.total = totEnt > 0 ? (totNoPrazo / totEnt * 100) : 0;
                } else if (m.id.startsWith('tempo_') || m.id === 'media_ent_prof' || m.id === 'ticket_medio') {
                    let totEnt = 0, totW = 0;
                    Object.values(c.porPeriodo).forEach(p => {
                        totEnt += (p.total_entregas || 0);
                        totW += ((p[m.id] || 0) * (p.total_entregas || 0));
                    });
                    c.total = totEnt > 0 ? (totW / totEnt) : 0;
                } else {
                    c.total = Object.values(c.porPeriodo).reduce((s, p) => s + (p[m.id] || 0), 0);
                }
            });
            return {
                clientes: Object.values(map),
                periodos: Array.from(setPer).sort()
            };
        }, [rows, metricaPrincipal]);

        const clientesFiltrados = useMemo(() => {
            const q = (busca || '').toLowerCase().trim();
            const filtrados = q
                ? clientes.filter(c => String(c.nome_cliente || '').toLowerCase().includes(q) || String(c.cod_cliente).includes(q))
                : clientes;
            return [...filtrados].sort((a, b) => (b.total || 0) - (a.total || 0));
        }, [clientes, busca]);

        const m = metricaPrincipal;
        const labelPeriodo = (iso, idx) => granu === 'semana' ? 'Sem ' + (idx + 1) : 'Mês ' + (idx + 1);
        const labelTooltip = (iso) => fmtData(iso, granu);

        return h('div', { className: 'bg-white border border-gray-200 rounded-[14px] overflow-hidden' },
            h('div', { className: 'flex items-center justify-between px-4 py-3 border-b border-gray-100 gap-2 flex-wrap' },
                h('div', { className: 'text-[13px] font-semibold text-gray-900' },
                    'Por cliente × ' + (granu === 'semana' ? 'semana' : 'mês') +
                    ' · ' + clientesFiltrados.length + ' cliente(s) · métrica: ' + m.label
                ),
                h('div', { className: 'flex gap-2 items-center flex-wrap' },
                    h('div', { className: 'relative' },
                        icoA('search', 14, { position: 'absolute', left: 10, top: 10, color: '#9ca3af' }),
                        h('input', {
                            type: 'text', value: busca, 'aria-label': 'Buscar cliente',
                            placeholder: 'Buscar cliente',
                            onChange: e => setBusca(e.target.value),
                            className: 'text-[13px] h-[34px] pl-8 pr-3 border border-gray-200 rounded-[10px] w-48 bg-white'
                        })
                    ),
                    h('span', { className: 'text-xs text-gray-500 inline-flex items-center gap-1' }, 'Para trocar a métrica, use', icoA('settings', 13), 'Métricas acima')
                )
            ),
            clientesFiltrados.length === 0 ? h('div', { className: 'text-center py-10 text-gray-500 text-[13px]' }, 'Nenhum resultado') :
            h('div', { className: 'overflow-x-auto relative' },
                h('table', { className: 'w-full text-sm' },
                    h('thead', { className: 'bg-gray-50' },
                        h('tr', null,
                            h('th', {
                                className: 'text-left ' + thCls + ' sticky left-0 bg-gray-50 z-10'
                            }, 'Cliente'),
                            periodos.map((p, idx) => h('th', {
                                key: p,
                                className: 'text-right ' + thCls,
                                title: labelTooltip(p)
                            },
                                h('div', null, labelPeriodo(p, idx)),
                                h('div', { className: 'text-[11px] text-gray-500 font-normal' }, labelTooltip(p))
                            )),
                            h('th', {
                                className: 'text-right ' + thCls + ' text-gray-700'
                            }, 'Total'),
                            h('th', { className: 'w-8' }, h('span', { className: 'sr-only' }, 'Detalhar'))
                        )
                    ),
                    h('tbody', null,
                        clientesFiltrados.map(c =>
                            h('tr', {
                                key: c.cod_cliente,
                                onClick: () => onDrilldown && onDrilldown({
                                    ...c,
                                    total_entregas: Object.values(c.porPeriodo).reduce((s, p) => s + (p.total_entregas || 0), 0),
                                    no_prazo: Object.values(c.porPeriodo).reduce((s, p) => s + (p.no_prazo || 0), 0),
                                    pct_prazo: c.total,
                                }),
                                className: 'border-t border-gray-100 cursor-pointer hover:bg-gray-50'
                            },
                                h('td', { className: 'px-3 py-2.5 sticky left-0 bg-white z-10' },
                                    h('div', { className: 'font-medium text-gray-900' }, c.nome_cliente),
                                    h('div', { className: 'text-xs text-gray-500' }, 'Cód. ' + c.cod_cliente)
                                ),
                                periodos.map(p => {
                                    const cell = c.porPeriodo[p];
                                    const v = cell ? (cell[m.id] || 0) : 0;
                                    return h('td', {
                                        key: p,
                                        className: 'px-3 py-2.5 text-right whitespace-nowrap tabular-nums ' + (cell ? 'text-gray-900' : 'text-gray-400')
                                    }, cell ? m.fmt(v) : '—');
                                }),
                                h('td', {
                                    className: 'px-3 py-2.5 text-right font-semibold whitespace-nowrap tabular-nums'
                                }, m.fmt(c.total)),
                                h('td', { className: 'px-3 py-2.5 text-center text-gray-400' }, icoA('arrowright', 14))
                            )
                        ),
                        // Linha total geral
                        h('tr', { className: 'bg-gray-50 text-gray-900 border-t border-gray-200' },
                            h('td', { className: 'px-3 py-2.5 font-semibold sticky left-0 bg-gray-50 z-10' },
                                'Total · ' + clientesFiltrados.length + ' clientes'
                            ),
                            periodos.map(p => {
                                let v;
                                if (m.id === 'pct_prazo') {
                                    let totEnt = 0, totNoPrazo = 0;
                                    clientesFiltrados.forEach(c => {
                                        const cell = c.porPeriodo[p];
                                        if (cell) { totEnt += (cell.total_entregas || 0); totNoPrazo += (cell.no_prazo || 0); }
                                    });
                                    v = totEnt > 0 ? (totNoPrazo / totEnt * 100) : 0;
                                } else if (m.id.startsWith('tempo_') || m.id === 'media_ent_prof' || m.id === 'ticket_medio') {
                                    let totEnt = 0, totW = 0;
                                    clientesFiltrados.forEach(c => {
                                        const cell = c.porPeriodo[p];
                                        if (cell) { totEnt += (cell.total_entregas || 0); totW += ((cell[m.id] || 0) * (cell.total_entregas || 0)); }
                                    });
                                    v = totEnt > 0 ? (totW / totEnt) : 0;
                                } else {
                                    v = clientesFiltrados.reduce((s, c) => s + ((c.porPeriodo[p]?.[m.id]) || 0), 0);
                                }
                                return h('td', {
                                    key: p,
                                    className: 'px-3 py-2.5 text-right font-semibold whitespace-nowrap tabular-nums'
                                }, m.fmt(v));
                            }),
                            h('td', {
                                className: 'px-3 py-2.5 text-right font-semibold whitespace-nowrap tabular-nums'
                            }, m.fmt(
                                m.id === 'pct_prazo'
                                    ? (() => {
                                        let totEnt = 0, totNoPrazo = 0;
                                        clientesFiltrados.forEach(c => Object.values(c.porPeriodo).forEach(cell => {
                                            totEnt += (cell.total_entregas || 0);
                                            totNoPrazo += (cell.no_prazo || 0);
                                        }));
                                        return totEnt > 0 ? (totNoPrazo / totEnt * 100) : 0;
                                    })()
                                    : clientesFiltrados.reduce((s, c) => s + (c.total || 0), 0)
                            )),
                            h('td')
                        )
                    )
                )
            )
        );
    }

    // Modal drilldown de cliente (BI_ABAS_V1: cabeçalho branco, KPIs em faixa, rodapé padrão)
    function DrilldownModal({ cliente, granu, onFechar }) {
        useEffect(() => {
            const onKey = (e) => { if (e.key === 'Escape') onFechar(); };
            document.addEventListener('keydown', onKey);
            return () => document.removeEventListener('keydown', onKey);
        }, [onFechar]);
        const kpi = (lbl, val, cor) => h('div', { style: { padding: '12px 14px', minWidth: 0 } },
            h('div', { style: { fontSize: 12, color: '#6b7280' } }, lbl),
            h('div', { style: { fontFamily: 'Sora, Inter, sans-serif', fontSize: 18, fontWeight: 700, color: cor || '#111827', fontVariantNumeric: 'tabular-nums', marginTop: 2, whiteSpace: 'nowrap' } }, val));
        const linha = (lbl, val, ult) => h('tr', { className: ult ? '' : 'border-b border-gray-100' },
            h('td', { className: 'py-2 text-gray-600' }, lbl),
            h('td', { className: 'py-2 text-right font-semibold text-gray-900 tabular-nums' }, val));
        const pct = cliente.pct_prazo || 0;
        return h('div', {
            className: 'fixed inset-0 flex items-center justify-center z-50 p-4',
            style: { background: 'rgba(17,24,39,0.45)' },
            onClick: (e) => { if (e.target === e.currentTarget) onFechar(); }
        },
            h('div', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'acomp-dd-titulo', className: 'bg-white rounded-[14px] border border-gray-200 w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col' },
                // Header
                h('div', { className: 'px-5 py-4 flex items-start justify-between gap-3 flex-shrink-0 border-b border-gray-100' },
                    h('div', { className: 'min-w-0' },
                        h('div', { id: 'acomp-dd-titulo', className: 'text-base font-semibold text-gray-900' }, cliente.nome_cliente),
                        h('div', { className: 'text-[13px] text-gray-500 mt-0.5' }, 'Cód. ' + cliente.cod_cliente + ' · ' + (cliente.total_entregas || 0).toLocaleString('pt-BR') + ' entregas')
                    ),
                    h('button', {
                        type: 'button', onClick: onFechar, 'aria-label': 'Fechar', title: 'Fechar',
                        className: 'inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100'
                    }, icoA('x', 16))
                ),

                h('div', { className: 'p-5 overflow-auto flex-1 flex flex-col gap-4' },
                    // KPIs do cliente (faixa)
                    h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 border border-gray-200 rounded-[12px] overflow-hidden', style: { gap: 1, background: '#f3f4f6' } },
                        h('div', { className: 'bg-white' }, kpi('No prazo', pct.toFixed(1) + '%', pct >= 80 ? '#166534' : pct >= 60 ? '#92400e' : '#991b1b')),
                        h('div', { className: 'bg-white' }, kpi('Retornos', cliente.retornos || 0)),
                        h('div', { className: 'bg-white' }, kpi('Faturamento', fmtMoneyShort(cliente.faturamento || 0))),
                        h('div', { className: 'bg-white' }, kpi('Ticket médio', 'R$ ' + (cliente.ticket_medio || 0).toFixed(2)))
                    ),

                    // Operacional
                    h('div', null,
                        h('div', { className: 'text-[13px] font-semibold text-gray-900 mb-1' }, 'Operacional'),
                        h('table', { className: 'w-full text-[13px]' },
                            h('tbody', null,
                                linha('Tempo médio de entrega', fmtMinTime(cliente.tempo_medio_min || 0)),
                                linha('Tempo mediano de entrega', fmtMinTime(cliente.tempo_mediano_min || 0)),
                                linha('Tempo médio de alocação', fmtMinTime(cliente.tempo_alocacao_min || 0)),
                                linha('Faturamento total', fmtMoney(cliente.faturamento || 0)),
                                linha('Total de entregas', (cliente.total_entregas || 0).toLocaleString('pt-BR')),
                                linha('No prazo / fora do prazo', (cliente.no_prazo || 0) + ' / ' + ((cliente.total_entregas || 0) - (cliente.no_prazo || 0)), true)
                            )
                        )
                    )
                ),

                h('div', { className: 'px-5 py-3 border-t border-gray-100 flex justify-end flex-shrink-0' },
                    h('button', {
                        type: 'button',
                        onClick: onFechar,
                        className: 'inline-flex items-center h-10 px-4 rounded-[10px] text-[13px] font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }, 'Fechar')
                )
            )
        );
    }

    window.AcompanhamentoPeriodico = AcompanhamentoPeriodico;
    console.log('AcompanhamentoPeriodico registrado em window');
})();
