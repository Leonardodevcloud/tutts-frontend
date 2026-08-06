/* DEEMOJI_V1 */
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

        if (loading) return h('div', { className: 'text-center py-12 text-gray-500' }, h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-clock" })), "Carregando..."));
        if (erro) return h('div', { className: 'text-center py-12 text-red-500 text-sm' }, '' + erro);
        if (!dados) return null;

        // Região não configurada
        if (!dados.regiao_configurada) {
            return h('div', { className: 'max-w-md mx-auto p-4' },
                h('div', { className: 'bg-gray-100 border border-gray-200 rounded-xl p-6 text-center' },
                    h('div', { className: 'text-5xl mb-3' }, h("svg", { className: "ico", style: { width: 48, height: 48 }, "aria-hidden": "true" }, h("use", { href: "#i-lock" }))),
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
            qtd_n2: dados.saque_qtd_n2, // SAQUE_QTD_FRONT_V1
            qtd_n3: dados.saque_qtd_n3,
        };

        return h('div', { className: 'max-w-md mx-auto p-4 space-y-4' },
            h(EstiloNivel), // SCORE_CARD_NIVEL_V1
            // Card de nível atual
            h(CardNivelAtual, { nivel, stats, thresholds, progresso }),

            // Mudança de nível recente
            mudou && subiu && h('div', { className: 'bg-green-50 border-2 border-green-300 rounded-xl p-4 text-center' },
                h('div', { className: 'text-3xl mb-2' }, h("svg", { className: "ico", style: { width: 30, height: 30 }, "aria-hidden": "true" }, h("use", { href: "#i-party" }))),
                h('p', { className: 'text-sm font-bold text-green-900' }, 'Você subiu para Nível ' + nivel + '!')
            ),

            // Bônus lançado neste período
            bonus && bonus.lancado && h('div', { className: 'bg-blue-50 border-2 border-blue-300 rounded-xl p-4' },
                h('div', { className: 'flex items-start gap-3' },
                    h('div', { className: 'text-2xl' }, h("svg", { className: "ico", style: { width: 26, height: 26 }, "aria-hidden": "true" }, h("use", { href: "#i-wallet" }))),
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
                'Saque grátis deste período já foi liberado anteriormente.'
            ),

            // Progresso pro próximo nível (card de requisitos novo)
            progresso && h(CardRequisitos, { progresso, nivel }),

            // 🎁 Roadmap de bonificações (usa thresholds reais da região)
            h(RoadmapBonificacoes, { nivelAtual: nivel, thresholds, bonusValores, modelo: dados.modelo, extrasCfg: dados.bonus_extras }), // ROADMAP_REAL_V1 + BONUS_EXTRAS_MB_V1

            // 📋 Lista das entregas dos últimos 28 dias (lazy load)
            h(MinhasEntregas, { apiUrl, fetchAuth, token }),

            // Info nivel atual
            h('div', { className: 'bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs text-purple-900' },
                h('p', { className: 'font-medium mb-1' }, h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-chart" })), "Sobre o Score")),
                h('p', null, 'Avaliação rolling de 28 dias. Quanto mais você entrega no horário e nas faixas certas, maior seu nível.'),
                h('p', { className: 'mt-1' }, 'Sorteios mensais entre todos do nível na sua região!')
            )
        );
    };

    // SCORE_CARD_NIVEL_V1: cores por categoria (metal), estilo das animacoes,
    // hero (medalha viva) e card de requisitos. Substitui CardNivelAtual +
    // BarrasProgresso + BarraReq (este ultimo tinha bug de [object Object]).
    const TIER_COR = {
        1: { grad: 'linear-gradient(135deg,#c88a4a 0%,#a56a34 55%,#824e24 100%)', medal: 'linear-gradient(135deg,#b87333,#8c5a2b)', sombra: '#8b5a2b', accent: '#c88a4a' },
        2: { grad: 'linear-gradient(135deg,#c2c9d2 0%,#9aa2ae 55%,#79828f 100%)', medal: 'linear-gradient(135deg,#c9ced6,#9aa2ae)', sombra: '#7c8592', accent: '#8b93a1' },
        3: { grad: 'linear-gradient(135deg,#f0c94e 0%,#d9a520 55%,#b98600 100%)', medal: 'linear-gradient(135deg,#f5d14e,#c99700)', sombra: '#c08a00', accent: '#d9a520' },
    };

    function EstiloNivel() {
        return h('style', null,
            '@keyframes sxSweep{0%{left:-60%}22%,100%{left:130%}}' +
            '@keyframes sxMedal{from{transform:scale(.3) rotate(-25deg);opacity:0}to{transform:scale(1) rotate(0);opacity:1}}' +
            '@keyframes sxRise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}' +
            '@keyframes sxPop{from{transform:scale(0)}to{transform:scale(1)}}' +
            '@keyframes sxGrow{from{transform:scaleX(0)}to{transform:scaleX(1)}}' +
            '.sx-hero{position:relative;overflow:hidden}' +
            '.sx-hero::before{content:"";position:absolute;top:0;left:-60%;width:45%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.5),transparent);transform:skewX(-18deg);animation:sxSweep 3.6s ease-in-out .5s infinite;z-index:0}' +
            '.sx-medal{animation:sxMedal .6s cubic-bezier(.34,1.56,.64,1) both}' +
            '.sx-rise{animation:sxRise .5s cubic-bezier(.22,1,.36,1) both}' +
            '.sx-pop{animation:sxPop .45s cubic-bezier(.34,1.56,.64,1) both}' +
            '.sx-grow{transform-origin:left;animation:sxGrow 1s cubic-bezier(.22,1,.36,1) both}' +
            '@media (prefers-reduced-motion:reduce){.sx-hero::before{display:none}.sx-medal,.sx-rise,.sx-pop,.sx-grow{animation:none;transform:none}}'
        );
    }

    function CardNivelAtual({ nivel, stats, thresholds, progresso }) {
        const cor = TIER_COR[nivel] || TIER_COR[1];
        const nome = nivel === 3 ? 'Ouro' : nivel === 2 ? 'Prata' : 'Bronze';
        const proxNivel = progresso && progresso.proximo_nivel;
        const proxNome = proxNivel === 3 ? 'Ouro' : proxNivel === 2 ? 'Prata' : null;
        let progPct = 100;
        if (progresso && progresso.requisitos && progresso.requisitos.length) {
            const soma = progresso.requisitos.reduce((a, r) => a + Math.min(100, parseFloat(r.pct) || 0), 0);
            progPct = Math.round(soma / progresso.requisitos.length);
        }
        const badge = nivel === 3 ? 'Nível máximo' : 'Nível ' + nivel + ' de 3';
        const msg = nivel === 3 ? 'Mantenha a performance para continuar como Ouro'
            : (proxNome ? ('Complete os requisitos e vire ' + proxNome) : 'Continue entregando pra subir de nível');

        return h('div', { className: 'sx-hero sx-rise rounded-2xl p-5 text-white shadow-lg', style: { background: cor.grad, boxShadow: '0 10px 24px -8px ' + cor.sombra } },
            h('div', { className: 'flex items-center gap-3', style: { position: 'relative', zIndex: 1 } },
                h('div', { className: 'sx-medal', style: { width: 62, height: 62, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: cor.medal, border: '3px solid rgba(255,255,255,.5)', boxShadow: 'inset 0 2px 6px rgba(255,255,255,.4), 0 3px 8px rgba(0,0,0,.2)' } },
                    h('svg', { className: 'ico', style: { width: 30, height: 30 }, 'aria-hidden': 'true' }, h('use', { href: '#i-medal' }))
                ),
                h('div', null,
                    h('div', { className: 'text-2xl font-extrabold', style: { lineHeight: 1 } }, nome),
                    h('div', { className: 'text-xs opacity-90 mt-1' }, 'Seu nível atual'),
                    h('span', { className: 'inline-block mt-1.5 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full', style: { background: 'rgba(255,255,255,.25)', letterSpacing: '.8px' } }, badge)
                )
            ),
            proxNome && h('div', { style: { position: 'relative', zIndex: 1, marginTop: 18 } },
                h('div', { className: 'flex justify-between items-baseline mb-1.5' },
                    h('span', { className: 'text-xs font-semibold', style: { opacity: .95 } }, 'Progresso para ' + proxNome),
                    h('span', { className: 'text-sm font-extrabold' }, progPct + '%')
                ),
                h('div', { style: { height: 8, borderRadius: 999, background: 'rgba(0,0,0,.18)', overflow: 'hidden' } },
                    h('div', { className: 'sx-grow', style: { height: '100%', borderRadius: 999, background: '#fff', width: progPct + '%' } })
                )
            ),
            h('div', { className: 'flex items-center gap-2', style: { position: 'relative', zIndex: 1, marginTop: 16, background: 'rgba(255,255,255,.18)', borderRadius: 12, padding: '10px 12px' } },
                h('svg', { className: 'ico', style: { width: 16, height: 16, flexShrink: 0 }, 'aria-hidden': 'true' }, h('use', { href: nivel === 3 ? '#i-lock' : '#i-target' })),
                h('span', { className: 'text-xs font-semibold' }, msg)
            )
        );
    }

    function CardRequisitos({ progresso, nivel }) {
        const cor = TIER_COR[nivel] || TIER_COR[1];
        const proxNivel = progresso.proximo_nivel;
        const proxNome = proxNivel === 3 ? 'Ouro' : proxNivel === 2 ? 'Prata' : null;
        const reqs = progresso.requisitos || [];

        return h('div', { className: 'sx-rise bg-white rounded-2xl p-4 shadow-sm', style: { animationDelay: '.06s' } },
            h('h3', { className: 'text-sm font-extrabold text-gray-900' }, proxNome ? 'O que falta pra subir de nível' : 'Requisitos do seu nível'),
            h('p', { className: 'text-[11px] text-gray-500 mb-3', style: { marginBottom: 14 } }, proxNome ? ('Bata os ' + reqs.length + ' pra desbloquear ' + proxNome) : 'Mantenha todos pra continuar no topo'),
            h('div', { className: 'space-y-4' },
                reqs.map((r, i) => {
                    const suf = r.sufixo || '';
                    const ok = !!r.ok;
                    const pct = Math.min(100, parseFloat(r.pct) || 0);
                    const atualN = parseFloat(String(r.atual).replace(',', '.'));
                    const metaN = parseFloat(String(r.meta).replace(',', '.'));
                    const falta = (!ok && isFinite(atualN) && isFinite(metaN) && metaN > atualN)
                        ? ('Faltam ' + (Math.round((metaN - atualN) * 100) / 100) + suf + ' pra ' + (proxNome || 'o próximo nível'))
                        : null;
                    return h('div', { key: i },
                        h('div', { className: 'flex items-center justify-between mb-1.5' },
                            h('span', { className: 'flex items-center gap-2 text-xs font-semibold text-gray-700' },
                                h('span', { className: 'sx-pop', style: { width: 20, height: 20, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: ok ? '#dcfce7' : '#fef3c7', animationDelay: (0.2 + i * 0.1) + 's' } },
                                    h('svg', { className: 'ico', style: { width: 13, height: 13, color: ok ? '#16a34a' : '#d97706' }, 'aria-hidden': 'true' }, h('use', { href: ok ? '#i-check' : '#i-target' }))
                                ),
                                r.label
                            ),
                            h('span', { className: 'text-xs font-bold', style: { fontVariantNumeric: 'tabular-nums' } },
                                h('span', { className: 'text-gray-900' }, r.atual + suf),
                                h('span', { className: 'text-gray-400' }, ' / '),
                                h('span', { className: 'text-gray-500' }, r.meta + suf)
                            )
                        ),
                        h('div', { style: { height: 7, borderRadius: 999, background: '#eef0f3', overflow: 'hidden' } },
                            h('div', { className: 'sx-grow', style: { height: '100%', borderRadius: 999, width: pct + '%', background: ok ? '#22c55e' : cor.accent } })
                        ),
                        falta && h('p', { className: 'text-[10px] mt-1 font-semibold', style: { color: '#b45309' } }, falta)
                    );
                })
            )
        );
    }

    // ============================================================
    // 🎁 ROADMAP DE BONIFICAÇÕES (3 cards: Bronze, Prata, Ouro)
    // ============================================================
    function RoadmapBonificacoes({ nivelAtual, thresholds, bonusValores, modelo, extrasCfg }) {
        const _ex = (extrasCfg && typeof extrasCfg === 'object') ? extrasCfg : { n2: [], n3: [] }; // BONUS_EXTRAS_MB_V1
        // ROADMAP_REAL_V1: usa o MODELO real da praça (min_elegivel, pct por nivel,
        // dias no pico) em vez dos thresholds antigos — pra bater com o card de nivel.
        const m = modelo || { min_elegivel: 40, pct_prata: 85, pct_ouro: 92, dias_pico_prata: 12, dias_pico_ouro: 18, hora_corte: 16 };
        const fmtPct = (v) => (parseFloat(v) || 0).toFixed(0);
        const b = bonusValores || {
            sorteio_n2: 50, sorteio_n3: 150,
            saque_n2: 500, saque_n3: 500,
        };
        const fmt = (v) => 'R$ ' + (parseFloat(v) || 0).toFixed(2).replace('.', ',');

        const niveis = [
            {
                num: 1, nome: 'Bronze', emoji: '',
                criterios: ['Disponível para todos'],
                bonus: ['Sem bônus extra'],
            },
            {
                num: 2, nome: 'Prata', emoji: '',
                criterios: [
                    '≥ ' + m.min_elegivel + ' entregas no período',
                    '≥ ' + m.dias_pico_prata + ' dias com entrega após ' + m.hora_corte + 'h',
                    '≥ ' + fmtPct(m.pct_prata) + '% no prazo',
                ],
                bonus: [
                    (b.qtd_n2 || 1) + (Number(b.qtd_n2) === 1 ? ' saque grátis/mês de até ' : ' saques grátis/mês de até ') + fmt(b.saque_n2),
                ], // SORTEIO_EXTRA_FRONT_V1: sorteio agora e extra
            },
            {
                num: 3, nome: 'Ouro', emoji: '',
                criterios: [
                    '≥ ' + m.min_elegivel + ' entregas no período',
                    '≥ ' + m.dias_pico_ouro + ' dias com entrega após ' + m.hora_corte + 'h',
                    '≥ ' + fmtPct(m.pct_ouro) + '% no prazo',
                ],
                bonus: [
                    (b.qtd_n3 || 1) + (Number(b.qtd_n3) === 1 ? ' saque grátis/semana de até ' : ' saques grátis/semana de até ') + fmt(b.saque_n3),
                ],
            },
        ];

        return h('div', { className: 'bg-white border border-gray-200 rounded-xl p-4' },
            h('h3', { className: 'text-sm font-bold text-gray-900 mb-3' },
                'O que você ganha em cada nível'
            ),
            h('div', { className: 'space-y-3' },
                niveis.map(n => h(CardRoadmap, {
                    key: n.num,
                    nivel: n,
                    isAtual: n.num === nivelAtual,
                    isAlcancado: n.num <= nivelAtual,
                    extras: n.num === 2 ? (_ex.n2 || []) : (n.num === 3 ? (_ex.n3 || []) : []),
                }))
            )
        );
    }

    function _icoExtra(tipo) {
        var href = tipo === 'valor' ? '#i-wallet' : tipo === 'item' ? '#i-briefcase' : tipo === 'sorteio' ? '#i-party' : '#i-star';
        return h('svg', { className: 'ico', style: { width: 14, height: 14 }, 'aria-hidden': 'true' }, h('use', { href: href }));
    }
    function CardRoadmap({ nivel, isAtual, isAlcancado, extras }) {
        const _extras = Array.isArray(extras) ? extras : []; // BONUS_EXTRAS_MB_V1
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
                            nivel.nome
                        ),
                        isAtual && h('div', { className: 'text-[10px] font-bold text-purple-700 uppercase' }, h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-star" })), "Você está aqui"))
                    )
                ),
                isAlcancado && !isAtual && h('span', { className: 'text-xs text-green-700 font-bold' }, h("svg", { className: "ico", style: { width: 14, height: 14, color: "#16a34a" }, "aria-hidden": "true" }, h("use", { href: "#i-check" })))
            ),
            h('div', { className: 'text-xs space-y-1 mt-2' },
                h('div', { className: 'font-semibold text-gray-700' }, 'Critérios:'),
                nivel.criterios.map((c, i) => h('div', { key: i, className: 'text-gray-600 ml-2' }, '• ' + c)),
                h('div', { className: 'font-semibold text-gray-700 mt-2' }, 'Bônus:'),
                nivel.bonus.map((b, i) => h('div', { key: i, className: 'text-gray-600 ml-2' }, b)),
                _extras.length > 0 && h('div', { className: 'font-semibold text-gray-700 mt-2' }, 'Bônus extras:'),
                _extras.map((bx, i) => h('div', { key: 'ex' + i, className: 'flex items-start gap-2 ml-2 mt-1' },
                    h('span', { className: 'flex-shrink-0 mt-0.5', style: { color: bx.tipo === 'valor' ? '#059669' : bx.tipo === 'item' ? '#2563eb' : bx.tipo === 'sorteio' ? '#ea580c' : '#7c3aed' } }, _icoExtra(bx.tipo)),
                    h('div', null,
                        h('div', { className: 'text-gray-800 font-semibold text-[11px]' },
                            (bx.titulo || '') + (((bx.tipo === 'valor' || bx.tipo === 'sorteio') && bx.valor != null) ? (' — R$ ' + (parseFloat(bx.valor) || 0).toFixed(2).replace('.', ',')) : '')),
                        bx.descricao && h('div', { className: 'text-gray-500 text-[10px] leading-snug' }, bx.descricao)
                    )
                ))
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
                h('span', { className: 'font-bold text-sm text-gray-900' }, h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-clipboard" })), "Minhas Entregas (28 dias)")),
                h('span', { className: 'text-gray-400 text-sm' }, aberto ? '' : '')
            ),
            aberto && h('div', { className: 'p-4 border-t border-gray-200' },
                loading && h('div', { className: 'text-center text-gray-500 text-sm py-4' }, h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-clock" })), "Carregando...")),
                erro && h('div', { className: 'text-center text-red-500 text-sm py-4' }, '' + erro),
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
                    { id: 'no_prazo', label: 'No prazo (' + totais.no_prazo + ')', cor: 'bg-green-100 text-green-800' },
                    { id: 'fora_prazo', label: 'Fora (' + totais.fora_prazo + ')', cor: 'bg-red-100 text-red-800' },
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
                noPrazo ? h("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, h("use", { href: "#i-check" })) : foraPrazo ? h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-x" })) : h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-clock" }))
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
    // ============================================================
    // 🆕 2026-06: AVISO DE APROVEITAMENTO SEMANAL (modal ao abrir o app)
    // ============================================================
    async function mostrarAvisoAproveitamento({ apiUrl, token, fetchAuth }) {
        let r;
        if (typeof fetchAuth === 'function') {
            r = await fetchAuth(apiUrl + '/score-v2/meu-aviso-aproveitamento');
        } else {
            r = await fetch(apiUrl + '/score-v2/meu-aviso-aproveitamento', {
                headers: { 'Authorization': 'Bearer ' + (token || '') }, credentials: 'include'
            });
        }
        if (!r.ok) return false;
        const data = await r.json();
        if (!data.tem_aviso || !data.aviso) return false;

        const container = document.createElement('div');
        container.id = 'score-v2-aviso-aproveitamento';
        document.body.appendChild(container);
        const root = ReactDOM.createRoot ? ReactDOM.createRoot(container) : null;
        const fechar = () => {
            // marca como visto (fire-and-forget)
            try {
                if (typeof fetchAuth === 'function') {
                    fetchAuth(apiUrl + '/score-v2/aviso-aproveitamento/visto', { method: 'POST' });
                } else {
                    fetch(apiUrl + '/score-v2/aviso-aproveitamento/visto', {
                        method: 'POST', headers: { 'Authorization': 'Bearer ' + (token || '') }, credentials: 'include'
                    });
                }
            } catch (_) {}
            if (root) root.unmount(); else ReactDOM.unmountComponentAtNode(container);
            container.remove();
        };
        const modal = h(AvisoAproveitamentoModal, { aviso: data.aviso, onFechar: fechar });
        if (root) root.render(modal); else ReactDOM.render(modal, container);
        return true;
    }

    function AvisoAproveitamentoModal({ aviso, onFechar }) {
        const pct = Number(aviso.pct_prazo) || 0;
        const meta = Number(aviso.pct_min_aplicado) || 95;
        const nome = (aviso.nome_prof || '').split(' ')[0];
        const reincidente = (aviso.semanas_consecutivas || 1) >= 2;

        return h('div', { className: 'fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4' },
            h('div', { className: 'bg-white rounded-t-2xl md:rounded-2xl max-w-md w-full p-5 max-h-[85vh] overflow-y-auto' },
                h('div', { className: 'flex justify-center mb-3' },
                    h('div', { className: 'w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center text-2xl' }, h("svg", { className: "ico", style: { width: 26, height: 26 }, "aria-hidden": "true" }, h("use", { href: "#i-target" })))
                ),
                h('h2', { className: 'text-center text-lg font-bold text-gray-900' }, 'Bora ajustar pra próxima?'),
                h('p', { className: 'text-center text-sm text-gray-600 mt-1 mb-4' },
                    (nome ? ('E aí, ' + nome + '! ') : 'E aí! ') + 'Sua semana fechou assim:'),

                h('div', { className: 'bg-gray-50 border border-gray-100 rounded-xl p-4 mb-4' },
                    h('div', { className: 'flex items-baseline justify-center gap-1.5' },
                        h('span', { className: 'text-3xl font-bold text-amber-700' }, pct.toFixed(0) + '%'),
                        h('span', { className: 'text-sm text-gray-500' }, 'no prazo')
                    ),
                    h('p', { className: 'text-center text-xs text-gray-400 mb-3' },
                        (aviso.entregas_prazo || 0) + ' de ' + (aviso.entregas_total || 0) + ' entregas dentro do tempo'),
                    h('div', { className: 'relative h-2 bg-gray-200 rounded-full overflow-hidden' },
                        h('div', { className: 'h-full bg-amber-500 rounded-full', style: { width: Math.min(100, pct) + '%' } }),
                        h('div', { className: 'absolute top-[-3px] w-0.5 h-3.5 bg-green-600', style: { left: Math.min(100, meta) + '%' } })
                    ),
                    h('div', { className: 'flex justify-between text-[11px] text-gray-400 mt-1' },
                        h('span', null, 'seu índice'),
                        h('span', { className: 'text-green-600' }, 'ideal: ' + meta + '%')
                    )
                ),

                h('p', { className: 'text-xs text-gray-600 leading-relaxed mb-4' },
                    (reincidente
                        ? 'Seguimos abaixo do ideal essa semana, mas dá pra virar o jogo. '
                        : 'Dessa vez não rolou bater os ' + meta + '%, mas é totalmente recuperável. ') +
                    'Organizar a ordem das paradas e pegar primeiro as corridas mais perto costuma ajudar bastante. ' +
                    'O direcionamento de oportunidades a cada parceiro considera o aproveitamento ao longo das semanas — mantendo o ritmo acima de ' + meta + '%, você segue com prioridade nos chamados.'),

                h('button', {
                    onClick: onFechar,
                    className: 'w-full px-4 py-3 bg-purple-600 text-white rounded-lg font-medium text-sm hover:bg-purple-700'
                }, 'Entendi, bora melhorar')
            )
        );
    }

    window.ModuloScoreV2WelcomeModal = {
        show: async function({ apiUrl, token, fetchAuth, onMount }) {
            // 🆕 2026-06: primeiro checa aviso de aproveitamento semanal (prioritário,
            // independe do nível). Se houver, mostra ESSE modal e não abre o welcome.
            try {
                const mostrouAviso = await mostrarAvisoAproveitamento({ apiUrl, token, fetchAuth });
                if (mostrouAviso) return;
            } catch (_) {}

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
        const emoji = nivel === 3 ? h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-medal" })) : nivel === 2 ? h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-medal" })) : h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-medal" }));
        const nome = nivel === 3 ? 'Ouro' : nivel === 2 ? 'Prata' : 'Bronze';

        return h('div', { className: 'fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4' },
            h('div', { className: 'bg-white rounded-t-2xl md:rounded-2xl max-w-md w-full p-5 max-h-[85vh] overflow-y-auto' },
                h('div', { className: 'text-center mb-4' },
                    h('div', { className: 'text-5xl mb-2' }, emoji),
                    h('h2', { className: 'text-lg font-bold text-gray-900' },
                        subiu ? h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-party" })), "Parabéns, você subiu!") : 'Bem-vindo de volta!'
                    ),
                    h('p', { className: 'text-sm text-gray-600 mt-1' }, 'Você está em ' + nome)
                ),
                bonus && bonus.lancado && h('div', { className: 'bg-green-50 border border-green-200 rounded-lg p-3 mb-3' },
                    h('p', { className: 'text-sm font-bold text-green-900' }, h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-wallet" })), "Saque grátis disponível!")),
                    h('p', { className: 'text-xs text-green-700 mt-1' },
                        'Você tem direito a 1 saque grátis até ' + fmtBRL(bonus.valor) +
                        ' (' + (bonus.tipo === 'saque_semanal' ? 'esta semana' : 'este mês') + ').'
                    )
                ),
                progresso && h('div', { className: 'mb-4' },
                    h('h3', { className: 'text-xs font-bold text-gray-700 mb-2' },
                        'Falta pouco pro ' + (progresso.proximo_nivel === 3 ? 'Ouro' : progresso.proximo_nivel === 2 ? 'Prata' : 'Bronze')
                    ),
                    h('div', { className: 'space-y-2' }, progresso.requisitos.map((r, i) => h('div', { key: i },
                        h('div', { className: 'flex items-center justify-between text-xs mb-1' },
                            h('span', { className: 'text-gray-700' }, (r.ok ? h("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, h("use", { href: "#i-check" })) : h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-circle" }))) + r.label),
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
