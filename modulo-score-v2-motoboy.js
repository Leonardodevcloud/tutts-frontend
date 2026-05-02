// ==================== MÓDULO SCORE V2 (MOTOBOY) ====================
// Arquivo: modulo-score-v2-motoboy.js
//
// Componentes:
//   - window.ModuloScoreV2Motoboy        → tela completa de score (rota /score)
//   - window.ModuloScoreV2WelcomeModal   → modal automático ao entrar no app
//
// Integração com app.js:
//   No mount/login do motoboy, chamar:
//     window.ModuloScoreV2WelcomeModal.show({ apiUrl, token })
//   Decide sozinho se deve aparecer (cookie + condições).
// =====================================================================

(function() {
    'use strict';

    const { useState, useEffect } = React;
    const h = React.createElement;

    function fmtBRL(v) {
        return 'R$ ' + (parseFloat(v) || 0).toFixed(2).replace('.', ',');
    }

    // ============================================================
    // TELA COMPLETA DE SCORE (motoboy)
    // ============================================================
    window.ModuloScoreV2Motoboy = function(props) {
        const { apiUrl, token, fetchAuth, showToast } = props;
        const [dados, setDados] = useState(null);
        const [loading, setLoading] = useState(true);
        const [erro, setErro] = useState(null);

        useEffect(() => {
            (async () => {
                try {
                    let r;
                    // 🔧 FIX: prefere fetchAuth (padrão Tutts: usa cookie httpOnly)
                    // sobre fetch manual com Bearer (que falhava com 401).
                    if (typeof fetchAuth === 'function') {
                        r = await fetchAuth(apiUrl + '/score-v2/meu-nivel');
                    } else {
                        r = await fetch(apiUrl + '/score-v2/meu-nivel', {
                            headers: { 'Authorization': 'Bearer ' + (token || ''), 'Content-Type': 'application/json' },
                            credentials: 'include'
                        });
                    }
                    if (!r.ok) throw new Error('Falha ao carregar score (' + r.status + ')');
                    setDados(await r.json());
                } catch (err) { setErro(err.message); }
                finally { setLoading(false); }
            })();
        }, [apiUrl]); // só roda 1x por mount

        if (loading) return h('div', { className: 'text-center py-12 text-gray-500' }, '⏳ Carregando...');
        if (erro) return h('div', { className: 'text-center py-12 text-red-500 text-sm' }, '❌ ' + erro);
        if (!dados) return null;

        // Região não configurada
        if (!dados.regiao_configurada) {
            return h('div', { className: 'max-w-md mx-auto p-4' },
                h('div', { className: 'bg-gray-100 border border-gray-200 rounded-xl p-6 text-center' },
                    h('div', { className: 'text-5xl mb-3' }, '🔒'),
                    h('h2', { className: 'text-lg font-bold text-gray-700 mb-2' }, 'Score indisponível'),
                    h('p', { className: 'text-sm text-gray-600' }, dados.mensagem || 'Score ainda não está disponível na sua região.')
                )
            );
        }

        const { nivel, stats, progresso, bonus, mudou, subiu, thresholds, debug } = dados;
        // Valores de bônus podem vir tanto no debug quanto direto na response.
        // Como o backend só retorna ao motoboy regiao_configurada=true, dá pra usar o
        // bonus.valor pra inferir se é semanal/mensal mas o teto/sorteio precisa vir do payload.
        // Por hora pegamos do bonus se existe; se não, usa fallback nos defaults do componente.
        const bonusValores = {
            sorteio_n2: dados.sorteio_valor_n2,
            sorteio_n3: dados.sorteio_valor_n3,
            saque_n2: dados.saque_teto_n2,
            saque_n3: dados.saque_teto_n3,
        };

        return h('div', { className: 'max-w-md mx-auto p-4 space-y-4' },
            // Card de nível atual
            h(CardNivelAtual, { nivel, stats }),

            // Mudança de nível recente
            mudou && subiu && h('div', { className: 'bg-green-50 border-2 border-green-300 rounded-xl p-4 text-center' },
                h('div', { className: 'text-3xl mb-2' }, '🎉'),
                h('p', { className: 'text-sm font-bold text-green-900' }, 'Você subiu para Nível ' + nivel + '!')
            ),

            // Bônus lançado neste período
            bonus && bonus.lancado && h('div', { className: 'bg-blue-50 border-2 border-blue-300 rounded-xl p-4' },
                h('div', { className: 'flex items-start gap-3' },
                    h('div', { className: 'text-2xl' }, '💰'),
                    h('div', null,
                        h('p', { className: 'text-sm font-bold text-blue-900' }, 'Saque liberado!'),
                        h('p', { className: 'text-xs text-blue-700 mt-1' },
                            'Você tem direito a 1 saque grátis até ' + fmtBRL(bonus.valor) +
                            ' este ' + (bonus.tipo === 'saque_semanal' ? 'esta semana' : 'mês') + '.'
                        ),
                        h('p', { className: 'text-xs text-blue-600 mt-1' }, 'Vá no menu Financeiro → Saques pra usar.')
                    )
                )
            ),
            bonus && !bonus.lancado && bonus.motivo === 'ja_lancado_no_periodo' && h('div', { className: 'bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-600' },
                '✅ Saque grátis deste período já foi liberado anteriormente.'
            ),

            // Progresso pro próximo nível
            progresso && h(BarrasProgresso, { progresso }),

            // 🎁 Roadmap de bonificações (usa thresholds reais da região)
            h(RoadmapBonificacoes, { nivelAtual: nivel, thresholds, bonusValores }),

            // 📋 Lista das entregas dos últimos 28 dias (lazy load)
            h(MinhasEntregas, { apiUrl, fetchAuth, token }),

            // Info nivel atual
            h('div', { className: 'bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs text-purple-900' },
                h('p', { className: 'font-medium mb-1' }, '📊 Sobre o Score'),
                h('p', null, 'Avaliação rolling de 28 dias. Quanto mais você entrega no horário e nas faixas certas, maior seu nível.'),
                h('p', { className: 'mt-1' }, 'Sorteios mensais entre todos do nível na sua região!')
            )
        );
    };

    function CardNivelAtual({ nivel, stats }) {
        const cor = nivel === 3 ? 'from-yellow-400 to-yellow-600' : nivel === 2 ? 'from-amber-400 to-amber-600' : 'from-gray-300 to-gray-500';
        const emoji = nivel === 3 ? '🥇' : nivel === 2 ? '🥈' : '⚪';
        const nome = nivel === 3 ? 'Nível 3 — Ouro' : nivel === 2 ? 'Nível 2 — Prata' : 'Nível 1 — Bronze';

        return h('div', { className: 'rounded-xl p-5 text-white bg-gradient-to-br ' + cor + ' shadow-lg' },
            h('div', { className: 'text-center' },
                h('div', { className: 'text-5xl mb-2' }, emoji),
                h('h2', { className: 'text-xl font-bold' }, nome),
                h('p', { className: 'text-xs opacity-90 mt-1' }, 'Seu nível atual')
            ),
            h('div', { className: 'grid grid-cols-3 gap-2 mt-4 text-center' },
                h('div', null,
                    h('div', { className: 'text-xs opacity-80' }, 'Entregas'),
                    h('div', { className: 'text-lg font-bold' }, stats.entregas)
                ),
                h('div', null,
                    h('div', { className: 'text-xs opacity-80' }, 'Dias 16h+'),
                    h('div', { className: 'text-lg font-bold' }, stats.dias_16h)
                ),
                h('div', null,
                    h('div', { className: 'text-xs opacity-80' }, '% Prazo'),
                    h('div', { className: 'text-lg font-bold' }, stats.pct_prazo + '%')
                )
            )
        );
    }

    function BarrasProgresso({ progresso }) {
        return h('div', { className: 'bg-white border border-gray-200 rounded-xl p-4' },
            h('h3', { className: 'text-sm font-bold text-gray-900 mb-3' },
                '🎯 Progresso para Nível ' + progresso.proximo_nivel
            ),
            h('div', { className: 'space-y-3' },
                progresso.requisitos.map((r, i) => h(BarraReq, { key: i, req: r }))
            )
        );
    }

    function BarraReq({ req }) {
        const sufixo = req.sufixo || '';
        const corBarra = req.ok ? 'bg-green-500' : 'bg-purple-500';
        return h('div', null,
            h('div', { className: 'flex items-center justify-between text-xs mb-1' },
                h('span', { className: 'font-medium text-gray-700' }, (req.ok ? '✅ ' : '🔸 ') + req.label),
                h('span', { className: 'text-gray-600 font-mono' }, req.atual + sufixo + ' / ' + req.meta + sufixo)
            ),
            h('div', { className: 'w-full bg-gray-200 rounded-full h-2 overflow-hidden' },
                h('div', { className: 'h-full ' + corBarra + ' transition-all', style: { width: req.pct + '%' } })
            ),
            req.faixa && req.atual >= req.meta && req.atual >= 90 && h('p', { className: 'text-[10px] text-amber-600 mt-1' },
                '⚠️ Acima de 90% → você pula pro Nível 3!'
            )
        );
    }

    // ============================================================
    // 🎁 ROADMAP DE BONIFICAÇÕES (3 cards: N1, N2, N3)
    // ============================================================
    function RoadmapBonificacoes({ nivelAtual, thresholds, bonusValores }) {
        // Defaults caso a response não traga (compat)
        const t = thresholds || {
            n2: { entregas_min: 80, dias_16h_min: 8, pct_prazo_min: 80 },
            n3: { entregas_min: 150, dias_16h_min: 12, pct_prazo_min: 88 },
        };
        const b = bonusValores || {
            sorteio_n2: 50, sorteio_n3: 150,
            saque_n2: 500, saque_n3: 500,
        };
        const fmt = (v) => 'R$ ' + (parseFloat(v) || 0).toFixed(2).replace('.', ',');

        const niveis = [
            {
                num: 1, nome: 'Bronze', emoji: '⚪',
                criterios: ['Disponível para todos'],
                bonus: ['Sem bônus extra'],
            },
            {
                num: 2, nome: 'Prata', emoji: '🥈',
                criterios: [
                    '≥ ' + t.n2.entregas_min + ' entregas em 28 dias',
                    '≥ ' + t.n2.dias_16h_min + ' dias com entregas após 16h',
                    '≥ ' + t.n2.pct_prazo_min + '% no prazo',
                ],
                bonus: [
                    '💰 1 saque grátis/mês de até ' + fmt(b.saque_n2),
                    '🎲 Concorre a sorteio mensal de ' + fmt(b.sorteio_n2),
                ],
            },
            {
                num: 3, nome: 'Ouro', emoji: '🥇',
                criterios: [
                    '≥ ' + t.n3.entregas_min + ' entregas em 28 dias',
                    '≥ ' + t.n3.dias_16h_min + ' dias com entregas após 16h',
                    '≥ ' + t.n3.pct_prazo_min + '% no prazo',
                ],
                bonus: [
                    '💰 1 saque grátis/SEMANA de até ' + fmt(b.saque_n3),
                    '🎲 Concorre a sorteio mensal de ' + fmt(b.sorteio_n3),
                ],
            },
        ];

        return h('div', { className: 'bg-white border border-gray-200 rounded-xl p-4' },
            h('h3', { className: 'text-sm font-bold text-gray-900 mb-3' },
                '🎁 O que você ganha em cada nível'
            ),
            h('div', { className: 'space-y-3' },
                niveis.map(n => h(CardRoadmap, {
                    key: n.num,
                    nivel: n,
                    isAtual: n.num === nivelAtual,
                    isAlcancado: n.num <= nivelAtual,
                }))
            )
        );
    }

    function CardRoadmap({ nivel, isAtual, isAlcancado }) {
        return h('div', {
            className: 'border-2 rounded-lg p-3 ' + (
                isAtual ? 'border-purple-500 bg-purple-50 shadow' :
                isAlcancado ? 'border-green-300 bg-green-50' :
                'border-gray-200 bg-gray-50'
            )
        },
            h('div', { className: 'flex items-center justify-between mb-2' },
                h('div', { className: 'flex items-center gap-2' },
                    h('span', { className: 'text-2xl' }, nivel.emoji),
                    h('div', null,
                        h('div', { className: 'font-bold text-sm text-gray-900' },
                            'Nível ' + nivel.num + ' — ' + nivel.nome
                        ),
                        isAtual && h('div', { className: 'text-[10px] font-bold text-purple-700 uppercase' }, '⭐ Você está aqui')
                    )
                ),
                isAlcancado && !isAtual && h('span', { className: 'text-xs text-green-700 font-bold' }, '✓')
            ),
            h('div', { className: 'text-xs space-y-1 mt-2' },
                h('div', { className: 'font-semibold text-gray-700' }, 'Critérios:'),
                nivel.criterios.map((c, i) => h('div', { key: i, className: 'text-gray-600 ml-2' }, '• ' + c)),
                h('div', { className: 'font-semibold text-gray-700 mt-2' }, 'Bônus:'),
                nivel.bonus.map((b, i) => h('div', { key: i, className: 'text-gray-600 ml-2' }, b))
            )
        );
    }

    // ============================================================
    // 📋 MINHAS ENTREGAS (lazy load — só busca quando expande)
    // ============================================================
    function MinhasEntregas({ apiUrl, fetchAuth, token }) {
        const [aberto, setAberto] = useState(false);
        const [dados, setDados] = useState(null);
        const [loading, setLoading] = useState(false);
        const [erro, setErro] = useState(null);
        const [filtroPrazo, setFiltroPrazo] = useState('todos');

        const carregar = async () => {
            if (dados || loading) return;
            setLoading(true);
            try {
                let r;
                if (typeof fetchAuth === 'function') {
                    r = await fetchAuth(apiUrl + '/score-v2/minhas-entregas');
                } else {
                    r = await fetch(apiUrl + '/score-v2/minhas-entregas', {
                        headers: { 'Authorization': 'Bearer ' + (token || '') },
                        credentials: 'include'
                    });
                }
                if (!r.ok) throw new Error('Falha ao carregar entregas');
                setDados(await r.json());
            } catch (err) { setErro(err.message); }
            finally { setLoading(false); }
        };

        const toggle = () => {
            const novoEstado = !aberto;
            setAberto(novoEstado);
            if (novoEstado) carregar();
        };

        return h('div', { className: 'bg-white border border-gray-200 rounded-xl overflow-hidden' },
            h('button', {
                onClick: toggle,
                className: 'w-full p-4 flex items-center justify-between hover:bg-gray-50'
            },
                h('span', { className: 'font-bold text-sm text-gray-900' }, '📋 Minhas Entregas (28 dias)'),
                h('span', { className: 'text-gray-400 text-sm' }, aberto ? '▲' : '▼')
            ),
            aberto && h('div', { className: 'p-4 border-t border-gray-200' },
                loading && h('div', { className: 'text-center text-gray-500 text-sm py-4' }, '⏳ Carregando...'),
                erro && h('div', { className: 'text-center text-red-500 text-sm py-4' }, '❌ ' + erro),
                dados && dados.entregas.length === 0 && h('div', { className: 'text-center text-gray-400 text-sm py-4' },
                    'Nenhuma entrega nos últimos 28 dias.'
                ),
                dados && dados.entregas.length > 0 && h(EntregasLista, {
                    entregas: dados.entregas,
                    resumoDia: dados.resumo_dia,
                    filtro: filtroPrazo,
                    setFiltro: setFiltroPrazo,
                })
            )
        );
    }

    function EntregasLista({ entregas, resumoDia, filtro, setFiltro }) {
        // Aplica filtro
        const filtradas = entregas.filter(e => {
            if (filtro === 'no_prazo') return e.dentro_prazo === true;
            if (filtro === 'fora_prazo') return e.dentro_prazo === false;
            return true;
        });

        const totais = {
            geral: entregas.length,
            no_prazo: entregas.filter(e => e.dentro_prazo === true).length,
            fora_prazo: entregas.filter(e => e.dentro_prazo === false).length,
        };

        return h('div', null,
            // Filtros
            h('div', { className: 'flex gap-1 mb-3 text-xs' },
                [
                    { id: 'todos', label: 'Todas (' + totais.geral + ')', cor: 'bg-gray-200 text-gray-700' },
                    { id: 'no_prazo', label: '✓ No prazo (' + totais.no_prazo + ')', cor: 'bg-green-100 text-green-800' },
                    { id: 'fora_prazo', label: '✗ Fora (' + totais.fora_prazo + ')', cor: 'bg-red-100 text-red-800' },
                ].map(f => h('button', {
                    key: f.id,
                    onClick: () => setFiltro(f.id),
                    className: 'px-2 py-1 rounded font-medium ' + (
                        filtro === f.id ? 'bg-purple-600 text-white' : f.cor + ' hover:opacity-80'
                    )
                }, f.label))
            ),

            // Lista (limitada a 50 pra performance)
            h('div', { className: 'space-y-1 max-h-96 overflow-y-auto' },
                filtradas.slice(0, 50).map((e, i) => h(EntregaItem, { key: e.os + '-' + i, entrega: e }))
            ),
            filtradas.length > 50 && h('p', { className: 'text-[10px] text-gray-400 text-center mt-2' },
                '+ ' + (filtradas.length - 50) + ' entregas não exibidas'
            )
        );
    }

    function EntregaItem({ entrega }) {
        const noPrazo = entrega.dentro_prazo === true;
        const foraPrazo = entrega.dentro_prazo === false;
        const dia = entrega.data_solicitado ? new Date(entrega.data_solicitado).toLocaleDateString('pt-BR') : '-';
        const hora = entrega.hora_solicitado ? String(entrega.hora_solicitado).slice(0, 5) : '';
        const tempo = entrega.tempo_execucao_minutos != null ? Math.round(entrega.tempo_execucao_minutos) + ' min' : '-';

        return h('div', {
            className: 'flex items-center gap-2 p-2 rounded text-xs border-l-4 ' + (
                noPrazo ? 'border-green-400 bg-green-50' :
                foraPrazo ? 'border-red-400 bg-red-50' :
                'border-gray-300 bg-gray-50'
            )
        },
            h('span', { className: 'text-base' },
                noPrazo ? '✅' : foraPrazo ? '❌' : '⏳'
            ),
            h('div', { className: 'flex-1 min-w-0' },
                h('div', { className: 'font-medium text-gray-900 truncate' },
                    'OS ' + entrega.os + (entrega.nome_fantasia ? ' • ' + entrega.nome_fantasia : '')
                ),
                h('div', { className: 'text-gray-500 truncate' },
                    dia + ' ' + hora + ' • ' + tempo + (entrega.bairro ? ' • ' + entrega.bairro : '')
                )
            )
        );
    }

    // ============================================================
    // MODAL DE BOAS-VINDAS (mostra ao entrar no app)
    // ============================================================
    // Exibe automaticamente se:
    //   - Motoboy está em região configurada
    //   - É nível 2 ou 3
    //   - Não viu hoje (cookie/localStorage com data)
    window.ModuloScoreV2WelcomeModal = {
        show: async function({ apiUrl, token, fetchAuth, onMount }) {
            try {
                // Já mostrou hoje?
                const hoje = new Date().toISOString().slice(0, 10);
                const ultimaVez = (typeof localStorage !== 'undefined') ? localStorage.getItem('score_v2_modal_visto') : null;
                if (ultimaVez === hoje) return;

                let r;
                if (typeof fetchAuth === 'function') {
                    r = await fetchAuth(apiUrl + '/score-v2/meu-nivel');
                } else {
                    r = await fetch(apiUrl + '/score-v2/meu-nivel', {
                        headers: { 'Authorization': 'Bearer ' + (token || '') },
                        credentials: 'include'
                    });
                }
                if (!r.ok) return;
                const dados = await r.json();

                // Só exibe se região configurada E nível 2+
                if (!dados.regiao_configurada || dados.nivel < 2) return;

                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('score_v2_modal_visto', hoje);
                }

                // Renderiza modal
                const container = document.createElement('div');
                container.id = 'score-v2-welcome-modal';
                document.body.appendChild(container);

                const root = ReactDOM.createRoot ? ReactDOM.createRoot(container) : null;
                const fechar = () => {
                    if (root) root.unmount();
                    else ReactDOM.unmountComponentAtNode(container);
                    container.remove();
                };

                const modal = h(WelcomeModal, { dados, onFechar: fechar, onMount });
                if (root) root.render(modal);
                else ReactDOM.render(modal, container);
            } catch (err) {
                console.warn('[ScoreV2] Modal de welcome falhou silenciosamente:', err.message);
            }
        }
    };

    function WelcomeModal({ dados, onFechar, onMount }) {
        const { nivel, stats, progresso, bonus, subiu } = dados;
        const emoji = nivel === 3 ? '🥇' : '🥈';
        const nome = nivel === 3 ? 'Nível 3 — Ouro' : 'Nível 2 — Prata';

        return h('div', { className: 'fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4' },
            h('div', { className: 'bg-white rounded-t-2xl md:rounded-2xl max-w-md w-full p-5 max-h-[85vh] overflow-y-auto' },
                h('div', { className: 'text-center mb-4' },
                    h('div', { className: 'text-5xl mb-2' }, emoji),
                    h('h2', { className: 'text-lg font-bold text-gray-900' },
                        subiu ? '🎉 Parabéns, você subiu!' : 'Bem-vindo de volta!'
                    ),
                    h('p', { className: 'text-sm text-gray-600 mt-1' }, 'Você está em ' + nome)
                ),
                bonus && bonus.lancado && h('div', { className: 'bg-green-50 border border-green-200 rounded-lg p-3 mb-3' },
                    h('p', { className: 'text-sm font-bold text-green-900' }, '💰 Saque grátis disponível!'),
                    h('p', { className: 'text-xs text-green-700 mt-1' },
                        'Você tem direito a 1 saque grátis até ' + fmtBRL(bonus.valor) +
                        ' (' + (bonus.tipo === 'saque_semanal' ? 'esta semana' : 'este mês') + ').'
                    )
                ),
                progresso && h('div', { className: 'mb-4' },
                    h('h3', { className: 'text-xs font-bold text-gray-700 mb-2' }, '📊 Falta pouco pro Nível ' + progresso.proximo_nivel),
                    h('div', { className: 'space-y-2' }, progresso.requisitos.map((r, i) => h('div', { key: i },
                        h('div', { className: 'flex items-center justify-between text-xs mb-1' },
                            h('span', { className: 'text-gray-700' }, (r.ok ? '✅ ' : '🔸 ') + r.label),
                            h('span', { className: 'text-gray-500 font-mono' }, r.atual + (r.sufixo || ''))
                        ),
                        h('div', { className: 'w-full bg-gray-200 rounded-full h-1.5' },
                            h('div', { className: 'h-full bg-purple-500 rounded-full', style: { width: r.pct + '%' } })
                        )
                    )))
                ),
                h('button', {
                    onClick: () => { onFechar(); if (onMount) onMount(dados); },
                    className: 'w-full px-4 py-3 bg-purple-600 text-white rounded-lg font-medium text-sm hover:bg-purple-700'
                }, 'Continuar')
            )
        );
    }

})();
