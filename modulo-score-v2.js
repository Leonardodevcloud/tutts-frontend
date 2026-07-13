// ==================== MÓDULO SCORE V2 (ADMIN) ====================
// Arquivo: modulo-score-v2.js
// Tela admin pra configurar score por região + ver sorteios + motoboys.
//
// Estrutura:
//   - Aba "Configurações": ativa/desativa score por região, valores
//   - Aba "Motoboys por Categoria": lista quem está em cada categoria (Bronze/Prata/Ouro)
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
            h('div', { className: 'flex items-center gap-3 mb-5' },
                h('div', { className: 'w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-xl shadow-sm' }, '🏆'),
                h('div', null,
                    h('h2', { className: 'text-lg font-semibold text-gray-900 leading-tight' }, 'Score dos profissionais'),
                    h('p', { className: 'text-xs text-gray-500' }, 'Gamificação por praça')
                )
            ),
            h('div', { className: 'flex gap-1 bg-gray-100 p-1 rounded-xl mb-5 overflow-x-auto' },
                [
                    { id: 'configuracoes', label: 'Configurações', icon: '⚙️' },
                    { id: 'aproveitamento', label: 'Aproveitamento', icon: '📉' },
                    { id: 'motoboys', label: 'Categorias', icon: '🏅' },
                    { id: 'ranking', label: 'Ranking', icon: '📅' },
                    { id: 'sorteios', label: 'Sorteios', icon: '🎁' },
                ].map(t => h('button', {
                    key: t.id,
                    onClick: () => setTab(t.id),
                    className: 'flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ' +
                        (tab === t.id ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-white/70')
                }, h('span', null, t.icon), h('span', null, t.label)))
            ),
            tab === 'configuracoes' && h(AbaConfiguracoes, { fetchApi, showToast }),
            tab === 'aproveitamento' && h(AbaAproveitamento, { fetchApi, showToast }),
            tab === 'motoboys' && h(AbaMotoboys, { fetchApi, showToast }),
            tab === 'ranking' && h(AbaRanking, { fetchApi, showToast }),
            tab === 'sorteios' && h(AbaSorteios, { fetchApi, showToast })
        );
    };

    // ============================================================
    // 🆕 ABA APROVEITAMENTO SEMANAL
    // ============================================================
    function AbaAproveitamento({ fetchApi, showToast }) {
        const [configs, setConfigs] = useState([]);
        const [regiaoSel, setRegiaoSel] = useState('');
        const [dados, setDados] = useState(null);
        const [loading, setLoading] = useState(false);
        // 🆕 2026-07: data de referência (fim da janela de 7 dias). '' = últimos 7 dias (hoje).
        const [dataRef, setDataRef] = useState('');

        const fetchApiRef = useRef(fetchApi);
        const showToastRef = useRef(showToast);
        useEffect(() => { fetchApiRef.current = fetchApi; }, [fetchApi]);
        useEffect(() => { showToastRef.current = showToast; }, [showToast]);

        // Semana ISO 'AAAA-Www' de uma data (mesma régua do backend). Sem data = hoje.
        const isoSemana = (dateStr) => {
            const base = dateStr ? new Date(dateStr + 'T12:00:00') : new Date();
            const d = new Date(Date.UTC(base.getFullYear(), base.getMonth(), base.getDate()));
            const dayNum = d.getUTCDay() || 7;
            d.setUTCDate(d.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            const semana = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
            return d.getUTCFullYear() + '-W' + String(semana).padStart(2, '0');
        };

        // Carrega praças com a regra ativa pro seletor
        useEffect(() => {
            (async () => {
                try {
                    const cfgs = await fetchApiRef.current('/score-v2/admin/configuracoes');
                    const comRegra = (cfgs || []).filter(c => c.regra_aproveitamento_ativa);
                    setConfigs(comRegra);
                    if (comRegra.length > 0 && !regiaoSel) setRegiaoSel(comRegra[0].regiao);
                } catch (err) { showToastRef.current('❌ ' + err.message, 'error'); }
            })();
        }, []);

        // Carrega alertas: filtra por praça + (opcional) semana da dataRef escolhida.
        const carregar = useCallback(async (regiao, semanaRef) => {
            setLoading(true);
            try {
                const params = [];
                if (regiao) params.push('regiao=' + encodeURIComponent(regiao));
                if (semanaRef) params.push('semana=' + encodeURIComponent(semanaRef));
                const q = params.length ? ('?' + params.join('&')) : '';
                const r = await fetchApiRef.current('/score-v2/admin/alertas-aproveitamento' + q);
                setDados(r || { alertas: [], total: 0 });
            } catch (err) {
                showToastRef.current('❌ ' + err.message, 'error');
            } finally { setLoading(false); }
        }, []);

        // Recarrega sempre que praça ou dataRef muda (dataRef vazio = semana atual)
        useEffect(() => {
            if (regiaoSel) carregar(regiaoSel, dataRef ? isoSemana(dataRef) : null);
        }, [regiaoSel, dataRef, carregar]);

        if (configs.length === 0) {
            return h('div', { className: 'max-w-2xl mx-auto p-6 text-center' },
                h('div', { className: 'bg-white rounded-xl border border-gray-200 p-8' },
                    h('p', { className: 'text-4xl mb-2' }, '📉'),
                    h('p', { className: 'text-sm font-medium text-gray-700' }, 'Nenhuma praça com a regra de aproveitamento ativa'),
                    h('p', { className: 'text-xs text-gray-500 mt-1' }, 'Ative a regra no botão "Editar" de uma praça, na aba Configurações.')
                )
            );
        }

        const alertas = dados?.alertas || [];
        const reincidentes = alertas.filter(a => (a.semanas_consecutivas || 1) >= 2).length;
        const naoVistos = alertas.filter(a => !a.visto_em).length;

        const badgeSemanas = (n) => {
            n = n || 1;
            const cor = n >= 2 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800';
            const txt = n === 1 ? '1ª semana' : (n + 'ª semana seguida');
            return h('span', { className: 'text-[11px] px-2 py-0.5 rounded-full ' + cor }, txt);
        };
        const iniciais = (nome) => (nome || '?').split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();

        // Dispara a análise. Se dataRef preenchida, reprocessa a janela que TERMINA nela (períodos antigos).
        const forcarAnalise = async () => {
            try {
                const body = dataRef ? { data_ref: dataRef } : {};
                showToastRef.current(dataRef ? ('⏳ Analisando janela até ' + dataRef + '...') : '⏳ Analisando últimos 7 dias...', 'info');
                const r = await fetchApiRef.current('/score-v2/admin/avaliar-aproveitamento', { method: 'POST', body: JSON.stringify(body) });
                showToastRef.current('✅ ' + (r?.mensagem || 'Análise concluída'), 'success');
                carregar(regiaoSel, dataRef ? isoSemana(dataRef) : null);
            } catch (err) { showToastRef.current('❌ ' + err.message, 'error'); }
        };

        return h('div', { className: 'max-w-4xl mx-auto p-4 md:p-6 space-y-4' },
            h('div', { className: 'flex items-center justify-between gap-3 flex-wrap' },
                h('div', null,
                    h('h3', { className: 'text-base font-bold text-gray-900' }, '📉 Aproveitamento semanal'),
                    h('p', { className: 'text-xs text-gray-500' }, (dataRef ? 'Janela de 7 dias até ' + dataRef : 'Últimos 7 dias') + (dados?.semana ? (' · ' + dados.semana) : ''))
                ),
                h('select', {
                    value: regiaoSel, onChange: e => setRegiaoSel(e.target.value),
                    className: 'px-3 py-2 border border-gray-300 rounded-lg text-sm'
                }, configs.map(c => h('option', { key: c.regiao, value: c.regiao }, c.regiao + ' (mín. ' + (c.pct_min_aproveitamento || 95) + '%)')))
            ),

            // 🆕 Barra de reprocessamento (períodos antigos)
            h('div', { className: 'bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-end gap-3 flex-wrap' },
                h('div', null,
                    h('label', { className: 'text-[11px] text-purple-700 font-medium block mb-1' }, 'Fim da janela (deixe vazio = hoje)'),
                    h('input', {
                        type: 'date', value: dataRef, max: new Date().toISOString().slice(0, 10),
                        onChange: e => setDataRef(e.target.value),
                        className: 'px-3 py-1.5 border border-purple-200 rounded-lg text-sm'
                    })
                ),
                dataRef && h('button', {
                    onClick: () => setDataRef(''),
                    className: 'px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-white'
                }, 'Voltar pra hoje'),
                h('div', { className: 'flex-1' }),
                h('button', {
                    onClick: forcarAnalise,
                    className: 'px-3 py-2 text-xs font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700'
                }, dataRef ? '🔄 Reprocessar essa semana' : '🔄 Analisar últimos 7 dias')
            ),

            h('div', { className: 'grid grid-cols-3 gap-3' },
                h('div', { className: 'bg-white rounded-lg border border-gray-200 p-3 text-center' },
                    h('p', { className: 'text-xs text-gray-500' }, 'Sinalizados'),
                    h('p', { className: 'text-2xl font-bold text-gray-900' }, alertas.length)
                ),
                h('div', { className: 'bg-red-50 rounded-lg border border-red-100 p-3 text-center' },
                    h('p', { className: 'text-xs text-red-700' }, 'Reincidentes (2+)'),
                    h('p', { className: 'text-2xl font-bold text-red-800' }, reincidentes)
                ),
                h('div', { className: 'bg-amber-50 rounded-lg border border-amber-100 p-3 text-center' },
                    h('p', { className: 'text-xs text-amber-700' }, 'Aviso não visto'),
                    h('p', { className: 'text-2xl font-bold text-amber-800' }, naoVistos)
                )
            ),

            loading
                ? h('div', { className: 'text-center text-gray-400 py-8 text-sm' }, '⏳ Carregando...')
                : alertas.length === 0
                    ? h('div', { className: 'bg-green-50 border border-green-200 rounded-xl p-6 text-center' },
                        h('p', { className: 'text-3xl mb-1' }, '✅'),
                        h('p', { className: 'text-sm font-medium text-green-800' }, 'Ninguém abaixo do mínimo nesta semana'))
                    : h('div', { className: 'space-y-2' }, alertas.map(a =>
                        h('div', { key: a.cod_prof, className: 'flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-3' },
                            h('div', { className: 'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ' + ((a.semanas_consecutivas || 1) >= 2 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800') }, iniciais(a.nome_prof)),
                            h('div', { className: 'flex-1 min-w-0' },
                                h('div', { className: 'flex items-center gap-2' },
                                    h('span', { className: 'text-sm font-semibold text-gray-900 truncate' }, a.nome_prof || a.cod_prof),
                                    badgeSemanas(a.semanas_consecutivas)
                                ),
                                h('p', { className: 'text-xs text-gray-500' }, 'cód ' + a.cod_prof + ' · ' + (a.entregas_prazo || 0) + ' de ' + (a.entregas_total || 0) + ' no prazo')
                            ),
                            h('div', { className: 'text-right' },
                                h('p', { className: 'text-lg font-bold ' + ((a.semanas_consecutivas || 1) >= 2 ? 'text-red-700' : 'text-amber-700') }, (Number(a.pct_prazo) || 0).toFixed(1) + '%'),
                                h('p', { className: 'text-[11px] ' + (a.visto_em ? 'text-green-600' : 'text-gray-400') }, a.visto_em ? '✓ aviso visto' : '• aviso não visto')
                            )
                        )
                    ))
        );
    }

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
                showToast(`✅ ${r.processados} avaliados — Bronze:${r.niveis[1]} Prata:${r.niveis[2]} Ouro:${r.niveis[3]}`, 'success');
                carregar();
            } catch (err) {
                showToast('❌ ' + err.message, 'error');
            }
        };

        // 🆕 2026-07: recalcular TODAS as praças de uma vez (nível + aproveitamento).
        const recalcularTudo = async () => {
            if (!confirm('Recalcular TODAS as praças agora?\n\nRecalcula o nível de todos os motoboys de todas as praças ativas (CRM + Planilha) e roda a análise de aproveitamento. Pode demorar alguns minutos.')) return;
            try {
                showToast('🔄 Recalculando todas as praças... aguarde', 'info');
                const r = await fetchApi('/score-v2/admin/avaliar-agora', { method: 'POST', body: '{}' });
                const mud = (r.mudancas || []).length;
                showToast('✅ ' + (r.processados || 0) + ' motoboys · ' + (r.regioes || 0) + ' praças · ' + mud + ' mudanças de nível', 'success');
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
            // 🆕 2026-07: cabeçalho com recálculo global de todas as praças
            h('div', { className: 'flex items-center justify-between gap-3 mb-3 flex-wrap' },
                h('div', null,
                    h('h3', { className: 'text-base font-bold text-gray-900' }, 'Praças configuradas'),
                    h('p', { className: 'text-xs text-gray-500' }, 'Critérios, bonificações e regras por região')
                ),
                h('button', {
                    onClick: recalcularTudo,
                    className: 'px-3 py-2 text-xs font-medium text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-50'
                }, '🔄 Recalcular todas as praças')
            ),

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
        const [aberto, setAberto] = useState(false);
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

        return h('div', { className: 'bg-white border border-gray-200 rounded-2xl mb-4 overflow-hidden', style: { borderLeft: '3px solid #7c3aed' } },
            h('button', {
                onClick: () => setAberto(!aberto),
                className: 'w-full flex items-center justify-between gap-2 p-4 hover:bg-gray-50 transition-colors text-left'
            },
                h('div', { className: 'flex items-center gap-2' },
                    h('span', { className: 'text-base' }, '📍'),
                    h('span', { className: 'text-sm font-semibold text-gray-900' }, 'Configurar nova praça')
                ),
                h('div', { className: 'flex items-center gap-2' },
                    h('span', { className: 'text-[11px] font-medium bg-purple-50 text-purple-700 rounded-full', style: { padding: '4px 10px' } },
                        regioes.length + ' praças · ' + totalMotoboys.toLocaleString('pt-BR')),
                    h('span', { className: 'text-gray-400', style: { fontSize: '11px', transition: 'transform .2s', transform: aberto ? 'rotate(180deg)' : 'none', display: 'inline-block' } }, '▼')
                )
            ),
            aberto && h('div', { className: 'px-4 pb-4' },
                h('div', { className: 'relative mb-3' },
                    h('span', { className: 'absolute text-gray-400', style: { left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px' } }, '🔍'),
                    h('input', {
                        type: 'text', value: busca, placeholder: 'Buscar praça...',
                        onChange: e => setBusca(e.target.value),
                        className: 'w-full border border-gray-200 bg-gray-50 rounded-lg text-sm focus:bg-white focus:border-purple-300 focus:outline-none transition-colors',
                        style: { padding: '10px 12px 10px 36px' }
                    })
                ),
                filtradas.length === 0
                    ? h('div', { className: 'text-center py-6 text-gray-400 text-sm' },
                        busca ? ('Nenhuma praça com "' + busca + '"') : 'Nenhuma praça disponível'
                    )
                    : h('div', { className: 'flex flex-wrap gap-2' },
                        exibidas.map(r => h('button', {
                            key: r.regiao,
                            onClick: () => onSelecionar(r),
                            className: 'inline-flex items-center gap-2 bg-gray-50 hover:bg-purple-50 border border-gray-200 hover:border-purple-200 text-gray-800 rounded-full text-xs font-medium transition-colors',
                            style: { padding: '5px 11px 5px 5px' }
                        },
                            h('span', { className: 'inline-flex items-center justify-center bg-purple-600 text-white rounded-full', style: { width: '18px', height: '18px', fontSize: '13px', lineHeight: '1' } }, '+'),
                            h('span', null, r.regiao),
                            r.total_motoboys != null && h('span', {
                                className: 'bg-purple-50 text-purple-700 rounded-full text-[10px] font-medium',
                                style: { padding: '1px 7px' }
                            }, r.total_motoboys.toLocaleString('pt-BR'))
                        ))
                    ),
                !busca && !mostrarTodas && restantes > 0 && h('button', {
                    onClick: () => setMostrarTodas(true),
                    className: 'w-full mt-3 py-2.5 bg-transparent border border-dashed border-gray-300 hover:border-purple-300 hover:bg-purple-50 rounded-lg text-xs text-purple-700 font-medium transition-colors'
                }, 'Ver mais ' + restantes + ' praça(s) ↓'),
                !busca && mostrarTodas && regioes.length > VISIVEIS_INICIAL && h('button', {
                    onClick: () => setMostrarTodas(false),
                    className: 'w-full mt-3 py-2.5 bg-transparent border border-dashed border-gray-300 hover:border-gray-400 rounded-lg text-xs text-gray-500 font-medium transition-colors'
                }, 'Ver menos ↑')
            )
        );
    }

    function CardConfig({ cfg, onEditar, onDesativar, onAtivar, onReavaliar }) {
        const niveis = Array.isArray(cfg.niveis_ativos) ? cfg.niveis_ativos : (typeof cfg.niveis_ativos === 'string' ? JSON.parse(cfg.niveis_ativos) : []);
        const ativo = cfg.ativo !== false;
        const counts = cfg.motoboys_por_nivel || { 1: 0, 2: 0, 3: 0 };

        const miniCard = (cor, emoji, titulo, valor, l1, l2) => h('div', {
            className: 'rounded-xl border border-gray-200 p-3',
            style: { borderLeft: '3px solid ' + cor.bar, background: cor.bg }
        },
            h('div', { className: 'flex items-center gap-1.5 text-xs font-medium', style: { color: cor.txt } }, h('span', null, emoji), h('span', null, titulo)),
            h('div', { className: 'text-xl font-bold mt-0.5', style: { color: cor.num } }, valor),
            l1 && h('div', { className: 'text-[10px] mt-0.5', style: { color: cor.txt } }, l1),
            l2 && h('div', { className: 'text-[10px]', style: { color: cor.txt } }, l2)
        );

        return h('div', {
            className: 'bg-white border border-gray-200 rounded-2xl p-4 ' + (ativo ? '' : 'opacity-60'),
            style: { borderLeft: '3px solid ' + (ativo ? '#7c3aed' : '#cbd5e1') }
        },
            h('div', { className: 'flex items-start justify-between gap-3 mb-4 flex-wrap' },
                h('div', null,
                    h('div', { className: 'flex items-center gap-2' },
                        h('span', { className: 'text-base' }, '📍'),
                        h('h3', { className: 'font-semibold text-gray-900' }, cfg.regiao),
                        h('span', { className: 'px-2.5 py-0.5 rounded-full text-[11px] font-medium ' + (ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500') },
                            ativo ? 'Ativo' : 'Inativo'
                        )
                    ),
                    h('p', { className: 'text-xs text-gray-400 mt-1' },
                        niveis.map(n => n === 3 ? 'Ouro' : n === 2 ? 'Prata' : 'Bronze').join(', ') +
                        ' · atualizado ' + fmtData(cfg.atualizado_em)
                    )
                ),
                h('div', { className: 'flex gap-2 flex-wrap' },
                    ativo && h('button', {
                        onClick: onReavaliar,
                        className: 'px-3 py-1.5 text-gray-600 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50',
                        title: 'Re-avaliar todos os motoboys da região agora'
                    }, '🔄 Reavaliar'),
                    ativo
                        ? h('button', { onClick: onDesativar, className: 'px-3 py-1.5 text-gray-500 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50' }, '⏸ Desativar')
                        : h('button', { onClick: onAtivar, className: 'px-3 py-1.5 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium hover:bg-emerald-50' }, '▶ Reativar'),
                    h('button', { onClick: onEditar, className: 'px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700' }, '✏️ Editar')
                )
            ),
            h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-2.5' },
                miniCard({ bar: '#b45309', bg: '#fff', txt: '#92400e', num: '#1f2937' }, '🥉', 'Bronze', counts[1], 'base da praça'),
                miniCard({ bar: '#64748b', bg: '#fff', txt: '#475569', num: '#1f2937' }, '🥈', 'Prata', counts[2], 'sorteio ' + fmtBRL(cfg.sorteio_valor_n2), 'saque ' + fmtBRL(cfg.saque_teto_n2) + '/mês'),
                miniCard({ bar: '#f67602', bg: '#fef6ee', txt: '#854f0b', num: '#633806' }, '🥇', 'Ouro', counts[3], 'sorteio ' + fmtBRL(cfg.sorteio_valor_n3), 'saque ' + fmtBRL(cfg.saque_teto_n3) + '/sem'),
                miniCard({ bar: '#7c3aed', bg: '#f5f3ff', txt: '#6d28d9', num: '#4c1d95' }, '👥', 'Total', (counts[1] + counts[2] + counts[3]), 'avaliados')
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
            n2_min_entregas: cfg.n2_min_entregas != null ? Number(cfg.n2_min_entregas) : 80,
            n2_min_dias_16h: cfg.n2_min_dias_16h != null ? Number(cfg.n2_min_dias_16h) : 15,
            n2_min_pct_prazo: cfg.n2_min_pct_prazo != null ? Number(cfg.n2_min_pct_prazo) : 80,
            n3_min_entregas: cfg.n3_min_entregas != null ? Number(cfg.n3_min_entregas) : 150,
            n3_min_dias_16h: cfg.n3_min_dias_16h != null ? Number(cfg.n3_min_dias_16h) : 20,
            n3_min_pct_prazo: cfg.n3_min_pct_prazo != null ? Number(cfg.n3_min_pct_prazo) : 88,
            regra_aproveitamento_ativa: cfg.regra_aproveitamento_ativa === true,
            pct_min_aproveitamento: cfg.pct_min_aproveitamento != null ? Number(cfg.pct_min_aproveitamento) : 95,
            // 🆕 2026-07: modelo novo (qualidade define + presença no pico destrava)
            min_entregas_elegivel: cfg.min_entregas_elegivel != null ? Number(cfg.min_entregas_elegivel) : 40,
            pct_prata: cfg.pct_prata != null ? Number(cfg.pct_prata) : 85,
            pct_ouro: cfg.pct_ouro != null ? Number(cfg.pct_ouro) : 92,
            dias_pico_prata: cfg.dias_pico_prata != null ? Number(cfg.dias_pico_prata) : 12,
            dias_pico_ouro: cfg.dias_pico_ouro != null ? Number(cfg.dias_pico_ouro) : 18,
            hora_corte_pico: cfg.hora_corte_pico != null ? Number(cfg.hora_corte_pico) : 16,
        });

        const toggleNivel = (n) => {
            const tem = form.niveis_ativos.includes(n);
            setForm({ ...form, niveis_ativos: tem ? form.niveis_ativos.filter(x => x !== n) : [...form.niveis_ativos, n].sort() });
        };

        // Input numerico compacto e consistente (borda fina, foco roxo)
        const numInput = (key, step, min, max) => h('input', {
            type: 'number', step: step || 1, min: min != null ? min : 0, max: max,
            value: form[key],
            onChange: e => setForm({ ...form, [key]: parseFloat(e.target.value) || 0 }),
            className: 'w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm mt-1 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200'
        });

        // Card de categoria (Prata=2 / Ouro=3) — grid 3 criterios + 2 bonificacoes
        const cardCategoria = (nivel) => {
            const isOuro = nivel === 3;
            const pk = isOuro ? 'n3' : 'n2';
            const badge = h('span', {
                className: 'text-[11px] font-bold px-2.5 py-0.5 rounded-full ' + (isOuro ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600')
            }, isOuro ? 'OURO' : 'PRATA');
            const tetoLabel = isOuro ? 'Teto saque / sem (R$)' : 'Teto saque / mês (R$)';
            return h('div', { className: 'border border-gray-200 rounded-xl p-3.5 space-y-3' },
                h('div', { className: 'flex items-center gap-2' },
                    badge,
                    h('span', { className: 'text-[11px] text-gray-400' }, 'bonificações desta categoria')
                ),
                h('div', { className: 'grid grid-cols-2 gap-2.5' },
                    h('div', null, h('label', { className: 'text-[11px] text-gray-500 font-medium' }, 'Sorteio mensal (R$)'), numInput('sorteio_valor_' + pk, 0.01, 0)),
                    h('div', null, h('label', { className: 'text-[11px] text-gray-500 font-medium' }, tetoLabel), numInput('saque_teto_' + pk, 0.01, 0))
                )
            );
        };

        return h('div', { className: 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4' },
            h('div', { className: 'bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col' },
                // Header
                h('div', { className: 'px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0' },
                    h('div', { className: 'flex items-center gap-2.5' },
                        h('span', { className: 'text-xl' }, '⚙️'),
                        h('div', null,
                            h('div', { className: 'text-[15px] font-bold text-gray-900 leading-tight' }, cfg.id ? 'Editar regras' : 'Configurar praça'),
                            h('div', { className: 'text-xs text-gray-400' }, form.regiao)
                        )
                    ),
                    h('button', { onClick: onCancelar, className: 'w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg text-xl' }, '×')
                ),
                // Body
                h('div', { className: 'px-5 py-4 space-y-3.5 overflow-y-auto' },
                    // Score ativo
                    h('label', { className: 'flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 cursor-pointer' },
                        h('div', null,
                            h('div', { className: 'text-[13px] font-semibold text-gray-800' }, 'Score ativo nesta praça'),
                            h('div', { className: 'text-[11px] text-gray-400' }, 'Motoboys da região passam a ver e ganhar score')
                        ),
                        h('input', { type: 'checkbox', checked: form.ativo, onChange: e => setForm({ ...form, ativo: e.target.checked }), className: 'w-5 h-5 accent-purple-600' })
                    ),
                    // Categorias
                    h('div', null,
                        h('div', { className: 'text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2' }, 'Categorias ativas'),
                        h('div', { className: 'flex gap-2' },
                            [2, 3].map(n => h('label', { key: n, className: 'flex-1 flex items-center gap-2 px-3 py-2 border rounded-xl cursor-pointer transition ' + (form.niveis_ativos.includes(n) ? 'border-purple-300 bg-purple-50' : 'border-gray-200 hover:border-gray-300') },
                                h('input', { type: 'checkbox', checked: form.niveis_ativos.includes(n), onChange: () => toggleNivel(n), className: 'accent-purple-600' }),
                                h('span', { className: 'text-[13px] font-medium ' + (form.niveis_ativos.includes(n) ? 'text-purple-800' : 'text-gray-600') }, n === 3 ? 'Ouro' : 'Prata')
                            ))
                        )
                    ),
                    // Cards por categoria
                    // 🆕 2026-07: Regras de nível (modelo novo — qualidade define, presença destrava)
                    h('div', { className: 'border border-purple-200 rounded-xl p-3.5 space-y-3' },
                        h('div', { className: 'flex items-center gap-2' },
                            h('span', { className: 'text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700' }, 'REGRAS DE NÍVEL'),
                            h('span', { className: 'text-[11px] text-gray-400' }, 'qualidade define, presença destrava')
                        ),
                        h('div', { className: 'grid grid-cols-2 gap-2.5' },
                            h('div', null, h('label', { className: 'text-[11px] text-gray-500 font-medium' }, 'Porta de entrada (entregas)'), numInput('min_entregas_elegivel', 1, 0)),
                            h('div', null, h('label', { className: 'text-[11px] text-gray-500 font-medium' }, 'Hora de corte do pico (h)'), numInput('hora_corte_pico', 1, 0, 23))
                        ),
                        h('div', { className: 'grid grid-cols-2 gap-2.5 pt-3 border-t border-purple-100' },
                            h('div', null, h('label', { className: 'text-[11px] text-gray-500 font-medium' }, '🥈 Prata — % no prazo'), numInput('pct_prata', 0.1, 0, 100)),
                            h('div', null, h('label', { className: 'text-[11px] text-gray-500 font-medium' }, '🥈 Prata — dias no pico'), numInput('dias_pico_prata', 1, 0))
                        ),
                        h('div', { className: 'grid grid-cols-2 gap-2.5' },
                            h('div', null, h('label', { className: 'text-[11px] text-gray-500 font-medium' }, '🥇 Ouro — % no prazo'), numInput('pct_ouro', 0.1, 0, 100)),
                            h('div', null, h('label', { className: 'text-[11px] text-gray-500 font-medium' }, '🥇 Ouro — dias no pico'), numInput('dias_pico_ouro', 1, 0))
                        ),
                        h('div', { className: 'text-[11px] text-gray-500 bg-gray-50 rounded-lg p-2 leading-relaxed' },
                            'O nível é o ', h('b', null, 'menor'), ' entre o que a qualidade dá e o que a presença permite. Sem os dias no pico, trava embaixo — por melhor que seja o % no prazo.'
                        )
                    ),
                    form.niveis_ativos.includes(2) && cardCategoria(2),
                    form.niveis_ativos.includes(3) && cardCategoria(3),
                    // Aproveitamento semanal
                    h('div', { className: 'border border-gray-200 rounded-xl p-3.5' },
                        h('label', { className: 'flex items-start justify-between gap-3 cursor-pointer' },
                            h('div', { className: 'flex gap-2.5' },
                                h('span', { className: 'text-base leading-none mt-0.5' }, '📉'),
                                h('div', null,
                                    h('div', { className: 'text-[13px] font-semibold text-gray-800' }, 'Alerta de aproveitamento semanal'),
                                    h('div', { className: 'text-[11px] text-gray-400' }, 'Todo sábado avalia os últimos 7 dias. Quem fica abaixo do mínimo é sinalizado no painel e avisado no app.')
                                )
                            ),
                            h('input', { type: 'checkbox', checked: form.regra_aproveitamento_ativa, onChange: e => setForm({ ...form, regra_aproveitamento_ativa: e.target.checked }), className: 'w-5 h-5 accent-purple-600 flex-shrink-0' })
                        ),
                        form.regra_aproveitamento_ativa && h('div', { className: 'flex items-center gap-2.5 mt-3 pt-3 border-t border-gray-100' },
                            h('span', { className: 'text-[12px] text-gray-500' }, '% mínimo no prazo'),
                            h('input', {
                                type: 'number', step: 0.1, min: 0, max: 100,
                                value: form.pct_min_aproveitamento,
                                onChange: e => setForm({ ...form, pct_min_aproveitamento: parseFloat(e.target.value) || 0 }),
                                className: 'w-24 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200'
                            })
                        )
                    ),
                    // Dica
                    h('div', { className: 'bg-blue-50 rounded-xl p-3 text-[11px] text-blue-900 leading-relaxed' },
                        h('span', { className: 'font-semibold' }, '💡 '),
                        'Ao salvar, todos os motoboys da praça são recalculados em background com os novos critérios. Pra conferir a contagem por categoria, use a aba "Motoboys por Categoria".'
                    )
                ),
                // Footer
                h('div', { className: 'px-5 py-3.5 border-t border-gray-100 flex gap-2.5 flex-shrink-0' },
                    h('button', { onClick: onCancelar, className: 'flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-medium text-[13px] hover:bg-gray-50' }, 'Cancelar'),
                    h('button', { onClick: () => onSalvar(form), className: 'flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl font-semibold text-[13px] hover:bg-purple-700 flex items-center justify-center gap-1.5' }, '💾 Salvar e recalcular praça')
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
                // 🆕 2026-05 v3: ordena por CLASSIFICAÇÃO (nível desc) e dentro do
                // nível desempata por % prazo desc — antes ordenava só por entregas,
                // o que afundava motoboys Ouro com poucas entregas pra baixo da lista.
                const ordenado = [...lista].sort((a, b) => {
                    const nivelA = a.nivel_atual || 1;
                    const nivelB = b.nivel_atual || 1;
                    if (nivelA !== nivelB) return nivelB - nivelA; // Ouro(3) → Prata(2) → Bronze(1)
                    const prazoA = parseFloat(a.pct_prazo) || 0;
                    const prazoB = parseFloat(b.pct_prazo) || 0;
                    return prazoB - prazoA; // dentro do nível, % prazo desc
                });
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
                    h('option', { value: '' }, 'Todas as categorias'),
                    h('option', { value: '1' }, 'Apenas Bronze'),
                    h('option', { value: '2' }, 'Apenas Prata'),
                    h('option', { value: '3' }, 'Apenas Ouro')
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
                        // 3 mini-cards de categoria
                        h('div', { className: 'grid grid-cols-3 gap-1.5 mb-2.5' },
                            h('div', { className: 'bg-yellow-50 rounded-md px-2 py-1.5 text-center' },
                                h('div', { className: 'text-[9px] font-semibold text-yellow-800 uppercase' }, 'Ouro'),
                                h('div', { className: 'text-base font-semibold text-yellow-900 leading-none' }, g.porNivel[3] || 0)
                            ),
                            h('div', { className: 'bg-amber-50 rounded-md px-2 py-1.5 text-center' },
                                h('div', { className: 'text-[9px] font-semibold text-amber-800 uppercase' }, 'Prata'),
                                h('div', { className: 'text-base font-semibold text-amber-900 leading-none' }, g.porNivel[2] || 0)
                            ),
                            h('div', { className: 'bg-orange-50 rounded-md px-2 py-1.5 text-center' },
                                h('div', { className: 'text-[9px] font-semibold text-orange-800 uppercase' }, 'Bronze'),
                                h('div', { className: 'text-base font-semibold text-orange-900 leading-none' }, g.porNivel[1] || 0)
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
            regiaoModal && h(ModalMotoboysRegiao, {
                regiaoModal,
                onClose: () => setRegiaoModal(null),
            })
        );
    }

    // ============================================================
    // MODAL DE MOTOBOYS DA REGIÃO
    // ============================================================
    // 🆕 2026-05 v3: componente isolado com chips de filtro Todos | Ouro |
    // Prata | Bronze + renumeração ao filtrar + troféu nas 3 primeiras
    // posições quando ordenação é por classificação (sempre, neste modal).
    function ModalMotoboysRegiao({ regiaoModal, onClose }) {
        const [filtroNivel, setFiltroNivel] = useState('todos'); // 'todos' | 1 | 2 | 3

        // Lista filtrada (mantém a ordem já aplicada — classificação + % prazo)
        const motoboysFiltrados = useMemo(() => {
            if (filtroNivel === 'todos') return regiaoModal.motoboys;
            return regiaoModal.motoboys.filter(m => m.nivel_atual === filtroNivel);
        }, [regiaoModal.motoboys, filtroNivel]);

        // Definição dos chips (com contagem dinâmica)
        const chips = [
            { id: 'todos', label: 'Todos', count: regiaoModal.total },
            { id: 3, label: 'Ouro', count: regiaoModal.porNivel[3] || 0 },
            { id: 2, label: 'Prata', count: regiaoModal.porNivel[2] || 0 },
            { id: 1, label: 'Bronze', count: regiaoModal.porNivel[1] || 0 },
        ];

        // Estilo de chip ativo vs inativo
        const chipAtivo = 'bg-purple-600 text-white border-purple-600';
        const chipInativo = 'bg-white text-gray-600 border-gray-300 hover:border-gray-400';

        return h('div', {
            className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4',
            onClick: (e) => { if (e.target === e.currentTarget) onClose(); }
        },
            h('div', { className: 'bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col' },
                // Header modal
                h('div', { className: 'bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white flex items-center justify-between flex-shrink-0' },
                    h('div', null,
                        h('h2', { className: 'text-lg font-bold' }, '📍 ' + regiaoModal.regiao),
                        h('p', { className: 'text-purple-200 text-sm' },
                            regiaoModal.total.toLocaleString('pt-BR') + ' motoboys · ',
                            'Ouro: ' + (regiaoModal.porNivel[3] || 0) + ' · ',
                            'Prata: ' + (regiaoModal.porNivel[2] || 0) + ' · ',
                            'Bronze: ' + (regiaoModal.porNivel[1] || 0)
                        )
                    ),
                    h('button', {
                        onClick: onClose,
                        className: 'text-white/80 hover:text-white text-2xl leading-none'
                    }, '×')
                ),

                // Toolbar de chips (filtro por categoria)
                h('div', {
                    className: 'px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center gap-2 flex-wrap flex-shrink-0'
                },
                    h('span', { className: 'text-xs font-medium text-gray-600 mr-1' }, 'Filtrar:'),
                    ...chips.map(c =>
                        h('button', {
                            key: c.id,
                            onClick: () => setFiltroNivel(c.id),
                            className: 'px-3 py-1 rounded-full text-xs font-medium border transition ' +
                                (filtroNivel === c.id ? chipAtivo : chipInativo),
                        },
                            c.label,
                            h('span', {
                                className: 'ml-1.5 opacity-75 ' + (filtroNivel === c.id ? '' : 'text-gray-500')
                            }, c.count)
                        )
                    )
                ),

                // Tabela
                h('div', { className: 'flex-1 overflow-auto' },
                    motoboysFiltrados.length === 0
                        ? h('div', { className: 'p-12 text-center text-gray-500 text-sm' },
                            'Nenhum motoboy nesta categoria.'
                        )
                        : h('table', { className: 'w-full text-sm' },
                            h('thead', { className: 'bg-gray-50 border-b border-gray-200 sticky top-0' },
                                h('tr', null,
                                    ['#', 'Motoboy', 'Categoria', 'Entregas (28d)', 'Após 16h', '% Prazo'].map((h2, i) =>
                                        h('th', { key: i, className: 'px-3 py-2 text-left text-xs font-medium text-gray-600' }, h2)
                                    )
                                )
                            ),
                            // 🆕 2026-05 v3: renumera DENTRO da lista filtrada (idx do .map)
                            // Os troféus marcam 1º/2º/3º lugar dentro do recorte atual.
                            h('tbody', null, motoboysFiltrados.map((m, idx) => {
                                // Cor de fundo do bloco por nível (só quando filtroNivel === 'todos'
                                // pra criar a separação visual Ouro/Prata/Bronze)
                                let bgClasse = '';
                                if (filtroNivel === 'todos') {
                                    if (m.nivel_atual === 3) bgClasse = 'bg-yellow-50/60';
                                    else if (m.nivel_atual === 2) bgClasse = 'bg-gray-50';
                                }
                                return h('tr', {
                                    key: m.cod_prof,
                                    className: 'border-b border-gray-100 hover:bg-purple-50/40 ' + bgClasse
                                },
                                    h('td', { className: 'px-3 py-2 text-gray-600 text-center w-12' },
                                        idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' :
                                            h('span', { className: 'text-xs font-medium text-gray-500' }, idx + 1)
                                    ),
                                    h('td', { className: 'px-3 py-2 font-medium text-gray-900' }, m.nome_prof || ('#' + m.cod_prof)),
                                    h('td', { className: 'px-3 py-2' },
                                        h('span', {
                                            className: 'px-2 py-0.5 rounded text-xs font-bold ' + (m.nivel_atual === 3 ? 'bg-yellow-100 text-yellow-800' : m.nivel_atual === 2 ? 'bg-amber-100 text-amber-800' : 'bg-orange-100 text-orange-800')
                                        }, m.nivel_atual === 3 ? 'Ouro' : m.nivel_atual === 2 ? 'Prata' : 'Bronze')
                                    ),
                                    h('td', { className: 'px-3 py-2 font-semibold' }, m.entregas_periodo),
                                    h('td', { className: 'px-3 py-2 text-gray-600' }, m.dias_16h_periodo),
                                    h('td', { className: 'px-3 py-2 text-green-700 font-medium' }, parseFloat(m.pct_prazo).toFixed(1) + '%')
                                );
                            }))
                        )
                ),

                // Footer
                h('div', { className: 'px-4 py-3 border-t flex items-center justify-between flex-shrink-0' },
                    h('span', { className: 'text-xs text-gray-500' },
                        filtroNivel === 'todos'
                            ? 'Mostrando ' + motoboysFiltrados.length + ' de ' + regiaoModal.total
                            : 'Filtrando ' + chips.find(c => c.id === filtroNivel).label + ': ' + motoboysFiltrados.length + ' de ' + regiaoModal.total
                    ),
                    h('button', {
                        onClick: onClose,
                        className: 'px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium text-sm'
                    }, 'Fechar')
                )
            )
        );
    }

    // ============================================================
    // ABA SORTEIOS
    // ============================================================
    // ============================================================
    // ABA RANKING ANTERIOR (colocação congelada do mês)
    // ============================================================
    function AbaRanking({ fetchApi, showToast }) {
        // mês default = mês anterior
        const hoje = new Date();
        const mAnt = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        const mesDefault = mAnt.getFullYear() + '-' + String(mAnt.getMonth() + 1).padStart(2, '0');

        const [mes, setMes] = useState(mesDefault);
        const [mesBusca, setMesBusca] = useState(mesDefault);
        const [ranking, setRanking] = useState([]);
        const [loading, setLoading] = useState(false);
        const [regiaoFiltro, setRegiaoFiltro] = useState('');
        const [erro, setErro] = useState('');

        const fetchApiRef = useRef(fetchApi);
        const showToastRef = useRef(showToast);
        useEffect(() => { fetchApiRef.current = fetchApi; }, [fetchApi]);
        useEffect(() => { showToastRef.current = showToast; }, [showToast]);

        const carregar = useCallback(async (m) => {
            if (!/^\d{4}-\d{2}$/.test(m)) { showToastRef.current('⚠️ Mês no formato YYYY-MM', 'warning'); return; }
            setLoading(true); setErro('');
            try {
                const data = await fetchApiRef.current('/score-v2/admin/ranking/' + m);
                const lista = (data && data.ranking) || [];
                setRanking(lista);
                setMesBusca(m);
                if (lista.length === 0) {
                    setErro('Nenhuma colocação congelada para ' + m + '. O congelamento começou em junho/2026 — meses anteriores não têm registro.');
                }
            } catch (err) { showToastRef.current('❌ ' + err.message, 'error'); setRanking([]); }
            finally { setLoading(false); }
        }, []);

        useEffect(() => { carregar(mesDefault); }, [carregar]);

        const regioes = Array.from(new Set(ranking.map(r => r.regiao))).sort();
        const filtrado = regiaoFiltro ? ranking.filter(r => r.regiao === regiaoFiltro) : ranking;
        const porRegiao = {};
        filtrado.forEach(r => { (porRegiao[r.regiao] = porRegiao[r.regiao] || []).push(r); });

        const catBadge = (nivel) => h('span', {
            className: 'px-2 py-0.5 rounded text-xs font-bold ' +
                (nivel === 3 ? 'bg-yellow-100 text-yellow-800' : nivel === 2 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600')
        }, nivel === 3 ? 'Ouro' : nivel === 2 ? 'Prata' : 'Bronze');
        const medalha = (pos) => pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : ('' + pos);

        return h('div', null,
            h('div', { className: 'bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3' },
                h('p', { className: 'text-xs text-purple-900 mb-2 font-medium' }, '📅 Classificação congelada no fechamento do mês. Disponível a partir de junho/2026.'),
                h('div', { className: 'flex gap-2 items-end flex-wrap' },
                    h('div', null,
                        h('label', { className: 'text-xs text-purple-700 block' }, 'Mês (período)'),
                        h('input', { type: 'month', value: mes, onChange: e => setMes(e.target.value), className: 'px-3 py-1.5 border rounded text-sm mt-1' })
                    ),
                    h('button', { onClick: () => carregar(mes), className: 'px-3 py-1.5 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700' }, '🔍 Buscar'),
                    regioes.length > 0 && h('div', null,
                        h('label', { className: 'text-xs text-purple-700 block' }, 'Região'),
                        h('select', { value: regiaoFiltro, onChange: e => setRegiaoFiltro(e.target.value), className: 'px-3 py-1.5 border rounded text-sm mt-1' },
                            h('option', { value: '' }, 'Todas'),
                            regioes.map(rg => h('option', { key: rg, value: rg }, rg))
                        )
                    )
                )
            ),
            loading ? h('div', { className: 'text-center py-12 text-gray-500' }, '⏳ Carregando...') :
            erro ? h('div', { className: 'text-center py-12 text-gray-400 text-sm px-4' }, erro) :
            Object.keys(porRegiao).length === 0 ? h('div', { className: 'text-center py-12 text-gray-400 text-sm' }, 'Sem dados.') :
            h('div', null, Object.entries(porRegiao).map(([regiao, lista]) =>
                h('div', { key: regiao, className: 'bg-white rounded-lg border border-gray-200 overflow-x-auto mb-4' },
                    h('div', { className: 'px-3 py-2 bg-gray-50 border-b font-bold text-sm text-gray-700' }, '📍 ' + regiao + ' — ' + mesBusca + ' (' + lista.length + ' motoboys)'),
                    h('table', { className: 'w-full text-sm' },
                        h('thead', { className: 'bg-gray-50 border-b border-gray-200' },
                            h('tr', null, ['#', 'Motoboy', 'Categoria', 'Entregas', '% Prazo'].map((c, i) =>
                                h('th', { key: i, className: 'px-3 py-2 text-left text-xs font-medium text-gray-600' }, c)))
                        ),
                        h('tbody', null, lista.map(r => h('tr', { key: r.cod_prof, className: 'border-b border-gray-100' },
                            h('td', { className: 'px-3 py-2 font-bold' }, medalha(r.posicao)),
                            h('td', { className: 'px-3 py-2' }, r.nome_prof || r.cod_prof),
                            h('td', { className: 'px-3 py-2' }, catBadge(r.nivel)),
                            h('td', { className: 'px-3 py-2 text-gray-600' }, r.entregas),
                            h('td', { className: 'px-3 py-2 text-gray-600' }, (Number(r.pct_prazo) || 0).toFixed(1) + '%')
                        )))
                    )
                )
            ))
        );
    }

    function AbaSorteios({ fetchApi, showToast }) {
        const [sorteios, setSorteios] = useState([]);
        const [loading, setLoading] = useState(true);
        const [mesManual, setMesManual] = useState('');
        const [expandido, setExpandido] = useState(null);
        const [participantes, setParticipantes] = useState([]);
        const [loadingPart, setLoadingPart] = useState(false);

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

        const togglePart = async (id) => {
            if (expandido === id) { setExpandido(null); return; }
            setExpandido(id); setParticipantes([]); setLoadingPart(true);
            try {
                const data = await fetchApiRef.current('/score-v2/admin/sorteios/' + id + '/participantes');
                setParticipantes((data && data.participantes) || []);
            } catch (err) { showToastRef.current('❌ ' + err.message, 'error'); }
            finally { setLoadingPart(false); }
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
                            ['Mês', 'Região', 'Categoria', 'Vencedor', 'Valor', 'Participantes', 'Sorteado em'].map((h2, i) =>
                                h('th', { key: i, className: 'px-3 py-2 text-left text-xs font-medium text-gray-600' }, h2)
                            )
                        )
                    ),
                    h('tbody', null, sorteios.map(s => h(React.Fragment, { key: s.id },
                        h('tr', { className: 'border-b border-gray-100 cursor-pointer hover:bg-purple-50', onClick: () => togglePart(s.id), title: 'Ver participantes' },
                            h('td', { className: 'px-3 py-2 font-medium' }, s.mes_referencia),
                            h('td', { className: 'px-3 py-2' }, s.regiao),
                            h('td', { className: 'px-3 py-2' },
                                h('span', { className: 'px-2 py-0.5 rounded text-xs font-bold ' + (s.nivel === 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-amber-100 text-amber-800') }, s.nivel === 3 ? 'Ouro' : 'Prata')
                            ),
                            h('td', { className: 'px-3 py-2 font-bold text-purple-900' }, '🏆 ' + (s.vencedor_nome || s.vencedor_cod_prof)),
                            h('td', { className: 'px-3 py-2 font-bold text-green-700' }, fmtBRL(s.valor)),
                            h('td', { className: 'px-3 py-2 text-gray-600' }, (expandido === s.id ? '▾ ' : '▸ ') + s.total_participantes),
                            h('td', { className: 'px-3 py-2 text-xs text-gray-500' }, fmtData(s.sorteado_em))
                        ),
                        expandido === s.id && h('tr', { className: 'bg-gray-50 border-b border-gray-100' },
                            h('td', { colSpan: 7, className: 'px-3 py-2' },
                                loadingPart ? h('span', { className: 'text-xs text-gray-500' }, '⏳ Carregando participantes...') :
                                participantes.length === 0 ? h('span', { className: 'text-xs text-gray-400' }, 'Nenhum participante registrado (sorteios anteriores a junho/2026 não têm a lista).') :
                                h('div', null,
                                    h('p', { className: 'text-xs font-bold text-gray-600 mb-1' }, 'Participantes (' + participantes.length + '):'),
                                    h('div', { className: 'flex flex-wrap gap-1' }, participantes.map(p =>
                                        h('span', { key: p.cod_prof, className: 'px-2 py-0.5 rounded text-xs ' + (p.foi_vencedor ? 'bg-green-100 text-green-800 font-bold' : 'bg-gray-100 text-gray-700') }, (p.foi_vencedor ? '🏆 ' : '') + (p.nome_prof || p.cod_prof))
                                    ))
                                )
                            )
                        )
                    )))
                )
            )
        );
    }

})();
