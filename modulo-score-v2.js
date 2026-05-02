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

    const { useState, useEffect, useCallback, useRef } = React;
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

        // Regiões que ainda não foram configuradas
        const regioesNaoConfig = regioesDisp.filter(r =>
            !configs.some(c => c.regiao.toUpperCase() === r.regiao.toUpperCase())
        );

        if (loading) return h('div', { className: 'text-center py-12 text-gray-500' }, '⏳ Carregando...');

        return h('div', null,
            // CTA: nova região
            regioesNaoConfig.length > 0 && h('div', { className: 'bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4' },
                h('p', { className: 'text-sm text-purple-900 mb-2 font-medium' },
                    `📍 ${regioesNaoConfig.length} região(ões) sem score configurado:`
                ),
                h('div', { className: 'flex flex-wrap gap-2' },
                    regioesNaoConfig.map(r => h('button', {
                        key: r.regiao,
                        onClick: () => setEditando({
                            regiao: r.regiao, ativo: true, niveis_ativos: [2, 3],
                            sorteio_valor_n2: 50, sorteio_valor_n3: 150,
                            saque_teto_n2: 500, saque_teto_n3: 500,
                        }),
                        className: 'px-3 py-1.5 bg-white border border-purple-400 text-purple-700 rounded-md text-xs font-medium hover:bg-purple-100'
                    }, '➕ ' + r.regiao + ' (' + r.total_motoboys + ')'))
                )
            ),

            // Lista de configs
            configs.length === 0 ? h('div', { className: 'text-center py-12 text-gray-400 text-sm' },
                'Nenhuma região configurada. Use os botões acima para começar.'
            ) : h('div', { className: 'space-y-3' },
                configs.map(cfg => h(CardConfig, {
                    key: cfg.id, cfg,
                    onEditar: () => setEditando(cfg),
                    onDesativar: () => desativar(cfg.id, cfg.regiao),
                    onAtivar: async () => salvar({ ...cfg, ativo: true }),
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

    function CardConfig({ cfg, onEditar, onDesativar, onAtivar }) {
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
                h('div', { className: 'flex gap-2' },
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
            sorteio_valor_n2: cfg.sorteio_valor_n2 || 50,
            sorteio_valor_n3: cfg.sorteio_valor_n3 || 150,
            saque_teto_n2: cfg.saque_teto_n2 || 500,
            saque_teto_n3: cfg.saque_teto_n3 || 500,
        });

        const toggleNivel = (n) => {
            const tem = form.niveis_ativos.includes(n);
            setForm({ ...form, niveis_ativos: tem ? form.niveis_ativos.filter(x => x !== n) : [...form.niveis_ativos, n].sort() });
        };

        return h('div', { className: 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4' },
            h('div', { className: 'bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto' },
                h('div', { className: 'p-4 border-b border-gray-200 flex items-center justify-between' },
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
                    // Valores N2
                    form.niveis_ativos.includes(2) && h('div', { className: 'border border-amber-200 bg-amber-50 rounded-lg p-3' },
                        h('h4', { className: 'text-sm font-bold text-amber-900 mb-2' }, '🥈 Nível 2'),
                        h('div', { className: 'grid grid-cols-2 gap-3' },
                            h('div', null,
                                h('label', { className: 'text-xs text-amber-700 font-medium' }, 'Valor do sorteio mensal'),
                                h('input', { type: 'number', step: '0.01', min: 0, value: form.sorteio_valor_n2, onChange: e => setForm({ ...form, sorteio_valor_n2: parseFloat(e.target.value) || 0 }), className: 'w-full px-3 py-2 border rounded-lg text-sm mt-1' })
                            ),
                            h('div', null,
                                h('label', { className: 'text-xs text-amber-700 font-medium' }, 'Teto do saque (mensal)'),
                                h('input', { type: 'number', step: '0.01', min: 0, value: form.saque_teto_n2, onChange: e => setForm({ ...form, saque_teto_n2: parseFloat(e.target.value) || 0 }), className: 'w-full px-3 py-2 border rounded-lg text-sm mt-1' })
                            )
                        )
                    ),
                    // Valores N3
                    form.niveis_ativos.includes(3) && h('div', { className: 'border border-yellow-300 bg-yellow-50 rounded-lg p-3' },
                        h('h4', { className: 'text-sm font-bold text-yellow-900 mb-2' }, '🥇 Nível 3'),
                        h('div', { className: 'grid grid-cols-2 gap-3' },
                            h('div', null,
                                h('label', { className: 'text-xs text-yellow-700 font-medium' }, 'Valor do sorteio mensal'),
                                h('input', { type: 'number', step: '0.01', min: 0, value: form.sorteio_valor_n3, onChange: e => setForm({ ...form, sorteio_valor_n3: parseFloat(e.target.value) || 0 }), className: 'w-full px-3 py-2 border rounded-lg text-sm mt-1' })
                            ),
                            h('div', null,
                                h('label', { className: 'text-xs text-yellow-700 font-medium' }, 'Teto do saque (semanal)'),
                                h('input', { type: 'number', step: '0.01', min: 0, value: form.saque_teto_n3, onChange: e => setForm({ ...form, saque_teto_n3: parseFloat(e.target.value) || 0 }), className: 'w-full px-3 py-2 border rounded-lg text-sm mt-1' })
                            )
                        )
                    ),
                    h('div', { className: 'bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900' },
                        h('p', null, 'ℹ️ Critérios FIXOS por nível (não configuráveis):'),
                        h('ul', { className: 'list-disc ml-4 mt-1 space-y-0.5' },
                            h('li', null, 'N2: ≥150 entregas (28d) E ≥15 dias com 1+ entrega após 16h E 85-90% no prazo'),
                            h('li', null, 'N3: ≥200 entregas (28d) E ≥20 dias com 1+ entrega após 16h E ≥90% no prazo')
                        )
                    )
                ),
                h('div', { className: 'p-4 border-t border-gray-200 flex gap-2' },
                    h('button', { onClick: onCancelar, className: 'flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50' }, 'Cancelar'),
                    h('button', { onClick: () => onSalvar(form), className: 'flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium text-sm hover:bg-purple-700' }, '💾 Salvar')
                )
            )
        );
    }

    // ============================================================
    // ABA MOTOBOYS POR NÍVEL
    // ============================================================
    function AbaMotoboys({ fetchApi, showToast }) {
        const [filtroRegiao, setFiltroRegiao] = useState('');
        const [filtroNivel, setFiltroNivel] = useState('');
        const [motoboys, setMotoboys] = useState([]);
        const [loading, setLoading] = useState(false);

        // 🔧 FIX loop: refs estáveis
        const fetchApiRef = useRef(fetchApi);
        const showToastRef = useRef(showToast);
        useEffect(() => { fetchApiRef.current = fetchApi; }, [fetchApi]);
        useEffect(() => { showToastRef.current = showToast; }, [showToast]);

        const carregar = useCallback(async () => {
            setLoading(true);
            try {
                const params = [];
                if (filtroRegiao) params.push('regiao=' + encodeURIComponent(filtroRegiao));
                if (filtroNivel) params.push('nivel=' + filtroNivel);
                const data = await fetchApiRef.current('/score-v2/admin/motoboys-por-nivel?' + params.join('&'));
                setMotoboys(data || []);
            } catch (err) { showToastRef.current('❌ ' + err.message, 'error'); }
            finally { setLoading(false); }
        }, [filtroRegiao, filtroNivel]);

        useEffect(() => { carregar(); }, [carregar]);

        return h('div', null,
            h('div', { className: 'bg-white rounded-lg border border-gray-200 p-3 mb-3 flex gap-3 items-end' },
                h('div', { className: 'flex-1' },
                    h('label', { className: 'text-xs font-medium text-gray-600' }, 'Região'),
                    h('input', { type: 'text', value: filtroRegiao, placeholder: 'Ex: Salvador', onChange: e => setFiltroRegiao(e.target.value), className: 'w-full px-3 py-2 border rounded-lg text-sm mt-1' })
                ),
                h('div', null,
                    h('label', { className: 'text-xs font-medium text-gray-600' }, 'Nível'),
                    h('select', { value: filtroNivel, onChange: e => setFiltroNivel(e.target.value), className: 'w-full px-3 py-2 border rounded-lg text-sm mt-1' },
                        h('option', { value: '' }, 'Todos'),
                        h('option', { value: '1' }, 'Nível 1'),
                        h('option', { value: '2' }, 'Nível 2'),
                        h('option', { value: '3' }, 'Nível 3')
                    )
                )
            ),
            loading ? h('div', { className: 'text-center py-12 text-gray-500' }, '⏳ Carregando...') :
            motoboys.length === 0 ? h('div', { className: 'text-center py-12 text-gray-400 text-sm' }, 'Nenhum motoboy avaliado ainda.') :
            h('div', { className: 'bg-white rounded-lg border border-gray-200 overflow-x-auto' },
                h('table', { className: 'w-full text-sm' },
                    h('thead', { className: 'bg-gray-50 border-b border-gray-200' },
                        h('tr', null,
                            ['Motoboy', 'Região', 'Nível', 'Entregas (28d)', 'Dias 16h+', '% Prazo', 'Avaliado em'].map((h2, i) =>
                                h('th', { key: i, className: 'px-3 py-2 text-left text-xs font-medium text-gray-600' }, h2)
                            )
                        )
                    ),
                    h('tbody', null, motoboys.map(m => h('tr', { key: m.cod_prof, className: 'border-b border-gray-100 hover:bg-gray-50' },
                        h('td', { className: 'px-3 py-2 font-medium text-gray-900' }, m.nome_prof || m.cod_prof),
                        h('td', { className: 'px-3 py-2 text-gray-600' }, m.regiao || '-'),
                        h('td', { className: 'px-3 py-2' },
                            h('span', { className: 'px-2 py-0.5 rounded text-xs font-bold ' + (m.nivel_atual === 3 ? 'bg-yellow-100 text-yellow-800' : m.nivel_atual === 2 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700') }, 'N' + m.nivel_atual)
                        ),
                        h('td', { className: 'px-3 py-2' }, m.entregas_periodo),
                        h('td', { className: 'px-3 py-2' }, m.dias_16h_periodo),
                        h('td', { className: 'px-3 py-2' }, parseFloat(m.pct_prazo).toFixed(1) + '%'),
                        h('td', { className: 'px-3 py-2 text-xs text-gray-500' }, fmtData(m.avaliado_em))
                    )))
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
