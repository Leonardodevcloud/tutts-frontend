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
    function fmtData(iso, granu) {
        if (!iso) return '';
        const d = new Date(iso);
        if (granu === 'mes') return d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
        if (granu === 'semana') return 'sem ' + d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }

    function AcompanhamentoPeriodico({ apiUrl, fetchAuth, filtros }) {
        const [granu, setGranu] = useState('dia');
        const [eixo, setEixo] = useState('cliente'); // 'cliente' | 'periodo'
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
        }, [apiUrl, granu, filtros?.data_inicio, filtros?.data_fim, filtros?.cod_cliente, filtros?.centro_custo]);

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
        return h('div', { className: 'mb-6' },
            // HEADER: título + toggles
            h('div', { className: 'flex items-center justify-between mb-3 gap-3 flex-wrap' },
                h('div', null,
                    h('div', { className: 'text-base font-semibold text-gray-900' }, '📊 Acompanhamento Periódico'),
                    h('div', { className: 'text-xs text-gray-500' },
                        loading ? 'Carregando...' :
                        erro ? '❌ ' + erro :
                        (dados ? (dados.serie?.length || 0) + ' ' + (granu === 'dia' ? 'dia(s)' : granu === 'semana' ? 'semana(s)' : 'mês(es)') + ' · ' + (dados.porCliente?.length || 0) + ' clientes' : '')
                    )
                ),
                h('div', { className: 'flex gap-2 items-center flex-wrap' },
                    // Granularidade
                    h('div', { className: 'inline-flex bg-white border border-gray-200 rounded-lg p-0.5' },
                        ['dia', 'semana', 'mes'].map(g => h('button', {
                            key: g, onClick: () => setGranu(g),
                            className: 'px-3 py-1 rounded-md text-xs font-medium transition-colors ' + (granu === g ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700')
                        }, g === 'dia' ? 'Diário' : g === 'semana' ? 'Semanal' : 'Mensal'))
                    ),
                    // Eixo da tabela
                    h('div', { className: 'inline-flex bg-white border border-gray-200 rounded-lg p-0.5' },
                        h('button', {
                            onClick: () => setEixo('cliente'),
                            className: 'px-3 py-1 rounded-md text-xs font-medium transition-colors ' + (eixo === 'cliente' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700')
                        }, 'Por Cliente'),
                        h('button', {
                            onClick: () => setEixo('periodo'),
                            className: 'px-3 py-1 rounded-md text-xs font-medium transition-colors ' + (eixo === 'periodo' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700')
                        }, 'Por Período')
                    )
                )
            ),

            // KPIS — só 3 (Total Entregas, % No Prazo, Qtd Retornos)
            h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3 mb-4' },
                h('div', { className: 'bg-white border border-gray-200 rounded-xl p-4' },
                    h('div', { className: 'text-[10px] uppercase tracking-wide text-gray-500 mb-1 font-semibold' }, 'Total Entregas'),
                    h('div', { className: 'text-2xl font-semibold text-gray-900 leading-none' },
                        loading ? '—' : (dados?.kpis?.total_entregas || 0).toLocaleString('pt-BR'))
                ),
                h('div', { className: 'bg-white border border-gray-200 rounded-xl p-4' },
                    h('div', { className: 'text-[10px] uppercase tracking-wide text-gray-500 mb-1 font-semibold' }, '% No Prazo'),
                    h('div', {
                        className: 'text-2xl font-semibold leading-none ' + (
                            !dados ? 'text-gray-400' :
                            dados.kpis?.pct_no_prazo >= 80 ? 'text-green-700' :
                            dados.kpis?.pct_no_prazo >= 60 ? 'text-yellow-700' : 'text-red-700'
                        )
                    }, loading ? '—' : (dados?.kpis?.pct_no_prazo?.toFixed(1) || '0') + '%')
                ),
                h('div', { className: 'bg-white border border-gray-200 rounded-xl p-4' },
                    h('div', { className: 'text-[10px] uppercase tracking-wide text-gray-500 mb-1 font-semibold' }, 'Qtd Retornos'),
                    h('div', {
                        className: 'text-2xl font-semibold leading-none ' + (
                            (dados?.kpis?.qtd_retornos || 0) > 0 ? 'text-orange-700' : 'text-gray-900'
                        )
                    }, loading ? '—' : (dados?.kpis?.qtd_retornos || 0).toLocaleString('pt-BR'))
                )
            ),

            // GRÁFICO de evolução (SVG inline simples)
            h('div', { className: 'bg-white border border-gray-200 rounded-xl p-4 mb-4' },
                h('div', { className: 'flex items-center justify-between mb-3' },
                    h('div', { className: 'text-sm font-medium' }, 'Evolução por ' + (granu === 'dia' ? 'dia' : granu === 'semana' ? 'semana' : 'mês')),
                    h('div', { className: 'flex gap-1.5 text-[10px] items-center' },
                        h('span', { className: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-medium' },
                            h('span', { style: { width: 6, height: 6, borderRadius: 999, background: '#378ADD', display: 'inline-block' } }), 'Entregas'
                        ),
                        h('span', { className: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-800 border border-green-200 font-medium' },
                            h('span', { style: { width: 6, height: 6, borderRadius: 999, background: '#639922', display: 'inline-block' } }), '% No Prazo'
                        )
                    )
                ),
                loading ? h('div', { className: 'text-center py-8 text-gray-400 text-sm' }, '⏳ Carregando...') :
                (!dados?.serie || dados.serie.length === 0) ? h('div', { className: 'text-center py-8 text-gray-400 text-sm' }, 'Sem dados no período') :
                h(MiniChart, { serie: dados.serie, granu })
            ),

            // TABELA
            h('div', { className: 'bg-white border border-gray-200 rounded-xl overflow-hidden' },
                h('div', { className: 'flex items-center justify-between p-3 border-b border-gray-200 gap-2 flex-wrap' },
                    h('div', { className: 'text-sm font-medium' },
                        eixo === 'cliente' ? 'Por Cliente · ' + (linhas.length || 0) + ' resultado(s)'
                                            : 'Por Período · ' + (linhas.length || 0) + ' resultado(s)'
                    ),
                    h('div', { className: 'flex gap-2 items-center' },
                        h('input', {
                            type: 'text', value: busca,
                            placeholder: eixo === 'cliente' ? '🔍 Buscar cliente...' : '🔍 Buscar período...',
                            onChange: e => setBusca(e.target.value),
                            className: 'text-xs px-2 py-1 border border-gray-200 rounded-md w-44'
                        }),
                        h('select', {
                            value: ordem, onChange: e => setOrdem(e.target.value),
                            className: 'text-xs px-2 py-1 border border-gray-200 rounded-md bg-white'
                        },
                            h('option', { value: 'total_entregas' }, 'Ordenar: Entregas ↓'),
                            h('option', { value: 'pct_prazo' }, '% Prazo ↓'),
                            h('option', { value: eixo === 'cliente' ? 'faturamento' : 'valor_total' }, 'Faturamento ↓')
                        )
                    )
                ),
                loading ? h('div', { className: 'text-center py-10 text-gray-400 text-sm' }, '⏳ Carregando...') :
                linhas.length === 0 ? h('div', { className: 'text-center py-10 text-gray-400 text-sm' }, 'Nenhum resultado') :
                h('div', { className: 'overflow-x-auto' },
                    h('table', { className: 'w-full text-sm' },
                        h('thead', { className: 'bg-gray-50' },
                            h('tr', null,
                                h('th', { className: 'text-left text-[10px] uppercase tracking-wide text-gray-500 font-semibold px-3 py-2' },
                                    eixo === 'cliente' ? 'Cliente' : 'Período'),
                                h('th', { className: 'text-right text-[10px] uppercase tracking-wide text-gray-500 font-semibold px-2 py-2' }, 'Entregas'),
                                h('th', { className: 'text-right text-[10px] uppercase tracking-wide text-gray-500 font-semibold px-2 py-2' }, '% Prazo'),
                                h('th', { className: 'text-right text-[10px] uppercase tracking-wide text-gray-500 font-semibold px-2 py-2' }, 'Faturamento'),
                                h('th', { className: 'text-right text-[10px] uppercase tracking-wide text-gray-500 font-semibold px-2 py-2' }, 'Tempo médio'),
                                eixo === 'cliente' && h('th', { className: 'text-center text-[10px] uppercase tracking-wide text-gray-500 font-semibold px-3 py-2 w-8' }, '')
                            )
                        ),
                        h('tbody', null,
                            linhas.map((l, i) => {
                                const pct = l.pct_prazo || 0;
                                const corPct = pct >= 80 ? 'bg-green-50 text-green-800' : pct >= 60 ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-800';
                                const fat = l.faturamento != null ? l.faturamento : l.valor_total || 0;
                                const onClick = eixo === 'cliente' ? () => setDrilldown(l) : null;
                                return h('tr', {
                                    key: eixo === 'cliente' ? l.cod_cliente : l.periodo,
                                    onClick,
                                    className: 'border-t border-gray-100 ' + (onClick ? 'cursor-pointer hover:bg-purple-50' : '')
                                },
                                    h('td', { className: 'px-3 py-2' },
                                        eixo === 'cliente'
                                            ? h('div', null,
                                                h('div', { className: 'font-medium text-gray-900' }, l.nome_cliente),
                                                h('div', { className: 'text-[10px] text-gray-400' }, 'cod ' + l.cod_cliente)
                                            )
                                            : h('div', { className: 'font-medium text-gray-900' }, fmtData(l.periodo, granu))
                                    ),
                                    h('td', { className: 'px-2 py-2 text-right font-semibold' }, (l.total_entregas || 0).toLocaleString('pt-BR')),
                                    h('td', { className: 'px-2 py-2 text-right' },
                                        h('span', {
                                            className: 'inline-block px-2 py-0.5 rounded-full text-xs font-semibold ' + corPct
                                        }, pct.toFixed(1) + '%')
                                    ),
                                    h('td', { className: 'px-2 py-2 text-right font-medium' }, fmtMoneyShort(fat)),
                                    h('td', { className: 'px-2 py-2 text-right text-gray-600' }, fmtMinTime(l.tempo_medio_min || 0)),
                                    eixo === 'cliente' && h('td', { className: 'px-3 py-2 text-center text-gray-400' }, '›')
                                );
                            }),
                            // Linha total (footer)
                            h('tr', { className: 'bg-gray-900 text-white' },
                                h('td', { className: 'px-3 py-2 font-semibold' }, 'Total · ' + linhas.length + (eixo === 'cliente' ? ' clientes' : ' períodos')),
                                h('td', { className: 'px-2 py-2 text-right font-semibold' }, totais.total_entregas.toLocaleString('pt-BR')),
                                h('td', { className: 'px-2 py-2 text-right' }, totais.pct_prazo.toFixed(1) + '%'),
                                h('td', { className: 'px-2 py-2 text-right font-semibold' }, fmtMoneyShort(totais.faturamento)),
                                h('td', { className: 'px-2 py-2 text-right text-gray-400' }, '—'),
                                eixo === 'cliente' && h('td', { className: 'px-3 py-2' })
                            )
                        )
                    )
                )
            ),

            // Modal drilldown (só pra eixo=cliente)
            drilldown && h(DrilldownModal, {
                cliente: drilldown,
                granu,
                onFechar: () => setDrilldown(null)
            })
        );
    }

    // Mini chart SVG (entregas + % prazo) com tooltip ao hover
    function MiniChart({ serie, granu }) {
        const W = 700, H = 180, PAD_L = 36, PAD_R = 36, PAD_T = 12, PAD_B = 28;
        const maxEnt = Math.max(1, ...serie.map(s => s.total_entregas || 0));
        const xStep = serie.length > 1 ? (W - PAD_L - PAD_R) / (serie.length - 1) : 0;
        const yEnt = (v) => PAD_T + (1 - v / maxEnt) * (H - PAD_T - PAD_B);
        const yPct = (v) => PAD_T + (1 - (v || 0) / 100) * (H - PAD_T - PAD_B);

        const pointsEnt = serie.map((s, i) => (PAD_L + i * xStep) + ',' + yEnt(s.total_entregas || 0)).join(' ');
        const pointsPct = serie.map((s, i) => (PAD_L + i * xStep) + ',' + yPct(s.pct_prazo || 0)).join(' ');

        const [hover, setHover] = useState(null);

        // X labels: max ~6 marcadores
        const labelStep = Math.max(1, Math.ceil(serie.length / 6));

        return h('div', { style: { position: 'relative' } },
            h('svg', {
                viewBox: '0 0 ' + W + ' ' + H,
                style: { width: '100%', height: 200, display: 'block' },
                onMouseLeave: () => setHover(null)
            },
                // gridlines
                [0.25, 0.5, 0.75, 1].map((p, i) => h('line', {
                    key: i,
                    x1: PAD_L, x2: W - PAD_R,
                    y1: PAD_T + p * (H - PAD_T - PAD_B),
                    y2: PAD_T + p * (H - PAD_T - PAD_B),
                    stroke: '#F1EFE8', strokeWidth: 1
                })),
                // y-labels eixo entregas (esquerda)
                [0, 0.5, 1].map((p, i) => h('text', {
                    key: 'yl' + i,
                    x: PAD_L - 4, y: PAD_T + (1 - p) * (H - PAD_T - PAD_B) + 3,
                    fontSize: 9, fill: '#888780', textAnchor: 'end'
                }, Math.round(maxEnt * p).toLocaleString('pt-BR'))),
                // y-labels eixo % (direita)
                [0, 50, 100].map((v, i) => h('text', {
                    key: 'yr' + i,
                    x: W - PAD_R + 4, y: yPct(v) + 3,
                    fontSize: 9, fill: '#3B6D11', textAnchor: 'start'
                }, v + '%')),
                // hover area por ponto
                serie.map((s, i) => h('rect', {
                    key: 'hv' + i,
                    x: PAD_L + i * xStep - xStep / 2,
                    y: PAD_T,
                    width: xStep, height: H - PAD_T - PAD_B,
                    fill: 'transparent',
                    onMouseEnter: () => setHover({ idx: i, ...s, x: PAD_L + i * xStep })
                })),
                // hover line
                hover && h('line', {
                    x1: hover.x, x2: hover.x, y1: PAD_T, y2: H - PAD_B,
                    stroke: '#888780', strokeWidth: 0.5, strokeDasharray: '2,2'
                }),
                // linhas
                serie.length > 1 && h('polyline', { fill: 'none', stroke: '#378ADD', strokeWidth: 2, points: pointsEnt }),
                serie.length > 1 && h('polyline', { fill: 'none', stroke: '#639922', strokeWidth: 2, points: pointsPct }),
                // pontos hover
                hover && h('circle', { cx: hover.x, cy: yEnt(hover.total_entregas || 0), r: 4, fill: '#378ADD' }),
                hover && h('circle', { cx: hover.x, cy: yPct(hover.pct_prazo || 0), r: 4, fill: '#639922' }),
                // x-labels
                serie.map((s, i) => i % labelStep === 0 ? h('text', {
                    key: 'xl' + i,
                    x: PAD_L + i * xStep,
                    y: H - PAD_B + 14,
                    fontSize: 9, fill: '#888780', textAnchor: 'middle'
                }, fmtData(s.periodo, granu)) : null)
            ),
            // Tooltip flutuante
            hover && h('div', {
                style: {
                    position: 'absolute',
                    left: ((hover.x / W) * 100) + '%',
                    top: 8,
                    transform: 'translateX(-50%)',
                    background: 'white',
                    border: '0.5px solid #D3D1C7',
                    borderRadius: 6,
                    padding: '6px 10px',
                    fontSize: 11,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                }
            },
                h('div', { style: { fontWeight: 500, marginBottom: 2 } }, fmtData(hover.periodo, granu)),
                h('div', { style: { color: '#185FA5' } }, '● ' + (hover.total_entregas || 0).toLocaleString('pt-BR') + ' entregas'),
                h('div', { style: { color: '#3B6D11' } }, '● ' + (hover.pct_prazo || 0).toFixed(1) + '% no prazo'),
                hover.retornos > 0 && h('div', { style: { color: '#A32D2D' } }, '↻ ' + hover.retornos + ' retornos')
            )
        );
    }

    // Modal drilldown de cliente
    function DrilldownModal({ cliente, granu, onFechar }) {
        return h('div', {
            className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4',
            onClick: (e) => { if (e.target === e.currentTarget) onFechar(); }
        },
            h('div', { className: 'bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col' },
                // Header
                h('div', {
                    style: { background: 'linear-gradient(to right, #534AB7, #185FA5)' },
                    className: 'p-4 text-white flex items-center justify-between flex-shrink-0'
                },
                    h('div', null,
                        h('div', { className: 'text-base font-semibold' }, cliente.nome_cliente),
                        h('div', { className: 'text-xs opacity-80' }, 'cod ' + cliente.cod_cliente + ' · ' + (cliente.total_entregas || 0).toLocaleString('pt-BR') + ' entregas')
                    ),
                    h('button', {
                        onClick: onFechar,
                        className: 'text-white/80 hover:text-white text-2xl leading-none'
                    }, '×')
                ),

                h('div', { className: 'p-4 overflow-auto flex-1' },
                    // KPIs do cliente
                    h('div', { className: 'grid grid-cols-4 gap-2 mb-4 pb-3 border-b border-gray-100' },
                        h('div', null,
                            h('div', { className: 'text-[9px] uppercase text-gray-500 font-semibold' }, '% Prazo'),
                            h('div', { className: 'text-lg font-semibold text-green-700' }, (cliente.pct_prazo || 0).toFixed(1) + '%')
                        ),
                        h('div', null,
                            h('div', { className: 'text-[9px] uppercase text-gray-500 font-semibold' }, 'Retornos'),
                            h('div', { className: 'text-lg font-semibold text-gray-900' }, cliente.retornos || 0)
                        ),
                        h('div', null,
                            h('div', { className: 'text-[9px] uppercase text-gray-500 font-semibold' }, 'Faturamento'),
                            h('div', { className: 'text-lg font-semibold text-gray-900' }, fmtMoneyShort(cliente.faturamento || 0))
                        ),
                        h('div', null,
                            h('div', { className: 'text-[9px] uppercase text-gray-500 font-semibold' }, 'Ticket Médio'),
                            h('div', { className: 'text-lg font-semibold text-gray-900' }, 'R$ ' + (cliente.ticket_medio || 0).toFixed(2))
                        )
                    ),

                    // Operacional
                    h('div', { className: 'mb-3' },
                        h('div', { className: 'text-[10px] uppercase tracking-wide text-gray-500 font-semibold mb-2' }, 'Operacional'),
                        h('table', { className: 'w-full text-sm' },
                            h('tbody', null,
                                h('tr', { className: 'border-b border-gray-100' },
                                    h('td', { className: 'py-1.5 text-gray-600' }, 'Tempo médio entrega'),
                                    h('td', { className: 'py-1.5 text-right font-medium' }, fmtMinTime(cliente.tempo_medio_min || 0))
                                ),
                                h('tr', { className: 'border-b border-gray-100' },
                                    h('td', { className: 'py-1.5 text-gray-600' }, 'Faturamento total'),
                                    h('td', { className: 'py-1.5 text-right font-medium' }, fmtMoney(cliente.faturamento || 0))
                                ),
                                h('tr', { className: 'border-b border-gray-100' },
                                    h('td', { className: 'py-1.5 text-gray-600' }, 'Total entregas'),
                                    h('td', { className: 'py-1.5 text-right font-medium' }, (cliente.total_entregas || 0).toLocaleString('pt-BR'))
                                ),
                                h('tr', null,
                                    h('td', { className: 'py-1.5 text-gray-600' }, 'No prazo / Fora prazo'),
                                    h('td', { className: 'py-1.5 text-right font-medium' },
                                        (cliente.no_prazo || 0) + ' / ' + ((cliente.total_entregas || 0) - (cliente.no_prazo || 0))
                                    )
                                )
                            )
                        )
                    )
                ),

                h('div', { className: 'p-3 border-t border-gray-100 flex justify-end flex-shrink-0' },
                    h('button', {
                        onClick: onFechar,
                        className: 'px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium'
                    }, 'Fechar')
                )
            )
        );
    }

    window.AcompanhamentoPeriodico = AcompanhamentoPeriodico;
    console.log('✅ AcompanhamentoPeriodico registrado em window');
})();
