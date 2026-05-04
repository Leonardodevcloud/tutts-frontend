// ==================== MÓDULO SCORE V2 (ADMIN) ====================
// Arquivo: modulo-score-v2.js
// Tela admin pra configurar score por região + ver sorteios + motoboys.
//
// Estrutura:
//   - Aba "Configurações": ativa/desativa score por região, valores
//   - Aba "Motoboys por Nível": lista quem está em cada nível
//   - Aba "Sorteios": histórico mensal e disparo manual
// =====================================================================

(function() {
    'use strict';

    const { useState, useEffect, useCallback, useRef, useMemo } = React;
    const h = React.createElement;

    function fmtBRL(v) {
        return 'R$ ' + (parseFloat(v) || 0).toFixed(2).replace('.', ',');
    }
    function fmtData(s) {
        if (!s) return '-';
        const d = new Date(s);
        return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    window.ModuloScoreV2Component = function(props) {
        const { fetchApi, showToast } = props;
        const [tab, setTab] = useState('configuracoes');

        return h('div', { className: 'max-w-7xl mx-auto p-4 md:p-6' },
            h('div', { className: 'bg-white rounded-lg shadow-sm border border-gray-200 mb-4' },
                h('div', { className: 'flex gap-1 p-1' },
                    [
                        { id: 'configuracoes', label: '⚙️ Configurações' },
                        { id: 'motoboys', label: '👥 Motoboys por Nível' },
                        { id: 'sorteios', label: '🎲 Sorteios' },
                    ].map(t => h('button', {
                        key: t.id,
                        onClick: () => setTab(t.id),
                        className: 'flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ' +
                            (tab === t.id ? 'bg-purple-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100')
                    }, t.label))
                )
            ),
            tab === 'configuracoes' && h(AbaConfiguracoes, { fetchApi, showToast }),
            tab === 'motoboys' && h(AbaMotoboys, { fetchApi, showToast }),
            tab === 'sorteios' && h(AbaSorteios, { fetchApi, showToast })
        );
    };

    // ============================================================
    // ABA CONFIGURAÇÕES
    // ============================================================
    function AbaConfiguracoes({ fetchApi, showToast }) {
        const [configs, setConfigs] = useState([]);
        const [regioesDisp, setRegioesDisp] = useState([]);
        const [loading, setLoading] = useState(true);
        const [editando, setEditando] = useState(null); // null | objeto com { regiao, ... }

        // 🔧 FIX loop infinito: refs estáveis pra fetchApi/showToast.
        // O componente pai (operacional) recria fetchApi a cada render → useCallback
        // invalida → useEffect dispara → render → loop infinito de toast 401.
        const fetchApiRef = useRef(fetchApi);
        const showToastRef = useRef(showToast);
        useEffect(() => { fetchApiRef.current = fetchApi; }, [fetchApi]);
        useEffect(() => { showToastRef.current = showToast; }, [showToast]);

        const carregar = useCallback(async () => {
            setLoading(true);
            try {
                const [cfgs, regs] = await Promise.all([
                    fetchApiRef.current('/score-v2/admin/configuracoes'),
                    fetchApiRef.current('/score-v2/admin/regioes-disponiveis'),
                ]);
                setConfigs(cfgs || []);
                setRegioesDisp(regs || []);
            } catch (err) {
                showToastRef.current('❌ ' + err.message, 'error');
            } finally {
                setLoading(false);
            }
        }, []); // sem dependências — refs são estáveis

        useEffect(() => { carregar(); }, [carregar]);

        const salvar = async (cfg) => {
            try {
                await fetchApi('/score-v2/admin/configuracoes', {
                    method: 'POST',
                    body: JSON.stringify(cfg),
                });
                showToast('✅ Configuração salva', 'success');
                setEditando(null);
                carregar();
            } catch (err) {
                showToast('❌ ' + err.message, 'error');
            }
        };

        const desativar = async (id, regiao) => {
            if (!confirm(`Desativar score para "${regiao}"?\n\nMotoboys da região vão deixar de ver/ganhar score. Histórico de sorteios é mantido.`)) return;
            try {
                await fetchApi('/score-v2/admin/configuracoes/' + id, { method: 'DELETE' });
                showToast('✅ Desativada', 'success');
                carregar();
            } catch (err) {
                showToast('❌ ' + err.message, 'error');
            }
        };

        // 🚀 Reavalia em massa todos os motoboys da região (CRM + Planilha)
        const reavaliar = async (regiao) => {
            if (!confirm(`Re-avaliar TODOS os motoboys de "${regiao}"?\n\nIsso vai recalcular o nível de cada motoboy da região (CRM + Planilha) e popular as contagens. Pode demorar alguns segundos.`)) return;
            try {
                showToast('🔄 Re-avaliando... aguarde', 'info');
                const r = await fetchApi('/score-v2/admin/reavaliar-regiao', {
                    method: 'POST',
                    body: JSON.stringify({ regiao }),
                });
                showToast(`✅ ${r.processados} avaliados — N1:${r.niveis[1]} N2:${r.niveis[2]} N3:${r.niveis[3]}`, 'success');
                carregar();
            } catch (err) {
                showToast('❌ ' + err.message, 'error');
            }
        };

        // Regiões que ainda não foram configuradas
        // ⚠️ Backend agora já filtra: só vêm regiões com ≥1 motoboy avaliado, ordenadas DESC.
        // Aqui mantemos filtro extra pra excluir regiões já configuradas (defensivo, backend já faz).
        const regioesNaoConfig = regioesDisp.filter(r =>
            !configs.some(c => c.regiao.toUpperCase() === r.regiao.toUpperCase())
        );

        if (loading) return h('div', { className: 'text-center py-12 text-gray-500' }, '⏳ Carregando...');

        return h('div', null,
            // 🚀 2026-05: Painel de regiões sem score — redesign com busca + chips cinzas com badge
            // Mostra 15 inicialmente, expande via "ver mais", filtra por busca em tempo real.
            regioesNaoConfig.length > 0 && h(PainelRegioesNaoConfig, {
                regioes: regioesNaoConfig,
                onSelecionar: (r) => setEditando({
                    regiao: r.regiao, ativo: true, niveis_ativos: [2, 3],
                    sorteio_valor_n2: 50, sorteio_valor_n3: 150,
                    saque_teto_n2: 500, saque_teto_n3: 500,
                })
            }),

            // Lista de configs
            configs.length === 0 ? h('div', { className: 'text-center py-12 text-gray-400 text-sm' },
                'Nenhuma região configurada. Use os botões acima para começar.'
            ) : h('div', { className: 'space-y-3' },
                configs.map(cfg => h(CardConfig, {
                    key: cfg.id, cfg,
                    onEditar: () => setEditando(cfg),
                    onDesativar: () => desativar(cfg.id, cfg.regiao),
                    onAtivar: async () => salvar({ ...cfg, ativo: true }),
                    onReavaliar: () => reavaliar(cfg.regiao),
                }))
            ),

            // Modal de edição
            editando && h(ModalEditar, {
                cfg: editando,
                onSalvar: salvar,
                onCancelar: () => setEditando(null),
            })
        );
    }

    // ============================================================
    // PAINEL DE REGIÕES SEM SCORE (chips cinzas + busca + paginação)
    // 🚀 2026-05: Redesign — backend já vem ordenado por contagem DESC
    // sem regiões vazias. Aqui só mostra 15 inicialmente, busca filtra em tempo real.
    // ============================================================
    function PainelRegioesNaoConfig({ regioes, onSelecionar }) {
        const [busca, setBusca] = useState('');
        const [mostrarTodas, setMostrarTodas] = useState(false);
        const VISIVEIS_INICIAL = 15;

        const filtradas = useMemo(() => {
            const q = (busca || '').toLowerCase().trim();
            if (!q) return regioes;
            return regioes.filter(r => (r.regiao || '').toLowerCase().includes(q));
        }, [regioes, busca]);

        const exibidas = mostrarTodas || busca ? filtradas : filtradas.slice(0, VISIVEIS_INICIAL);
        const restantes = filtradas.length - VISIVEIS_INICIAL;
        const totalMotoboys = useMemo(
            () => regioes.reduce((s, r) => s + (r.total_motoboys || 0), 0),
            [regioes]
        );

        return h('div', { className: 'bg-white border border-gray-200 rounded-xl p-4 mb-4' },
            // Header: contador honesto
            h('div', { className: 'flex items-center justify-between mb-3' },
                h('div', { className: 'text-sm text-gray-700' },
                    h('span', { className: 'font-semibold text-gray-900' }, regioes.length + ' regiões'),
                    ' com ',
                    h('span', { className: 'font-semibold text-gray-900' }, totalMotoboys.toLocaleString('pt-BR')),
                    ' motoboys aguardando configuração'
                )
            ),

            // Busca em destaque
            h('input', {
                type: 'text',
                value: busca,
                placeholder: '🔍 Buscar região...',
                onChange: e => setBusca(e.target.value),
                className: 'w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm mb-3 focus:bg-white focus:border-purple-300 focus:outline-none transition-colors'
            }),

            // Chips cinzas com badge de contagem (ordem já vem do backend)
            filtradas.length === 0
                ? h('div', { className: 'text-center py-6 text-gray-400 text-sm' },
                    busca ? `Nenhuma região com "${busca}"` : 'Nenhuma região disponível'
                )
                : h('div', { className: 'flex flex-wrap gap-1.5' },
                    exibidas.map(r => h('button', {
                        key: r.regiao,
                        onClick: () => onSelecionar(r),
                        className: 'inline-flex items-center gap-1.5 bg-gray-50 hover:bg-purple-50 border border-gray-200 hover:border-purple-300 text-gray-800 hover:text-purple-800 rounded-full text-xs font-medium transition-colors',
                        style: { padding: '4px 10px 4px 8px' }
                    },
                        h('span', { className: 'text-gray-400 font-semibold' }, '+'),
                        h('span', null, r.regiao),
                        r.total_motoboys != null && h('span', {
                            className: 'bg-white text-gray-500 rounded-full text-[10px] font-medium',
                            style: { padding: '1px 6px' }
                        }, r.total_motoboys.toLocaleString('pt-BR'))
                    ))
                ),

            // "Ver mais" só aparece se NÃO está buscando E ainda tem regiões escondidas
            !busca && !mostrarTodas && restantes > 0 && h('button', {
                onClick: () => setMostrarTodas(true),
                className: 'w-full mt-3 py-2 bg-white border border-dashed border-gray-300 hover:border-purple-300 hover:bg-purple-50 rounded-lg text-xs text-purple-700 font-medium transition-colors'
            }, `Ver mais ${restantes} região(ões) ↓`),

            // "Ver menos" quando todas estão expandidas
            !busca && mostrarTodas && regioes.length > VISIVEIS_INICIAL && h('button', {
                onClick: () => setMostrarTodas(false),
                className: 'w-full mt-3 py-2 bg-white border border-dashed border-gray-300 hover:border-gray-400 rounded-lg text-xs text-gray-500 font-medium transition-colors'
            }, 'Ver menos ↑')
        );
    }

    function CardConfig({ cfg, onEditar, onDesativar, onAtivar, onReavaliar }) {
        const niveis = Array.isArray(cfg.niveis_ativos) ? cfg.niveis_ativos : (typeof cfg.niveis_ativos === 'string' ? JSON.parse(cfg.niveis_ativos) : []);
        const ativo = cfg.ativo !== false;
        const counts = cfg.motoboys_por_nivel || { 1: 0, 2: 0, 3: 0 };

        return h('div', {
            className: 'bg-white border rounded-lg p-4 ' + (ativo ? 'border-gray-200' : 'border-gray-200 opacity-60')
        },
            h('div', { className: 'flex items-start justify-between gap-3 mb-3' },
                h('div', null,
                    h('div', { className: 'flex items-center gap-2' },
                        h('h3', { className: 'font-bold text-gray-900' }, '📍 ' + cfg.regiao),
                        h('span', { className: 'px-2 py-0.5 rounded text-xs font-medium ' + (ativo ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600') },
                            ativo ? '✓ Ativo' : '⏸ Inativo'
                        )
                    ),
                    h('p', { className: 'text-xs text-gray-500 mt-1' },
                        'Níveis ativos: ' + niveis.map(n => 'N' + n).join(', ') +
                        ' • Atualizado em ' + fmtData(cfg.atualizado_em)
                    )
                ),
                h('div', { className: 'flex gap-2 flex-wrap' },
                    ativo && h('button', {
                        onClick: onReavaliar,
                        className: 'px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs font-medium hover:bg-blue-100',
                        title: 'Re-avaliar todos os motoboys da região agora'
                    }, '🔄 Reavaliar'),
                    ativo
                        ? h('button', { onClick: onDesativar, className: 'px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-md text-xs font-medium hover:bg-red-100' }, '⏸ Desativar')
                        : h('button', { onClick: onAtivar, className: 'px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-md text-xs font-medium hover:bg-green-100' }, '▶ Reativar'),
                    h('button', { onClick: onEditar, className: 'px-3 py-1.5 bg-purple-600 text-white rounded-md text-xs font-medium hover:bg-purple-700' }, '✏️ Editar')
                )
            ),
            // Cards com valores e contagens
            h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3 text-center' },
                h('div', { className: 'bg-amber-50 border border-amber-200 rounded p-2' },
                    h('div', { className: 'text-xs text-amber-700 font-medium' }, '🥈 N2'),
                    h('div', { className: 'text-lg font-bold text-amber-900' }, counts[2] + ' motoboys'),
                    h('div', { className: 'text-[10px] text-amber-700' }, 'Sorteio: ' + fmtBRL(cfg.sorteio_valor_n2)),
                    h('div', { className: 'text-[10px] text-amber-700' }, 'Saque: até ' + fmtBRL(cfg.saque_teto_n2) + '/mês')
                ),
                h('div', { className: 'bg-yellow-50 border border-yellow-300 rounded p-2' },
                    h('div', { className: 'text-xs text-yellow-700 font-medium' }, '🥇 N3'),
                    h('div', { className: 'text-lg font-bold text-yellow-900' }, counts[3] + ' motoboys'),
                    h('div', { className: 'text-[10px] text-yellow-700' }, 'Sorteio: ' + fmtBRL(cfg.sorteio_valor_n3)),
                    h('div', { className: 'text-[10px] text-yellow-700' }, 'Saque: até ' + fmtBRL(cfg.saque_teto_n3) + '/sem')
                ),
                h('div', { className: 'bg-gray-50 border border-gray-200 rounded p-2' },
                    h('div', { className: 'text-xs text-gray-600 font-medium' }, '⚪ N1'),
                    h('div', { className: 'text-lg font-bold text-gray-700' }, counts[1] + ' motoboys')
                ),
                h('div', { className: 'bg-blue-50 border border-blue-200 rounded p-2' },
                    h('div', { className: 'text-xs text-blue-700 font-medium' }, 'Total'),
                    h('div', { className: 'text-lg font-bold text-blue-900' }, (counts[1] + counts[2] + counts[3]) + ' avaliados')
                )
            )
        );
    }

    function ModalEditar({ cfg, onSalvar, onCancelar }) {
        const [form, setForm] = useState({
            regiao: cfg.regiao,
            ativo: cfg.ativo !== false,
            niveis_ativos: Array.isArray(cfg.niveis_ativos) ? cfg.niveis_ativos : (typeof cfg.niveis_ativos === 'string' ? JSON.parse(cfg.niveis_ativos) : [2, 3]),
            sorteio_valor_n2: cfg.sorteio_valor_n2 != null ? Number(cfg.sorteio_valor_n2) : 50,
            sorteio_valor_n3: cfg.sorteio_valor_n3 != null ? Number(cfg.sorteio_valor_n3) : 150,
            saque_teto_n2: cfg.saque_teto_n2 != null ? Number(cfg.saque_teto_n2) : 500,
            saque_teto_n3: cfg.saque_teto_n3 != null ? Number(cfg.saque_teto_n3) : 500,
            // 🚀 Thresholds (defaults)
            n2_min_entregas: cfg.n2_min_entregas != null ? Number(cfg.n2_min_entregas) : 80,
            n2_min_dias_16h: cfg.n2_min_dias_16h != null ? Number(cfg.n2_min_dias_16h) : 15,
            n2_min_pct_prazo: cfg.n2_min_pct_prazo != null ? Number(cfg.n2_min_pct_prazo) : 80,
            n3_min_entregas: cfg.n3_min_entregas != null ? Number(cfg.n3_min_entregas) : 150,
            n3_min_dias_16h: cfg.n3_min_dias_16h != null ? Number(cfg.n3_min_dias_16h) : 20,
            n3_min_pct_prazo: cfg.n3_min_pct_prazo != null ? Number(cfg.n3_min_pct_prazo) : 88,
        });

        const toggleNivel = (n) => {
            const tem = form.niveis_ativos.includes(n);
            setForm({ ...form, niveis_ativos: tem ? form.niveis_ativos.filter(x => x !== n) : [...form.niveis_ativos, n].sort() });
        };

        // Helper de input numérico inline
        const numInput = (key, step, min, max) => h('input', {
            type: 'number', step: step || 1, min: min != null ? min : 0, max: max,
            value: form[key], 
            onChange: e => setForm({ ...form, [key]: parseFloat(e.target.value) || 0 }),
            className: 'w-full px-3 py-2 border rounded-lg text-sm mt-1'
        });

        return h('div', { className: 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4' },
            h('div', { className: 'bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto' },
                h('div', { className: 'p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10' },
                    h('h2', { className: 'text-lg font-bold text-gray-900' }, '⚙️ ' + (cfg.id ? 'Editar' : 'Configurar') + ' — ' + form.regiao),
                    h('button', { onClick: onCancelar, className: 'text-gray-400 hover:text-gray-600 text-2xl' }, '×')
                ),
                h('div', { className: 'p-4 space-y-4' },
                    // Toggle ativo
                    h('div', { className: 'flex items-center justify-between bg-gray-50 rounded-lg p-3' },
                        h('span', { className: 'text-sm font-medium text-gray-700' }, 'Score ativo nesta região'),
                        h('input', {
                            type: 'checkbox', checked: form.ativo,
                            onChange: e => setForm({ ...form, ativo: e.target.checked }),
                            className: 'w-5 h-5'
                        })
                    ),
                    // Níveis ativos
                    h('div', null,
                        h('label', { className: 'text-sm font-medium text-gray-700 mb-2 block' }, 'Níveis disponíveis'),
                        h('div', { className: 'flex gap-3' },
                            [2, 3].map(n => h('label', { key: n, className: 'flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer ' + (form.niveis_ativos.includes(n) ? 'border-purple-400 bg-purple-50' : 'border-gray-300') },
                                h('input', { type: 'checkbox', checked: form.niveis_ativos.includes(n), onChange: () => toggleNivel(n) }),
                                h('span', { className: 'text-sm font-medium' }, 'Nível ' + n)
                            ))
                        )
                    ),

                    // 🥈 Bloco completo Nível 2: critérios + valores
                    form.niveis_ativos.includes(2) && h('div', { className: 'border border-amber-200 bg-amber-50 rounded-lg p-3 space-y-3' },
                        h('h4', { className: 'text-sm font-bold text-amber-900' }, '🥈 Nível 2 — Prata'),
                        h('p', { className: 'text-[11px] text-amber-700' }, 'Critérios pra atingir (todos precisam ser cumpridos):'),
                        h('div', { className: 'grid grid-cols-3 gap-2' },
                            h('div', null,
                                h('label', { className: 'text-xs text-amber-700 font-medium' }, 'Mín. entregas (28d)'),
                                numInput('n2_min_entregas', 1, 0)
                            ),
                            h('div', null,
                                h('label', { className: 'text-xs text-amber-700 font-medium' }, 'Mín. entregas após 16h'),
                                numInput('n2_min_dias_16h', 1, 0)
                            ),
                            h('div', null,
                                h('label', { className: 'text-xs text-amber-700 font-medium' }, '% prazo mín.'),
                                numInput('n2_min_pct_prazo', 0.1, 0, 100)
                            )
                        ),
                        h('p', { className: 'text-[11px] text-amber-700 mt-2' }, 'Bonificações:'),
                        h('div', { className: 'grid grid-cols-2 gap-2' },
                            h('div', null,
                                h('label', { className: 'text-xs text-amber-700 font-medium' }, 'Sorteio mensal (R$)'),
                                numInput('sorteio_valor_n2', 0.01, 0)
                            ),
                            h('div', null,
                                h('label', { className: 'text-xs text-amber-700 font-medium' }, 'Teto saque/mês (R$)'),
                                numInput('saque_teto_n2', 0.01, 0)
                            )
                        )
                    ),

                    // 🥇 Bloco completo Nível 3: critérios + valores
                    form.niveis_ativos.includes(3) && h('div', { className: 'border border-yellow-300 bg-yellow-50 rounded-lg p-3 space-y-3' },
                        h('h4', { className: 'text-sm font-bold text-yellow-900' }, '🥇 Nível 3 — Ouro'),
                        h('p', { className: 'text-[11px] text-yellow-700' }, 'Critérios pra atingir (todos precisam ser cumpridos):'),
                        h('div', { className: 'grid grid-cols-3 gap-2' },
                            h('div', null,
                                h('label', { className: 'text-xs text-yellow-700 font-medium' }, 'Mín. entregas (28d)'),
                                numInput('n3_min_entregas', 1, 0)
                            ),
                            h('div', null,
                                h('label', { className: 'text-xs text-yellow-700 font-medium' }, 'Mín. entregas após 16h'),
                                numInput('n3_min_dias_16h', 1, 0)
                            ),
                            h('div', null,
                                h('label', { className: 'text-xs text-yellow-700 font-medium' }, '% prazo mín.'),
                                numInput('n3_min_pct_prazo', 0.1, 0, 100)
                            )
                        ),
                        h('p', { className: 'text-[11px] text-yellow-700 mt-2' }, 'Bonificações:'),
                        h('div', { className: 'grid grid-cols-2 gap-2' },
                            h('div', null,
                                h('label', { className: 'text-xs text-yellow-700 font-medium' }, 'Sorteio mensal (R$)'),
                                numInput('sorteio_valor_n3', 0.01, 0)
                            ),
                            h('div', null,
                                h('label', { className: 'text-xs text-yellow-700 font-medium' }, 'Teto saque/sem (R$)'),
                                numInput('saque_teto_n3', 0.01, 0)
                            )
                        )
                    ),

                    h('div', { className: 'bg-blue-50 border border-blue-200 rounded-lg p-3 text-[11px] text-blue-900' },
                        h('p', { className: 'font-medium mb-1' }, '💡 Dica de calibragem'),
                        h('p', null, 'Pra ver quantos motoboys vão se enquadrar antes de salvar definitivo, ' +
                            'salva com valores baixos primeiro, clica "Reavaliar" no card e veja os totais por nível na aba "Motoboys por Nível". Depois ajusta.'),
                        h('p', { className: 'mt-2' }, '⚠️ Mudar critérios reavalia automaticamente todos os motoboys da região em background ao salvar.')
                    )
                ),
                h('div', { className: 'p-4 border-t border-gray-200 flex gap-2 sticky bottom-0 bg-white' },
                    h('button', { onClick: onCancelar, className: 'flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50' }, 'Cancelar'),
                    h('button', { onClick: () => onSalvar(form), className: 'flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium text-sm hover:bg-purple-700' }, '💾 Salvar')
                )
            )
        );
    }

    // ============================================================
    // ABA MOTOBOYS POR NÍVEL
    // 🚀 2026-05: Redesign — cards por região com pódio compacto + drilldown modal
    // ============================================================
    function AbaMotoboys({ fetchApi, showToast }) {
        const [filtroNivel, setFiltroNivel] = useState('');
        const [busca, setBusca] = useState('');
        const [motoboys, setMotoboys] = useState([]);
        const [total, setTotal] = useState(0);
        const [loading, setLoading] = useState(false);
        const [regiaoModal, setRegiaoModal] = useState(null); // { regiao, motoboys }

        const fetchApiRef = useRef(fetchApi);
        const showToastRef = useRef(showToast);
        useEffect(() => { fetchApiRef.current = fetchApi; }, [fetchApi]);
        useEffect(() => { showToastRef.current = showToast; }, [showToast]);

        // Carrega TODOS os motoboys (limit alto). Front agrupa por região.
        const carregar = useCallback(async () => {
            setLoading(true);
            try {
                const params = ['limit=10000'];
                if (filtroNivel) params.push('nivel=' + filtroNivel);
                const data = await fetchApiRef.current('/score-v2/admin/motoboys-por-nivel?' + params.join('&'));
                if (data && Array.isArray(data.rows)) {
                    setMotoboys(data.rows);
                    setTotal(data.total || data.rows.length);
                } else if (Array.isArray(data)) {
                    setMotoboys(data);
                    setTotal(data.length);
                } else {
                    setMotoboys([]);
                    setTotal(0);
                }
            } catch (err) { showToastRef.current('❌ ' + err.message, 'error'); }
            finally { setLoading(false); }
        }, [filtroNivel]);

        useEffect(() => { carregar(); }, [carregar]);

        // Agrupa motoboys por região + filtra por busca
        const grupos = useMemo(() => {
            const buscaNorm = (busca || '').toLowerCase().trim();
            const map = {};
            (motoboys || []).forEach(m => {
                if (buscaNorm) {
                    const matchNome = String(m.nome_prof || '').toLowerCase().includes(buscaNorm);
                    const matchCod = String(m.cod_prof || '').toLowerCase().includes(buscaNorm);
                    const matchRegiao = String(m.regiao || '').toLowerCase().includes(buscaNorm);
                    if (!matchNome && !matchCod && !matchRegiao) return;
                }
                const r = m.regiao || '(sem região)';
                if (!map[r]) map[r] = [];
                map[r].push(m);
            });
            const lista = Object.entries(map).map(([regiao, lista]) => {
                const ordenado = [...lista].sort((a, b) => (b.entregas_periodo || 0) - (a.entregas_periodo || 0));
                const porNivel = { 1: 0, 2: 0, 3: 0 };
                ordenado.forEach(m => { porNivel[m.nivel_atual] = (porNivel[m.nivel_atual] || 0) + 1; });
                return { regiao, motoboys: ordenado, total: ordenado.length, porNivel };
            });
            // Ordena regiões por total (maior primeiro)
            return lista.sort((a, b) => b.total - a.total);
        }, [motoboys, busca]);

        // Total geral exibido = soma de todos os cards (já filtrado)
        const totalExibido = useMemo(() => grupos.reduce((s, g) => s + g.total, 0), [grupos]);

        const formatarPodioNome = (nome, max = 22) => {
            if (!nome) return '-';
            return nome.length > max ? nome.substring(0, max - 1) + '…' : nome;
        };

        return h('div', null,
            // Filtros
            h('div', { className: 'bg-white rounded-lg border border-gray-200 p-3 mb-3 flex gap-2 items-center flex-wrap' },
                h('input', {
                    type: 'text',
                    value: busca,
                    placeholder: '🔍 Buscar por motoboy, código ou região...',
                    onChange: e => setBusca(e.target.value),
                    className: 'flex-1 min-w-[220px] px-3 py-2 border rounded-lg text-sm'
                }),
                h('select', {
                    value: filtroNivel,
                    onChange: e => setFiltroNivel(e.target.value),
                    className: 'px-3 py-2 border rounded-lg text-sm'
                },
                    h('option', { value: '' }, 'Todos os níveis'),
                    h('option', { value: '1' }, 'Apenas N1'),
                    h('option', { value: '2' }, 'Apenas N2'),
                    h('option', { value: '3' }, 'Apenas N3')
                ),
                !loading && h('div', { className: 'text-xs text-gray-500 ml-auto' },
                    grupos.length + ' regiões · ' + totalExibido.toLocaleString('pt-BR') + ' motoboys'
                )
            ),

            loading ? h('div', { className: 'text-center py-12 text-gray-500' }, '⏳ Carregando...') :
            grupos.length === 0 ? h('div', { className: 'text-center py-12 text-gray-400 text-sm bg-white rounded-lg border border-gray-200' }, 'Nenhum motoboy encontrado.') :

            // Grid 2 colunas com cards por região
            h('div', { className: 'grid md:grid-cols-2 gap-3' },
                grupos.map(g => {
                    const top3 = g.motoboys.slice(0, 3);
                    return h('div', {
                        key: g.regiao,
                        className: 'bg-white rounded-xl border border-gray-200 p-3 hover:border-purple-300 transition-colors'
                    },
                        // Header região + total
                        h('div', { className: 'flex items-center justify-between mb-2' },
                            h('span', { className: 'text-sm font-semibold text-gray-800' }, '📍 ' + g.regiao),
                            h('span', { className: 'text-[10px] text-gray-400' }, g.total.toLocaleString('pt-BR') + ' total')
                        ),
                        // 3 mini-cards de nível
                        h('div', { className: 'grid grid-cols-3 gap-1.5 mb-2.5' },
                            h('div', { className: 'bg-yellow-50 rounded-md px-2 py-1.5 text-center' },
                                h('div', { className: 'text-[9px] font-semibold text-yellow-800 uppercase' }, 'N3'),
                                h('div', { className: 'text-base font-semibold text-yellow-900 leading-none' }, g.porNivel[3] || 0)
                            ),
                            h('div', { className: 'bg-gray-100 rounded-md px-2 py-1.5 text-center' },
                                h('div', { className: 'text-[9px] font-semibold text-gray-600 uppercase' }, 'N2'),
                                h('div', { className: 'text-base font-semibold text-gray-800 leading-none' }, g.porNivel[2] || 0)
                            ),
                            h('div', { className: 'bg-gray-100 rounded-md px-2 py-1.5 text-center' },
                                h('div', { className: 'text-[9px] font-semibold text-gray-600 uppercase' }, 'N1'),
                                h('div', { className: 'text-base font-semibold text-gray-800 leading-none' }, g.porNivel[1] || 0)
                            )
                        ),
                        // Pódio (top 3)
                        h('div', { className: 'text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1' }, 'Pódio'),
                        h('div', { className: 'space-y-0.5 mb-2.5' },
                            top3.length === 0
                                ? h('div', { className: 'text-xs text-gray-400 italic px-1.5 py-2' }, 'Nenhum motoboy nessa região')
                                : top3.map((m, idx) => h('div', {
                                    key: m.cod_prof,
                                    className: 'flex items-center justify-between text-xs px-1.5 py-1 rounded ' + (idx === 0 ? 'bg-yellow-50' : '')
                                },
                                    h('span', { className: 'truncate flex-1 ' + (idx === 0 ? 'font-medium text-gray-900' : 'text-gray-700') },
                                        (idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : '🥉 '),
                                        formatarPodioNome(m.nome_prof || ('#' + m.cod_prof))
                                    ),
                                    h('span', { className: 'font-semibold ' + (idx === 0 ? 'text-gray-900' : 'text-gray-500') }, m.entregas_periodo)
                                ))
                        ),
                        // Botão drilldown
                        h('button', {
                            onClick: () => setRegiaoModal(g),
                            className: 'w-full text-xs py-1.5 bg-gray-50 hover:bg-purple-50 text-purple-700 hover:text-purple-800 border border-gray-200 hover:border-purple-300 rounded-md font-medium transition-colors'
                        }, 'Ver ranking completo →')
                    );
                })
            ),

            // Modal drilldown — abre quando clica em "Ver ranking completo"
            regiaoModal && h('div', {
                className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4',
                onClick: (e) => { if (e.target === e.currentTarget) setRegiaoModal(null); }
            },
                h('div', { className: 'bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col' },
                    // Header modal
                    h('div', { className: 'bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white flex items-center justify-between flex-shrink-0' },
                        h('div', null,
                            h('h2', { className: 'text-lg font-bold' }, '📍 ' + regiaoModal.regiao),
                            h('p', { className: 'text-purple-200 text-sm' },
                                regiaoModal.total.toLocaleString('pt-BR') + ' motoboys · ',
                                'N3: ' + (regiaoModal.porNivel[3] || 0) + ' · ',
                                'N2: ' + (regiaoModal.porNivel[2] || 0) + ' · ',
                                'N1: ' + (regiaoModal.porNivel[1] || 0)
                            )
                        ),
                        h('button', {
                            onClick: () => setRegiaoModal(null),
                            className: 'text-white/80 hover:text-white text-2xl leading-none'
                        }, '×')
                    ),
                    // Tabela completa
                    h('div', { className: 'flex-1 overflow-auto' },
                        h('table', { className: 'w-full text-sm' },
                            h('thead', { className: 'bg-gray-50 border-b border-gray-200 sticky top-0' },
                                h('tr', null,
                                    ['#', 'Motoboy', 'Nível', 'Entregas (28d)', 'Após 16h', '% Prazo', 'Avaliado em'].map((h2, i) =>
                                        h('th', { key: i, className: 'px-3 py-2 text-left text-xs font-medium text-gray-600' }, h2)
                                    )
                                )
                            ),
                            h('tbody', null, regiaoModal.motoboys.map((m, idx) => h('tr', {
                                key: m.cod_prof,
                                className: 'border-b border-gray-100 hover:bg-gray-50 ' + (idx === 0 ? 'bg-yellow-50/30' : '')
                            },
                                h('td', { className: 'px-3 py-2 text-gray-500 font-mono text-xs w-12' },
                                    idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (idx + 1)
                                ),
                                h('td', { className: 'px-3 py-2 font-medium text-gray-900' }, m.nome_prof || ('#' + m.cod_prof)),
                                h('td', { className: 'px-3 py-2' },
                                    h('span', {
                                        className: 'px-2 py-0.5 rounded text-xs font-bold ' + (m.nivel_atual === 3 ? 'bg-yellow-100 text-yellow-800' : m.nivel_atual === 2 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700')
                                    }, 'N' + m.nivel_atual)
                                ),
                                h('td', { className: 'px-3 py-2 font-semibold' }, m.entregas_periodo),
                                h('td', { className: 'px-3 py-2 text-gray-600' }, m.dias_16h_periodo),
                                h('td', { className: 'px-3 py-2 text-green-700 font-medium' }, parseFloat(m.pct_prazo).toFixed(1) + '%'),
                                h('td', { className: 'px-3 py-2 text-xs text-gray-500' }, fmtData(m.avaliado_em))
                            )))
                        )
                    ),
                    // Footer
                    h('div', { className: 'p-3 border-t flex justify-end flex-shrink-0' },
                        h('button', {
                            onClick: () => setRegiaoModal(null),
                            className: 'px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium text-sm'
                        }, 'Fechar')
                    )
                )
            )
        );
    }

    // ============================================================
    // ABA SORTEIOS
    // ============================================================
    function AbaSorteios({ fetchApi, showToast }) {
        const [sorteios, setSorteios] = useState([]);
        const [loading, setLoading] = useState(true);
        const [mesManual, setMesManual] = useState('');

        // 🔧 FIX loop: refs estáveis
        const fetchApiRef = useRef(fetchApi);
        const showToastRef = useRef(showToast);
        useEffect(() => { fetchApiRef.current = fetchApi; }, [fetchApi]);
        useEffect(() => { showToastRef.current = showToast; }, [showToast]);

        const carregar = useCallback(async () => {
            setLoading(true);
            try {
                const data = await fetchApiRef.current('/score-v2/admin/sorteios');
                setSorteios(data || []);
            } catch (err) { showToastRef.current('❌ ' + err.message, 'error'); }
            finally { setLoading(false); }
        }, []);

        useEffect(() => { carregar(); }, [carregar]);

        const sortearAgora = async () => {
            if (!mesManual.match(/^\d{4}-\d{2}$/)) {
                showToastRef.current('⚠️ Informe mês no formato YYYY-MM', 'warning'); return;
            }
            if (!confirm(`Disparar sorteio manual para ${mesManual}?\n\nVai sortear 1 vencedor por (região × nível) ativo. Operação idempotente — não duplica se já foi sorteado.`)) return;
            try {
                const r = await fetchApiRef.current('/score-v2/admin/sortear-agora', { method: 'POST', body: JSON.stringify({ mes_referencia: mesManual }) });
                showToastRef.current(`✅ ${r.sorteios.length} sorteios realizados`, 'success');
                carregar();
            } catch (err) { showToastRef.current('❌ ' + err.message, 'error'); }
        };

        return h('div', null,
            h('div', { className: 'bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3' },
                h('p', { className: 'text-xs text-purple-900 mb-2 font-medium' }, '🤖 Sorteio automático: dia 1 de cada mês 00:05 (sorteia o mês anterior)'),
                h('div', { className: 'flex gap-2 items-end' },
                    h('div', null,
                        h('label', { className: 'text-xs text-purple-700' }, 'Disparo manual (mês)'),
                        h('input', { type: 'text', placeholder: 'YYYY-MM', value: mesManual, onChange: e => setMesManual(e.target.value), className: 'px-3 py-1.5 border rounded text-sm mt-1' })
                    ),
                    h('button', { onClick: sortearAgora, className: 'px-3 py-1.5 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700' }, '🎲 Sortear')
                )
            ),
            loading ? h('div', { className: 'text-center py-12 text-gray-500' }, '⏳ Carregando...') :
            sorteios.length === 0 ? h('div', { className: 'text-center py-12 text-gray-400 text-sm' }, 'Nenhum sorteio realizado ainda.') :
            h('div', { className: 'bg-white rounded-lg border border-gray-200 overflow-x-auto' },
                h('table', { className: 'w-full text-sm' },
                    h('thead', { className: 'bg-gray-50 border-b border-gray-200' },
                        h('tr', null,
                            ['Mês', 'Região', 'Nível', 'Vencedor', 'Valor', 'Participantes', 'Sorteado em'].map((h2, i) =>
                                h('th', { key: i, className: 'px-3 py-2 text-left text-xs font-medium text-gray-600' }, h2)
                            )
                        )
                    ),
                    h('tbody', null, sorteios.map(s => h('tr', { key: s.id, className: 'border-b border-gray-100' },
                        h('td', { className: 'px-3 py-2 font-medium' }, s.mes_referencia),
                        h('td', { className: 'px-3 py-2' }, s.regiao),
                        h('td', { className: 'px-3 py-2' },
                            h('span', { className: 'px-2 py-0.5 rounded text-xs font-bold ' + (s.nivel === 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-amber-100 text-amber-800') }, 'N' + s.nivel)
                        ),
                        h('td', { className: 'px-3 py-2 font-bold text-purple-900' }, '🏆 ' + (s.vencedor_nome || s.vencedor_cod_prof)),
                        h('td', { className: 'px-3 py-2 font-bold text-green-700' }, fmtBRL(s.valor)),
                        h('td', { className: 'px-3 py-2 text-gray-600' }, s.total_participantes),
                        h('td', { className: 'px-3 py-2 text-xs text-gray-500' }, fmtData(s.sorteado_em))
                    )))
                )
            )
        );
    }

})();
