/* UI_UNIFICADO_V1: emojis -> sprite de icones; cores na paleta unica (CORES_TOKENS_V1). */
/* DEEMOJI_V1 */ /* SCORE_ADMIN_REDESIGN_V1 */ /* SCORE_VISAO_ATIVOS_V1 */ /* SCORE_A_LIBERAR_V1 */
// ==================== MÓDULO SCORE V2 (ADMIN) ====================
// Arquivo: modulo-score-v2.js
// Tela admin pra configurar score por região + ver sorteios + motoboys.
//
// Estrutura:
//   - Aba "Configurações": ativa/desativa score por região, valores
//   - Aba "Motoboys por Categoria": lista quem está em cada categoria (Bronze/Prata/Ouro)
//   - Aba "Sorteios": histórico mensal e disparo manual
// SCORE_ADMIN_REDESIGN_V1 (2026-10): + Visão geral (painel por praça),
//   + Contemplados (quem ganhou saque/sorteio, com o quê e se sacou),
//   + Diagnóstico do motoboy (por que recebeu / não recebeu).
// =====================================================================

(function() {
    'use strict';

    const { useState, useEffect, useCallback, useRef, useMemo } = React;
    const h = React.createElement;

    function fmtBRL(v) {
        return 'R$ ' + (parseFloat(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    function fmtData(s) {
        if (!s) return '-';
        const d = new Date(s);
        return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    // ============================================================
    // SCORE_ADMIN_REDESIGN_V1: helpers visuais compartilhados
    // ============================================================
    function ico(nome, tam, extra) {
        return h('svg', Object.assign({ className: 'ico', style: { width: tam || 16, height: tam || 16, flexShrink: 0 }, 'aria-hidden': 'true' }, extra || {}), h('use', { href: '#i-' + nome }));
    }
    const COR_NIVEL = {
        3: { nome: 'Ouro', bar: '#d97706', bg: 'bg-yellow-50', txt: 'text-yellow-800', chip: 'bg-yellow-100 text-yellow-800' },
        2: { nome: 'Prata', bar: '#9ca3af', bg: 'bg-slate-50', txt: 'text-slate-700', chip: 'bg-slate-100 text-slate-700' },
        1: { nome: 'Bronze', bar: '#92400e', bg: 'bg-amber-50', txt: 'text-amber-800', chip: 'bg-amber-100 text-amber-800' },
    };
    const SITUACAO = {
        a_liberar: { label: 'A liberar (carência)', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
        sacou: { label: 'Sacou', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        disponivel: { label: 'Disponível', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
        em_andamento: { label: 'Saque em andamento', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
        expirou: { label: 'Expirou sem uso', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
        saque_falhou: { label: 'Saque recusado', cls: 'bg-red-50 text-red-700 border-red-200' },
        removida: { label: 'Removida', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
        usada_sem_saque: { label: 'Usada (sem saque)', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
    };
    const STATUS_SAQUE = {
        pago_stark: 'pago', aprovado: 'aprovado', aprovado_gratuidade: 'aprovado',
        aguardando_aprovacao: 'aguardando', aguardando_pagamento_stark: 'aguardando Stark',
        rejeitado: 'rejeitado', cancelado: 'cancelado', excluido: 'excluído', inativo: 'inativo',
    };
    function badgeSituacao(s) {
        const cfg = SITUACAO[s] || { label: s || '—', cls: 'bg-gray-100 text-gray-600 border-gray-200' };
        return h('span', { className: 'inline-flex items-center whitespace-nowrap text-[11px] font-semibold px-2 py-0.5 rounded-full border ' + cfg.cls }, cfg.label);
    }
    function chipNivel(n) {
        const c = COR_NIVEL[n] || COR_NIVEL[1];
        return h('span', { className: 'text-[11px] font-bold px-2 py-0.5 rounded ' + c.chip }, c.nome);
    }
    function labelOrigem(c) {
        const mesBR = (p) => (p && /^\d{4}-\d{2}$/.test(p)) ? (p.slice(5) + '/' + p.slice(0, 4)) : (p || '');
        if (c.tipo === 'saque_mensal') return { titulo: 'Saque Prata', sub: 'mês ' + mesBR(c.periodo) };
        if (c.tipo === 'saque_semanal') return { titulo: 'Saque Ouro', sub: 'semana ' + String(c.periodo || '').replace(/^\d{4}-W/, '') + '/' + String(c.periodo || '').slice(0, 4) };
        if (c.tipo === 'sorteio') return { titulo: 'Sorteio ' + ((COR_NIVEL[c.nivel] || {}).nome || ''), sub: 'ref. ' + mesBR(c.mes_referencia) };
        if (c.tipo === 'legado_v1') return { titulo: 'Score v1', sub: 'legado' };
        return { titulo: c.tipo || '—', sub: '' };
    }
    function BarraNiveis({ niveis, altura }) {
        const n = niveis || {};
        const total = (n[1] || 0) + (n[2] || 0) + (n[3] || 0);
        if (!total) return h('div', { className: 'w-full rounded-full bg-gray-100', style: { height: altura || 8 } });
        return h('div', { className: 'w-full flex rounded-full overflow-hidden bg-gray-100', style: { height: altura || 8 } },
            [3, 2, 1].map(k => (n[k] || 0) > 0 && h('div', { key: k, title: COR_NIVEL[k].nome + ': ' + n[k], style: { width: (100 * n[k] / total) + '%', background: COR_NIVEL[k].bar } }))
        );
    }
    function Kpi({ titulo, valor, sub, icone, destaque }) {
        return h('div', { className: 'bg-white rounded-xl border border-gray-200 p-3.5 min-w-0' },
            h('div', { className: 'flex items-center gap-1.5 text-[11px] font-medium text-gray-500 uppercase tracking-wide' }, icone && ico(icone, 14), titulo),
            h('div', { className: 'text-2xl font-bold mt-1 ' + (destaque || 'text-gray-900'), style: { fontVariantNumeric: 'tabular-nums' } }, valor),
            sub && h('div', { className: 'text-[11px] text-gray-500 mt-0.5 leading-snug' }, sub)
        );
    }
    function useApiRefs(fetchApi, showToast) {
        const fetchApiRef = useRef(fetchApi);
        const showToastRef = useRef(showToast);
        useEffect(() => { fetchApiRef.current = fetchApi; }, [fetchApi]);
        useEffect(() => { showToastRef.current = showToast; }, [showToast]);
        return { fetchApiRef, showToastRef };
    }
    function hojeISO(offsetDias) {
        const d = new Date(Date.now() + (offsetDias || 0) * 86400000);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    window.ModuloScoreV2Component = function(props) {
        const { fetchApi, showToast } = props;
        const [tab, setTab] = useState('visao');
        const [diagCod, setDiagCod] = useState(null);
        const [presetContemplados, setPresetContemplados] = useState(null); // { regiao, situacao }
        const [presetMotoboys, setPresetMotoboys] = useState('');

        const abrirDiagnostico = useCallback((cod) => { if (cod) setDiagCod(String(cod)); }, []);
        const irPara = useCallback((destino, preset) => {
            if (destino === 'contemplados') setPresetContemplados(Object.assign({ _t: Date.now() }, preset || {}));
            if (destino === 'motoboys') setPresetMotoboys((preset && preset.busca) || '');
            setTab(destino);
        }, []);

        const abas = [
            { id: 'visao', label: 'Visão geral', icon: 'chart' },
            { id: 'contemplados', label: 'Contemplados', icon: 'wallet' },
            { id: 'motoboys', label: 'Categorias', icon: 'medal' },
            { id: 'aproveitamento', label: 'Corridas', icon: 'trenddown' },
            { id: 'ranking', label: 'Ranking', icon: 'calendar' },
            { id: 'sorteios', label: 'Sorteios', icon: 'gift' },
            { id: 'configuracoes', label: 'Configurações', icon: 'settings' },
        ];

        return h('div', { className: 'max-w-7xl mx-auto p-4 md:p-6' },
            h('div', { className: 'flex items-center gap-3 mb-5' },
                h('div', { className: 'w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm' }, ico('trophy', 22)),
                h('div', null,
                    h('h2', { className: 'text-lg font-semibold text-gray-900 leading-tight' }, 'Score dos profissionais'),
                    h('p', { className: 'text-xs text-gray-500' }, 'Categorias, saques grátis e sorteios por praça')
                )
            ),
            h('div', { className: 'flex gap-1 bg-gray-100 p-1 rounded-xl mb-5 overflow-x-auto' },
                abas.map(t => h('button', {
                    key: t.id,
                    onClick: () => setTab(t.id),
                    className: 'flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ' +
                        (tab === t.id ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-white/70')
                }, ico(t.icon, 16), h('span', null, t.label)))
            ),
            tab === 'visao' && h(AbaVisaoGeral, { fetchApi, showToast, abrirDiagnostico, irPara }),
            tab === 'contemplados' && h(AbaContemplados, { fetchApi, showToast, abrirDiagnostico, preset: presetContemplados }),
            tab === 'configuracoes' && h(AbaConfiguracoes, { fetchApi, showToast }),
            tab === 'aproveitamento' && h(AbaAproveitamento, { fetchApi, showToast }),
            tab === 'motoboys' && h(AbaMotoboys, { fetchApi, showToast, abrirDiagnostico, buscaInicial: presetMotoboys }),
            tab === 'ranking' && h(AbaRanking, { fetchApi, showToast }),
            tab === 'sorteios' && h(AbaSorteios, { fetchApi, showToast, abrirDiagnostico }),
            diagCod && h(DrawerDiagnostico, { cod: diagCod, fetchApi, showToast, onClose: () => setDiagCod(null) })
        );
    };

    // ============================================================
    // SCORE_ADMIN_REDESIGN_V1: ABA VISÃO GERAL
    // ============================================================
    function AbaVisaoGeral({ fetchApi, showToast, abrirDiagnostico, irPara }) {
        const { fetchApiRef, showToastRef } = useApiRefs(fetchApi, showToast);
        const [dados, setDados] = useState(null);
        const [loading, setLoading] = useState(true);
        const [rodando, setRodando] = useState('');
        const [codBusca, setCodBusca] = useState('');
        const [mostrarInativas, setMostrarInativas] = useState(false);

        const carregar = useCallback(async () => {
            setLoading(true);
            try { setDados(await fetchApiRef.current('/score-v2/admin/visao-geral')); }
            catch (err) { showToastRef.current(err.message, 'error'); }
            finally { setLoading(false); }
        }, []);
        useEffect(() => { carregar(); }, [carregar]);

        const lancarPendentes = async () => {
            setRodando('bonus');
            try {
                const r = await fetchApiRef.current('/score-v2/admin/lancar-bonus-pendentes', { method: 'POST', body: '{}' });
                showToastRef.current(r.lancados + ' saque(s) lançado(s) de ' + r.candidatos + ' Prata/Ouro', 'success');
                carregar();
            } catch (err) { showToastRef.current(err.message, 'error'); }
            finally { setRodando(''); }
        };
        const recalcular = async () => {
            if (!confirm('Recalcular a categoria de TODOS os motoboys de todas as praças agora?\n\nIsso antecipa a avaliação de sábado e pode levar alguns minutos.')) return;
            setRodando('recalc');
            try {
                const r = await fetchApiRef.current('/score-v2/admin/avaliar-agora', { method: 'POST', body: '{}' });
                showToastRef.current((r.processados || 0) + ' motoboys · ' + (r.mudancas || []).length + ' mudança(s) de categoria', 'success');
                carregar();
            } catch (err) { showToastRef.current(err.message, 'error'); }
            finally { setRodando(''); }
        };

        if (loading && !dados) return h('div', { className: 'text-center py-12 text-gray-500 text-sm' }, 'Carregando painel...');
        if (!dados) return h('div', { className: 'text-center py-12 text-gray-400 text-sm' }, 'Não foi possível carregar o painel.');

        const t = dados.totais || {};
        const ben = t.beneficios_mes || { por_situacao: {}, total: 0 };
        const ps = ben.por_situacao || {};
        const totalAv = (t.bronze || 0) + (t.prata || 0) + (t.ouro || 0);
        const pracas = (dados.pracas || []).filter(p => mostrarInativas || p.ativo);
        const inativas = (dados.pracas || []).filter(p => !p.ativo).length;
        const mesBR = dados.mes_atual ? dados.mes_atual.slice(5) + '/' + dados.mes_atual.slice(0, 4) : '';

        const alertas = [];
        if ((ps.saque_falhou || 0) > 0) alertas.push({ cor: 'red', txt: ps.saque_falhou + ' saque(s) grátis consumido(s) em saque recusado este mês — o motoboy perdeu o benefício.', acao: () => irPara('contemplados', { situacao: 'saque_falhou' }) });
        if ((ps.expirou || 0) > 0) alertas.push({ cor: 'amber', txt: ps.expirou + ' saque(s) grátis expiraram sem uso este mês.', acao: () => irPara('contemplados', { situacao: 'expirou' }) });
        if ((t.desatualizados || 0) > 0) alertas.push({ cor: 'amber', txt: t.desatualizados + ' motoboy(s) não foram reavaliados na última rodada (saíram do CRM ou mudaram de praça). Ficam fora das contagens, do saque e do sorteio.', acao: null });

        return h('div', { className: 'space-y-4' },
            // faixa de status + ações
            h('div', { className: 'bg-white rounded-xl border border-gray-200 p-3.5 flex flex-wrap items-center gap-x-5 gap-y-2' },
                h('div', { className: 'flex items-center gap-2 text-xs text-gray-600' }, ico('clock', 15), h('span', null, 'Última avaliação: ', h('b', { className: 'text-gray-900' }, dados.ultima_avaliacao || '—'))),
                h('div', { className: 'flex items-center gap-2 text-xs text-gray-600' }, ico('calendar', 15), h('span', null, 'Próxima: ', h('b', { className: 'text-gray-900' }, 'sáb ' + (dados.proxima_avaliacao || '12:00')))),
                h('div', { className: 'flex items-center gap-2 text-xs text-gray-600' }, ico('wallet', 15), h('span', null, 'Saques grátis lançados todo dia às ', h('b', { className: 'text-gray-900' }, '07:30'))),
                h('div', { className: 'flex items-center gap-2 ml-auto flex-wrap' },
                    h('form', {
                        className: 'flex items-center gap-1',
                        onSubmit: (e) => { e.preventDefault(); if (codBusca.trim()) abrirDiagnostico(codBusca.trim()); }
                    },
                        h('input', { value: codBusca, onChange: e => setCodBusca(e.target.value), placeholder: 'Código do motoboy', className: 'w-36 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-purple-400' }),
                        h('button', { type: 'submit', className: 'px-2.5 py-1.5 text-xs font-medium text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-50 inline-flex items-center gap-1' }, ico('search', 14), 'Diagnosticar')
                    ),
                    h('button', { onClick: lancarPendentes, disabled: !!rodando, className: 'px-3 py-1.5 text-xs font-medium text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-50 disabled:opacity-50 inline-flex items-center gap-1.5' },
                        ico('wallet', 14), rodando === 'bonus' ? 'Lançando...' : 'Lançar saques pendentes'),
                    h('button', { onClick: recalcular, disabled: !!rodando, className: 'px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 inline-flex items-center gap-1.5' },
                        ico('refresh', 14), rodando === 'recalc' ? 'Recalculando...' : 'Recalcular categorias')
                )
            ),

            // KPIs
            h('div', { className: 'grid grid-cols-2 lg:grid-cols-4 gap-3' },
                // SCORE_A_LIBERAR_V1: ja conquistaram e estao na carencia
                h('button', { onClick: () => irPara('contemplados', { situacao: 'a_liberar' }), className: 'text-left rounded-xl border p-3.5 min-w-0 transition-colors hover:border-amber-400', style: { background: '#fffbeb', borderColor: '#fde68a' } },
                    h('div', { className: 'flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide', style: { color: '#92400e' } }, ico('clock', 14), 'A liberar (carência)'),
                    h('div', { className: 'text-2xl font-bold mt-1', style: { color: '#92400e', fontVariantNumeric: 'tabular-nums' } }, ((t.a_liberar || {}).total || 0) + ' motoboys'),
                    h('div', { className: 'text-[11px] mt-0.5', style: { color: '#92400e' } }, 'já conquistaram · ' + ((t.a_liberar || {}).ate_sabado || 0) + ' liberam até sábado · Ver lista →')
                ),
                h('div', { className: 'bg-white rounded-xl border border-gray-200 p-3.5 min-w-0' },
                    // SCORE_VISAO_ATIVOS_V1: so quem rodou nos ultimos 28 dias entra nas categorias
                    h('div', { className: 'flex items-center gap-1.5 text-[11px] font-medium text-gray-500 uppercase tracking-wide' }, ico('users', 14), 'Rodaram em 28 dias'),
                    h('div', { className: 'text-2xl font-bold mt-1 text-gray-900', style: { fontVariantNumeric: 'tabular-nums' } }, totalAv.toLocaleString('pt-BR'),
                        h('span', { className: 'text-xs font-normal text-gray-500 ml-1.5' }, 'de ' + (t.motoboys || 0).toLocaleString('pt-BR') + ' cadastrados')),
                    h('div', { className: 'text-[11px] text-gray-500 mt-0.5' }, (t.elegiveis || 0).toLocaleString('pt-BR') + ' na disputa (bateram a entrada da praça)'),
                    h('div', { className: 'mt-2' }, h(BarraNiveis, { niveis: { 1: t.bronze, 2: t.prata, 3: t.ouro } })),
                    h('div', { className: 'flex gap-3 mt-1.5 text-[11px] text-gray-600' },
                        [3, 2, 1].map(k => h('span', { key: k, className: 'inline-flex items-center gap-1' },
                            h('span', { className: 'inline-block w-2 h-2 rounded-full', style: { background: COR_NIVEL[k].bar } }),
                            COR_NIVEL[k].nome + ' ' + ((k === 3 ? t.ouro : k === 2 ? t.prata : t.bronze) || 0)))
                    )
                ),
                h('button', { onClick: () => irPara('contemplados', {}), className: 'text-left bg-white rounded-xl border border-gray-200 p-3.5 min-w-0 hover:border-purple-300 transition-colors' },
                    h('div', { className: 'flex items-center gap-1.5 text-[11px] font-medium text-gray-500 uppercase tracking-wide' }, ico('gift', 14), 'Saques grátis · ' + mesBR),
                    h('div', { className: 'text-2xl font-bold mt-1 text-gray-900', style: { fontVariantNumeric: 'tabular-nums' } }, (ben.total || 0) + ' lançados'),
                    h('div', { className: 'text-[11px] text-gray-600 mt-1 leading-relaxed' },
                        h('span', { className: 'text-emerald-700 font-semibold' }, (ps.sacou || 0) + ' sacaram'), ' · ',
                        h('span', { className: 'text-blue-700 font-semibold' }, (ps.disponivel || 0) + ' disponíveis'), ' · ',
                        h('span', null, (ps.expirou || 0) + ' expiraram'),
                        (ps.saque_falhou || 0) > 0 && h('span', { className: 'text-red-700' }, ' · ' + ps.saque_falhou + ' recusados')
                    )
                ),
                h(Kpi, { titulo: 'Sacado sem taxa · ' + mesBR, icone: 'trendup', valor: fmtBRL(ben.valor_sacado || 0), sub: 'taxa isenta ≈ ' + fmtBRL(ben.taxa_isenta || 0) + ' · ' + (ben.motoboys || 0) + ' motoboy(s)' })
            ),

            // alertas
            alertas.length > 0 && h('div', { className: 'space-y-2' }, alertas.map((a, i) => h('div', {
                key: i,
                className: 'flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs ' + (a.cor === 'red' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-900')
            }, ico('alert', 16), h('span', { className: 'flex-1' }, a.txt),
                a.acao && h('button', { onClick: a.acao, className: 'font-semibold underline whitespace-nowrap' }, 'Ver lista')))),

            // praças
            h('div', { className: 'flex items-center justify-between pt-1' },
                h('div', null,
                    h('h3', { className: 'text-sm font-bold text-gray-900' }, 'Praças · ' + (t.pracas_ativas || 0) + ' com score' + (inativas ? ' (' + inativas + ' desativada' + (inativas > 1 ? 's' : '') + ')' : '')),
                    h('p', { className: 'text-[11px] text-gray-500 mt-0.5' },
                        h('b', null, 'Rodaram'), ': fizeram ao menos 1 entrega em 28 dias (só eles entram nas categorias) · ',
                        h('b', null, 'Na disputa'), ': bateram a entrada mínima da praça · ',
                        h('b', null, 'Carência'), ': mudaram de categoria há menos de 7 dias, saque ainda não liberado')),
                inativas > 0 && h('label', { className: 'flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer' },
                    h('input', { type: 'checkbox', checked: mostrarInativas, onChange: e => setMostrarInativas(e.target.checked), className: 'accent-purple-600' }), 'mostrar desativadas')
            ),
            pracas.length === 0
                ? h('div', { className: 'bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500' }, 'Nenhuma praça com score. Configure na aba Configurações.')
                : h('div', { className: 'grid lg:grid-cols-2 gap-3' }, pracas.map(p => h(CardPraca, { key: p.id, p, irPara, abrirDiagnostico })))
        );
    }

    function CardPraca({ p, irPara, abrirDiagnostico }) {
        const c = p.criterios || {};
        const b = p.beneficios || {};
        const bm = p.beneficios_mes || {};
        const tem = (n) => (p.niveis_ativos || []).includes(n);
        const qtdTxt = (q) => (Number(q) || 1) + '×';
        // teto 0/vazio na config: o lançamento usa R$ 500 (padrão)
        const tetoTxt = (v) => Number(v) > 0 ? fmtBRL(v) : fmtBRL(500) + ' (padrão — teto não preenchido)';
        const linha = (rotulo, conteudo) => h('div', { className: 'flex gap-2 text-xs leading-relaxed' },
            h('span', { className: 'text-gray-400 w-20 flex-shrink-0' }, rotulo), h('div', { className: 'text-gray-700 min-w-0 flex-1' }, conteudo));
        const sorteioTxt = [];
        if (tem(2) && Number(b.sorteio_valor_n2) > 0) sorteioTxt.push('Prata ' + fmtBRL(b.sorteio_valor_n2));
        if (tem(3) && Number(b.sorteio_valor_n3) > 0) sorteioTxt.push('Ouro ' + fmtBRL(b.sorteio_valor_n3));

        return h('div', { className: 'bg-white rounded-2xl border border-gray-200 p-4 ' + (p.ativo ? '' : 'opacity-60'), style: { borderLeft: '3px solid ' + (p.ativo ? '#770fa8' : '#d1d5db') } },
            h('div', { className: 'flex items-start justify-between gap-2 mb-3' },
                h('div', { className: 'min-w-0' },
                    h('div', { className: 'flex items-center gap-2 flex-wrap' },
                        h('h4', { className: 'font-semibold text-gray-900' }, p.regiao),
                        h('span', { className: 'px-2 py-0.5 rounded-full text-[10px] font-medium ' + (p.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500') }, p.ativo ? 'Ativo' : 'Desativado'),
                        p.regra_aproveitamento_ativa && h('span', { className: 'px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700' }, 'alerta ' + (p.pct_min_aproveitamento || 95) + '%')
                    ),
                    h('div', { className: 'text-[11px] text-gray-500 mt-0.5' },
                        (p.rodaram != null ? p.rodaram + ' rodaram · ' + (p.elegiveis || 0) + ' na disputa · ' + (p.sem_entregas || 0) + ' cadastrados sem entrega' : p.motoboys + ' avaliados') +
                        (p.media_pct_prazo != null ? ' · média ' + String(p.media_pct_prazo).replace('.', ',') + '% no prazo' : '') +
                        (p.ultima_avaliacao ? ' · avaliado ' + p.ultima_avaliacao.slice(8, 10) + '/' + p.ultima_avaliacao.slice(5, 7) + ' ' + p.ultima_avaliacao.slice(11) : ''))
                )
            ),
            h(BarraNiveis, { niveis: p.niveis, altura: 10 }),
            h('div', { className: 'flex gap-3 mt-1.5 mb-3 text-[11px] text-gray-600' },
                [3, 2, 1].map(k => h('button', {
                    key: k, onClick: () => irPara('motoboys', { busca: p.regiao }),
                    className: 'inline-flex items-center gap-1 hover:text-purple-700'
                }, h('span', { className: 'inline-block w-2 h-2 rounded-full', style: { background: COR_NIVEL[k].bar } }), COR_NIVEL[k].nome + ' ', h('b', null, (p.niveis || {})[k] || 0)))
            ),
            h('div', { className: 'space-y-1 mb-3' },
                linha('Regras', 'entrada ' + (c.min_elegivel || 0) + ' entregas · ' +
                    (tem(2) ? 'Prata ≥' + c.pct_prata + '% + ' + c.dias_pico_prata + ' dias pós ' + c.hora_corte + 'h' : '') +
                    (tem(2) && tem(3) ? ' · ' : '') +
                    (tem(3) ? 'Ouro ≥' + c.pct_ouro + '% + ' + c.dias_pico_ouro + ' dias' : '')),
                linha('Saque grátis', [
                    tem(2) ? 'Prata ' + qtdTxt(b.saque_qtd_n2) + '/mês até ' + tetoTxt(b.saque_teto_n2) : null,
                    tem(3) ? 'Ouro 1/semana (vale 3 dias) até ' + tetoTxt(b.saque_teto_n3) : null, // SCORE_OURO_1SEMANA_V1
                ].filter(Boolean).join(' · ') || '—'),
                linha('Sorteio', sorteioTxt.length ? sorteioTxt.join(' · ') + ' (mensal, ≥20 dias na categoria)' : 'desligado')
            ),
            h('div', { className: 'grid grid-cols-5 gap-1.5 mb-3' },
                h('button', {
                    onClick: () => irPara('contemplados', { regiao: p.regiao, situacao: 'a_liberar' }),
                    className: 'rounded-lg px-2 py-1.5 text-center transition-colors border',
                    style: { background: '#fffbeb', borderColor: '#fde68a' }
                }, h('div', { className: 'text-base font-bold leading-none', style: { color: '#92400e' } }, p.a_liberar || 0), h('div', { className: 'text-[10px] mt-0.5', style: { color: '#92400e' } }, 'a liberar')),
                [
                    { k: null, n: bm.lancados || 0, l: 'lançados', cls: 'text-gray-900' },
                    { k: 'sacou', n: bm.sacou || 0, l: 'sacaram', cls: 'text-emerald-700' },
                    { k: 'disponivel', n: bm.disponivel || 0, l: 'disponíveis', cls: 'text-blue-700' },
                    { k: 'expirou', n: bm.expirou || 0, l: 'expiraram', cls: (bm.expirou || 0) > 0 ? 'text-red-700' : 'text-gray-400' },
                ].map((x, i) => h('button', {
                    key: i,
                    onClick: () => irPara('contemplados', { regiao: p.regiao, situacao: x.k || '' }),
                    className: 'bg-gray-50 hover:bg-purple-50 rounded-lg px-2 py-1.5 text-center transition-colors'
                }, h('div', { className: 'text-base font-bold leading-none ' + x.cls }, x.n), h('div', { className: 'text-[10px] text-gray-500 mt-0.5' }, x.l)))
            ),
            (p.proximos_a_liberar || []).length > 0 && h('div', { className: 'mb-3' },
                h('div', { className: 'text-[11px] font-semibold mb-1', style: { color: '#92400e' } }, 'Próximos a liberar'),
                p.proximos_a_liberar.map((x, i) => h('button', {
                    key: i, onClick: () => abrirDiagnostico(x.cod_prof),
                    className: 'w-full flex items-center gap-2 text-xs py-0.5 text-left hover:text-purple-700'
                }, chipNivel(x.nivel), h('span', { className: 'flex-1 truncate text-gray-800' }, x.nome || ('#' + x.cod_prof)), h('span', { className: 'font-semibold whitespace-nowrap', style: { color: '#92400e' } }, x.quando)))
            ),
            (p.ultimos_sorteios || []).length > 0 && h('div', { className: 'text-[11px] text-gray-600 mb-3 flex flex-wrap gap-x-3 gap-y-1' },
                h('span', { className: 'text-gray-400' }, 'Último sorteio:'),
                p.ultimos_sorteios.map((s, i) => h('button', {
                    key: i, onClick: () => abrirDiagnostico(s.cod_prof), className: 'inline-flex items-center gap-1 hover:text-purple-700'
                }, ico('trophy', 12), (COR_NIVEL[s.nivel] || {}).nome + ' ' + s.mes.slice(5) + '/' + s.mes.slice(2, 4) + ': ', h('b', null, s.vencedor), ' (' + fmtBRL(s.valor) + ')')))
            ,
            (p.em_carencia > 0 || p.desatualizados > 0) && h('div', { className: 'flex flex-wrap gap-2 mb-3' },
                p.em_carencia > 0 && h('span', { title: 'Mudaram de categoria há menos de 7 dias. O saque grátis da categoria só é liberado depois disso.', className: 'text-[11px] bg-amber-50 text-amber-800 rounded-full px-2 py-0.5 cursor-help' }, p.em_carencia + ' aguardando liberar saque (carência)'),
                p.desatualizados > 0 && h('span', { title: 'Estavam nesta praça mas não apareceram na última reavaliação: saíram do CRM ou trocaram de praça no CRM. Não contam nas categorias nem recebem saque/sorteio.', className: 'text-[11px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 cursor-help' }, p.desatualizados + ' saíram da praça/CRM')
            ),
            h('div', { className: 'flex gap-2 flex-wrap pt-2 border-t border-gray-100' },
                h('button', { onClick: () => irPara('contemplados', { regiao: p.regiao }), className: 'px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-50 rounded-lg inline-flex items-center gap-1.5' }, ico('wallet', 14), 'Contemplados'),
                h('button', { onClick: () => irPara('motoboys', { busca: p.regiao }), className: 'px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-50 rounded-lg inline-flex items-center gap-1.5' }, ico('medal', 14), 'Motoboys'),
                h('button', { onClick: () => irPara('configuracoes'), className: 'px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-lg inline-flex items-center gap-1.5 ml-auto' }, ico('pencil', 14), 'Regras')
            )
        );
    }

    // ============================================================
    // SCORE_ADMIN_REDESIGN_V1: ABA CONTEMPLADOS
    // ============================================================
    function AbaContemplados({ fetchApi, showToast, abrirDiagnostico, preset }) {
        const { fetchApiRef, showToastRef } = useApiRefs(fetchApi, showToast);
        const inicioMes = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01'; };
        const [periodo, setPeriodo] = useState('mes');
        const [de, setDe] = useState(inicioMes());
        const [ate, setAte] = useState(hojeISO(0));
        const [regiao, setRegiao] = useState((preset && preset.regiao) || '');
        const [tipo, setTipo] = useState('');
        const [situacao, setSituacao] = useState((preset && preset.situacao) || '');
        const [busca, setBusca] = useState('');
        const [buscaDeb, setBuscaDeb] = useState('');
        const [pracas, setPracas] = useState([]);
        const [dados, setDados] = useState(null);
        const [loading, setLoading] = useState(false);
        const [aLiberar, setALiberar] = useState(null); // SCORE_A_LIBERAR_V1

        // a liberar nao depende do periodo (e o que vem pela frente)
        useEffect(() => {
            (async () => {
                try {
                    const q = [];
                    if (regiao) q.push('regiao=' + encodeURIComponent(regiao));
                    if (buscaDeb.trim()) q.push('busca=' + encodeURIComponent(buscaDeb.trim()));
                    setALiberar(await fetchApiRef.current('/score-v2/admin/a-liberar' + (q.length ? '?' + q.join('&') : '')));
                } catch (_) { setALiberar(null); }
            })();
        }, [regiao, buscaDeb]);

        useEffect(() => {
            if (!preset) return;
            setRegiao(preset.regiao || '');
            setSituacao(preset.situacao || '');
        }, [preset && preset._t]);

        useEffect(() => { const t = setTimeout(() => setBuscaDeb(busca), 400); return () => clearTimeout(t); }, [busca]);

        useEffect(() => {
            (async () => {
                try {
                    const cfgs = await fetchApiRef.current('/score-v2/admin/configuracoes');
                    setPracas((cfgs || []).map(c => c.regiao).sort((a, b) => a.localeCompare(b, 'pt-BR')));
                } catch (_) {}
            })();
        }, []);

        const aplicarPeriodo = (p) => {
            setPeriodo(p);
            const d = new Date();
            if (p === 'mes') { setDe(inicioMes()); setAte(hojeISO(0)); }
            if (p === 'mes_ant') {
                const ini = new Date(d.getFullYear(), d.getMonth() - 1, 1);
                const fim = new Date(d.getFullYear(), d.getMonth(), 0);
                const f = (x) => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
                setDe(f(ini)); setAte(f(fim));
            }
            if (p === '90d') { setDe(hojeISO(-89)); setAte(hojeISO(0)); }
            if (p === 'tudo') { setDe(''); setAte(''); }
        };

        useEffect(() => {
            (async () => {
                setLoading(true);
                try {
                    const q = [];
                    if (de) q.push('de=' + de);
                    if (ate) q.push('ate=' + ate);
                    if (regiao) q.push('regiao=' + encodeURIComponent(regiao));
                    if (tipo) q.push('tipo=' + tipo);
                    if (buscaDeb.trim()) q.push('busca=' + encodeURIComponent(buscaDeb.trim()));
                    q.push('limite=2000');
                    setDados(await fetchApiRef.current('/score-v2/admin/contemplados?' + q.join('&')));
                } catch (err) { showToastRef.current(err.message, 'error'); setDados(null); }
                finally { setLoading(false); }
            })();
        }, [de, ate, regiao, tipo, buscaDeb]);

        const todos = (dados && dados.contemplados) || [];
        const linhas = situacao ? todos.filter(c => c.situacao === situacao) : todos;
        const porSit = {};
        todos.forEach(c => { porSit[c.situacao] = (porSit[c.situacao] || 0) + 1; });
        const valorSacado = linhas.reduce((s, c) => s + (Number(c.valor_sacado) || 0), 0);
        const motoboys = new Set(linhas.map(c => c.cod_prof)).size;

        const exportarCsv = () => {
            const cab = ['lancado_em', 'cod_prof', 'nome', 'praca', 'origem', 'periodo', 'quantidade', 'restantes', 'teto', 'validade', 'situacao', 'valor_sacado', 'saques'];
            const esc = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
            const rows = linhas.map(c => {
                const o = labelOrigem(c);
                const saques = (c.saques || []).map(s => s.em + ' R$' + s.valor + ' ' + s.status).join(' | ');
                return [c.lancado_em, c.cod_prof, c.nome_prof, c.regiao, o.titulo, o.sub, c.quantidade, c.restantes, c.valor, c.expira_em, (SITUACAO[c.situacao] || {}).label || c.situacao, String(c.valor_sacado).replace('.', ','), saques].map(esc).join(';');
            });
            const blob = new Blob(['﻿' + cab.join(';') + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'score-contemplados-' + (de || 'inicio') + '_' + (ate || 'hoje') + '.csv';
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        };

        const btnPer = (id, label) => h('button', {
            onClick: () => aplicarPeriodo(id),
            className: 'px-2.5 py-1.5 text-xs rounded-lg ' + (periodo === id ? 'bg-purple-600 text-white font-semibold' : 'text-gray-600 hover:bg-gray-100')
        }, label);
        const sel = (val, on, opts) => h('select', { value: val, onChange: e => on(e.target.value), className: 'px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white outline-none focus:border-purple-400' },
            opts.map(o => h('option', { key: o[0], value: o[0] }, o[1])));

        const listaAL = (aLiberar && aLiberar.a_liberar) || [];
        porSit.a_liberar = listaAL.length;
        const chipsSit = ['', 'a_liberar', 'disponivel', 'sacou', 'em_andamento', 'expirou', 'saque_falhou', 'removida', 'usada_sem_saque']
            .filter(k => k === '' || k === 'a_liberar' || porSit[k] > 0);
        const modoAL = situacao === 'a_liberar';

        return h('div', { className: 'space-y-3' },
            h('div', { className: 'bg-white rounded-xl border border-gray-200 p-3 space-y-2.5' },
                h('div', { className: 'flex flex-wrap items-center gap-2' },
                    h('div', { className: 'flex gap-0.5 bg-gray-50 rounded-lg p-0.5' },
                        btnPer('mes', 'Este mês'), btnPer('mes_ant', 'Mês passado'), btnPer('90d', '90 dias'), btnPer('tudo', 'Tudo'), btnPer('custom', 'Período')),
                    periodo === 'custom' && h('div', { className: 'flex items-center gap-1.5 text-xs text-gray-500' },
                        h('input', { type: 'date', value: de, onChange: e => setDe(e.target.value), className: 'px-2 py-1 border border-gray-200 rounded-lg text-xs' }),
                        'até',
                        h('input', { type: 'date', value: ate, onChange: e => setAte(e.target.value), className: 'px-2 py-1 border border-gray-200 rounded-lg text-xs' })),
                    h('div', { className: 'flex gap-2 flex-wrap ml-auto' },
                        sel(regiao, setRegiao, [['', 'Todas as praças']].concat(pracas.map(p => [p, p]))),
                        sel(tipo, setTipo, [['', 'Toda origem'], ['saque_mensal', 'Saque Prata (mês)'], ['saque_semanal', 'Saque Ouro (semana)'], ['sorteio', 'Sorteio'], ['legado_v1', 'Score v1 (legado)']]),
                        h('input', { value: busca, onChange: e => setBusca(e.target.value), placeholder: 'Nome ou código', className: 'w-40 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-purple-400' })
                    )
                ),
                h('div', { className: 'flex flex-wrap items-center gap-1.5' },
                    chipsSit.map(k => h('button', {
                        key: k || 'todos',
                        onClick: () => setSituacao(k),
                        className: 'px-2.5 py-1 rounded-full text-[11px] font-medium border transition ' + (situacao === k
                            ? (k === 'a_liberar' ? 'text-white' : 'bg-purple-600 text-white border-purple-600')
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'),
                        style: situacao === k && k === 'a_liberar' ? { background: '#92400e', borderColor: '#92400e' } : undefined
                    }, k ? (SITUACAO[k] || {}).label || k : 'Todos', h('span', { className: 'ml-1.5 opacity-75' }, k ? porSit[k] : todos.length))),
                    h('div', { className: 'ml-auto flex items-center gap-3 text-xs text-gray-500' },
                        modoAL
                            ? h('span', null, 'Previsto a liberar em 7 dias: ', h('b', { className: 'text-gray-900' }, 'até ' + fmtBRL(((aLiberar || {}).resumo || {}).valor_previsto_7d || 0)), ' em saques sem taxa')
                            : h('span', null, motoboys + ' motoboy(s) · sacado sem taxa ', h('b', { className: 'text-gray-900' }, fmtBRL(valorSacado))),
                        !modoAL && h('button', { onClick: exportarCsv, disabled: !linhas.length, className: 'px-2.5 py-1.5 text-xs font-medium text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-50 disabled:opacity-40 inline-flex items-center gap-1' }, ico('download', 14), 'CSV')
                    )
                )
            ),
            modoAL ? h(TabelaALiberar, { lista: listaAL, abrirDiagnostico }) :
            loading && !dados ? h('div', { className: 'text-center py-12 text-gray-500 text-sm' }, 'Carregando contemplados...') :
            linhas.length === 0
                ? h('div', { className: 'bg-white rounded-xl border border-gray-200 p-10 text-center' },
                    h('div', { className: 'text-gray-300 flex justify-center mb-2' }, ico('gift', 36)),
                    h('p', { className: 'text-sm font-medium text-gray-700' }, 'Ninguém contemplado com esses filtros'),
                    h('p', { className: 'text-xs text-gray-500 mt-1' }, 'Saques de categoria são lançados todo dia às 07:30 para quem é Prata/Ouro e já passou da carência.'))
                : h('div', { className: 'bg-white rounded-xl border border-gray-200 overflow-x-auto' + (loading ? ' opacity-60' : '') },
                    h('table', { className: 'w-full text-sm' },
                        h('thead', { className: 'bg-gray-50 border-b border-gray-200' },
                            h('tr', null, ['Lançado', 'Motoboy', 'Praça', 'Origem', 'Benefício', 'Validade', 'Situação', 'Saques com a gratuidade'].map((c, i) =>
                                h('th', { key: i, className: 'px-3 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap' }, c)))
                        ),
                        h('tbody', null, linhas.map(c => {
                            const o = labelOrigem(c);
                            return h('tr', { key: c.gratuidade_id, className: 'border-b border-gray-100 hover:bg-purple-50/40 align-top' },
                                h('td', { className: 'px-3 py-2 text-xs text-gray-500 whitespace-nowrap' }, c.lancado_em),
                                h('td', { className: 'px-3 py-2' },
                                    h('button', { onClick: () => abrirDiagnostico(c.cod_prof), className: 'text-left hover:text-purple-700' },
                                        h('div', { className: 'text-[13px] font-medium text-gray-900' }, c.nome_prof || ('#' + c.cod_prof)),
                                        h('div', { className: 'text-[11px] text-gray-500' }, 'cód ' + c.cod_prof))),
                                h('td', { className: 'px-3 py-2 text-xs text-gray-600' }, c.regiao || '—'),
                                h('td', { className: 'px-3 py-2' },
                                    h('div', { className: 'text-xs font-semibold text-gray-800 whitespace-nowrap' }, o.titulo),
                                    h('div', { className: 'text-[11px] text-gray-500 whitespace-nowrap' }, o.sub)),
                                h('td', { className: 'px-3 py-2 text-xs text-gray-700 whitespace-nowrap' },
                                    (c.quantidade || 1) + '× saque grátis',
                                    h('div', { className: 'text-[11px] text-gray-500' }, 'até ' + fmtBRL(c.valor) + (c.quantidade > 1 ? ' · resta ' + c.restantes : ''))),
                                h('td', { className: 'px-3 py-2 text-xs text-gray-500 whitespace-nowrap' }, c.expira_em || '—'),
                                h('td', { className: 'px-3 py-2' }, badgeSituacao(c.situacao)),
                                h('td', { className: 'px-3 py-2 text-[11px] text-gray-600' },
                                    (c.saques || []).length === 0 ? h('span', { className: 'text-gray-400' }, '—') :
                                        (c.saques || []).map(s => h('div', { key: s.id, className: 'whitespace-nowrap' },
                                            h('b', { className: 'text-gray-800' }, fmtBRL(s.valor)), ' · ',
                                            h('span', { className: ['rejeitado', 'cancelado', 'excluido', 'inativo'].includes(s.status) ? 'text-red-600' : '' }, STATUS_SAQUE[s.status] || s.status),
                                            ' · ' + s.em)))
                            );
                        }))
                    ),
                    dados && dados.resumo && dados.resumo.limitado && h('div', { className: 'px-3 py-2 text-[11px] text-amber-700 bg-amber-50' }, 'Mostrando os 2000 mais recentes — refine o período para ver todos.')
                )
        );
    }

    // ============================================================
    // SCORE_A_LIBERAR_V1: tabela de quem ja conquistou e esta na carencia
    // ============================================================
    function TabelaALiberar({ lista, abrirDiagnostico }) {
        const aviso = h('div', { className: 'flex gap-2.5 items-center rounded-xl border px-3.5 py-2.5 text-xs', style: { background: '#fffbeb', borderColor: '#fde68a', color: '#92400e' } },
            ico('clock', 16),
            h('span', null, 'Estes motoboys ', h('b', null, 'já conquistaram'), ' a categoria e estão nos 7 dias de carência. O saque grátis é lançado sozinho na data indicada (rotina diária das 07:30 ou avaliação de sábado, 12h — o que vier primeiro). Se caírem de categoria antes, a carência recomeça.'));
        if (!lista.length) return h('div', { className: 'space-y-3' }, aviso,
            h('div', { className: 'bg-white rounded-xl border border-gray-200 p-10 text-center text-sm text-gray-500' }, 'Ninguém em carência agora.'));
        const cab = ['Motoboy', 'Praça', 'Conquistou', 'Desde', 'Libera em', 'Carência', 'Vai receber'];
        return h('div', { className: 'space-y-3' }, aviso,
            h('div', { className: 'bg-white rounded-xl border border-gray-200 overflow-x-auto' },
                h('table', { className: 'w-full text-sm' },
                    h('thead', { className: 'bg-gray-50 border-b border-gray-200' },
                        h('tr', null, cab.map((c, i) => h('th', { key: i, className: 'px-3 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap' }, c)))),
                    h('tbody', null, lista.map(x => {
                        const pct = Math.round(100 * (x.dias_cumpridos || 0) / (x.carencia_dias || 7));
                        const faltam = x.dias_ate_liberar === 0 ? 'hoje' : x.dias_ate_liberar === 1 ? 'falta 1 dia' : 'faltam ' + x.dias_ate_liberar + ' dias';
                        return h('tr', { key: x.cod_prof, className: 'border-b border-gray-100 hover:bg-amber-50/40' },
                            h('td', { className: 'px-3 py-2' },
                                h('button', { onClick: () => abrirDiagnostico(x.cod_prof), className: 'text-left hover:text-purple-700' },
                                    h('div', { className: 'text-[13px] font-medium text-gray-900' }, x.nome_prof || ('#' + x.cod_prof)),
                                    h('div', { className: 'text-[11px] text-gray-500' }, 'cód ' + x.cod_prof))),
                            h('td', { className: 'px-3 py-2 text-xs text-gray-600' }, x.regiao),
                            h('td', { className: 'px-3 py-2' }, chipNivel(x.nivel)),
                            h('td', { className: 'px-3 py-2 text-xs text-gray-600 whitespace-nowrap' }, x.conquistou_em),
                            h('td', { className: 'px-3 py-2 whitespace-nowrap' },
                                h('div', { className: 'text-[13px] font-semibold text-gray-900' }, x.libera_em),
                                h('div', { className: 'text-[11px] font-medium', style: { color: '#92400e' } }, faltam)),
                            h('td', { className: 'px-3 py-2', style: { minWidth: 140 } },
                                h('div', { className: 'h-1.5 rounded-full overflow-hidden', style: { background: '#f3f4f6' } },
                                    h('div', { className: 'h-full rounded-full', style: { width: pct + '%', background: '#d97706' } })),
                                h('div', { className: 'text-[11px] text-gray-500 mt-1' }, (x.dias_cumpridos || 0) + ' de ' + (x.carencia_dias || 7) + ' dias cumpridos')),
                            h('td', { className: 'px-3 py-2 whitespace-nowrap' },
                                h('div', { className: 'text-xs font-semibold text-gray-900' }, x.quantidade + '× saque grátis / ' + (x.tipo === 'saque_semanal' ? 'semana' : 'mês')),
                                h('div', { className: 'text-[11px] text-gray-500' }, 'até ' + fmtBRL(x.teto) + ' · vale até ' + x.vale_ate))
                        );
                    }))
                )
            )
        );
    }

    // ============================================================
    // SCORE_ADMIN_REDESIGN_V1: DIAGNÓSTICO DO MOTOBOY (painel lateral)
    // ============================================================
    function DrawerDiagnostico({ cod, fetchApi, showToast, onClose }) {
        const { fetchApiRef, showToastRef } = useApiRefs(fetchApi, showToast);
        const [d, setD] = useState(null);
        const [loading, setLoading] = useState(true);
        const [reavaliando, setReavaliando] = useState(false);

        const carregar = useCallback(async () => {
            setLoading(true);
            try { setD(await fetchApiRef.current('/score-v2/admin/motoboy/' + encodeURIComponent(cod) + '/diagnostico')); }
            catch (err) { showToastRef.current(err.message, 'error'); setD(null); }
            finally { setLoading(false); }
        }, [cod]);
        useEffect(() => { carregar(); }, [carregar]);
        useEffect(() => {
            const esc = (e) => { if (e.key === 'Escape') onClose(); };
            window.addEventListener('keydown', esc);
            return () => window.removeEventListener('keydown', esc);
        }, [onClose]);

        const reavaliar = async () => {
            setReavaliando(true);
            try {
                const r = await fetchApiRef.current('/score-v2/admin/avaliar/' + encodeURIComponent(cod));
                if (r && r.erro) showToastRef.current('Não encontrado: ' + r.erro, 'error');
                else if (r && r.regiao_configurada === false) showToastRef.current(r.mensagem || 'Praça sem score', 'warning');
                else showToastRef.current('Reavaliado: ' + ((COR_NIVEL[r.nivel] || {}).nome || '-') + (r.bonus && r.bonus.lancado ? ' · saque lançado' : ''), 'success');
                carregar();
            } catch (err) { showToastRef.current(err.message, 'error'); }
            finally { setReavaliando(false); }
        };

        const corVer = { ok: 'bg-emerald-50 border-emerald-200 text-emerald-900', info: 'bg-blue-50 border-blue-200 text-blue-900', alerta: 'bg-amber-50 border-amber-200 text-amber-900', erro: 'bg-red-50 border-red-200 text-red-900' };
        const icoVer = { ok: 'check', info: 'info', alerta: 'alert', erro: 'x' };
        const secao = (titulo, conteudo) => h('div', { className: 'mt-5' },
            h('div', { className: 'text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2' }, titulo), conteudo);
        const cel = (rotulo, valor) => h('div', { className: 'flex justify-between gap-2 text-xs py-1 border-b border-gray-100 last:border-0' }, h('span', { className: 'text-gray-500' }, rotulo), h('span', { className: 'font-medium text-gray-900', style: { fontVariantNumeric: 'tabular-nums' } }, valor));
        const fmtPct = (v) => v == null ? '—' : String(Math.round(Number(v) * 10) / 10).replace('.', ',') + '%';

        return h('div', { className: 'fixed inset-0 z-50 flex justify-end bg-black/40', onClick: (e) => { if (e.target === e.currentTarget) onClose(); } },
            h('div', { className: 'bg-white w-full max-w-xl h-full overflow-y-auto shadow-2xl flex flex-col' },
                h('div', { className: 'px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3 sticky top-0 bg-white z-10' },
                    h('div', { className: 'min-w-0' },
                        h('div', { className: 'text-[11px] text-gray-500 uppercase tracking-wide' }, 'Diagnóstico do score'),
                        h('div', { className: 'text-base font-bold text-gray-900 truncate' }, (d && d.nome) || ('Código ' + cod)),
                        h('div', { className: 'text-xs text-gray-500' }, 'cód ' + cod + (d && d.regiao_crm ? ' · praça no CRM: ' + d.regiao_crm : ''))
                    ),
                    h('button', { onClick: onClose, 'aria-label': 'Fechar', className: 'w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg' }, ico('x', 18))
                ),
                h('div', { className: 'px-5 pb-6 flex-1' },
                    loading && !d ? h('div', { className: 'py-12 text-center text-sm text-gray-500' }, 'Analisando...') :
                    !d ? h('div', { className: 'py-12 text-center text-sm text-gray-400' }, 'Sem dados.') :
                    h(React.Fragment, null,
                        secao('Veredito', h('div', { className: 'space-y-1.5' }, (d.veredito || []).map((v, i) =>
                            h('div', { key: i, className: 'flex gap-2 items-start rounded-lg border px-3 py-2 text-xs leading-relaxed ' + (corVer[v.tipo] || corVer.info) },
                                h('span', { className: 'mt-0.5' }, ico(icoVer[v.tipo] || 'info', 14)), h('span', null, v.texto))))),
                        secao('Números (28 dias)', h('div', { className: 'grid grid-cols-2 gap-3' },
                            h('div', { className: 'rounded-xl border border-gray-200 p-3' },
                                h('div', { className: 'flex items-center justify-between mb-1.5' }, h('span', { className: 'text-xs font-semibold text-gray-700' }, 'Oficial (sábado)'), d.oficial ? chipNivel(d.oficial.nivel) : null),
                                d.oficial ? h('div', null,
                                    cel('Entregas', d.oficial.entregas), cel('Dias pós-corte', d.oficial.dias_pico), cel('% no prazo', fmtPct(d.oficial.pct_prazo)),
                                    cel('Na categoria desde', d.oficial.nivel_desde || '—'), cel('Avaliado em', d.oficial.avaliado_em || '—'))
                                    : h('div', { className: 'text-xs text-gray-400 py-3' }, 'Nunca avaliado')),
                            h('div', { className: 'rounded-xl border border-gray-200 p-3' },
                                h('div', { className: 'flex items-center justify-between mb-1.5' }, h('span', { className: 'text-xs font-semibold text-gray-700' }, 'Hoje (ao vivo)'), d.ao_vivo ? chipNivel(d.ao_vivo.nivel) : null),
                                d.ao_vivo ? h('div', null,
                                    cel('Entregas', d.ao_vivo.stats.entregas), cel('Dias pós-corte', d.ao_vivo.stats.dias_16h), cel('% no prazo', fmtPct(d.ao_vivo.stats.pct_prazo)))
                                    : h('div', { className: 'text-xs text-gray-400 py-3' }, '—'))
                        )),
                        d.ao_vivo && d.ao_vivo.progresso && secao('Falta para ' + ((COR_NIVEL[d.ao_vivo.progresso.proximo_nivel] || {}).nome || ''),
                            h('div', { className: 'space-y-2' }, d.ao_vivo.progresso.requisitos.map((r, i) => h('div', { key: i },
                                h('div', { className: 'flex justify-between text-xs mb-1' },
                                    h('span', { className: 'flex items-center gap-1.5 ' + (r.ok ? 'text-emerald-700' : 'text-gray-700') }, ico(r.ok ? 'check' : 'target', 13), r.label),
                                    h('span', { className: 'text-gray-500', style: { fontVariantNumeric: 'tabular-nums' } }, (r.sufixo ? fmtPct(r.atual) : r.atual) + ' / ' + (r.sufixo ? fmtPct(r.meta) : r.meta))),
                                h('div', { className: 'w-full bg-gray-100 rounded-full h-1.5' }, h('div', { className: 'h-full rounded-full', style: { width: Math.min(100, Number(r.pct) || 0) + '%', background: r.ok ? '#16a34a' : '#c084e6' } })))))),
                        secao('Saques grátis do score', (d.beneficios || []).length === 0
                            ? h('div', { className: 'text-xs text-gray-400' }, 'Nenhum benefício lançado ainda.')
                            : h('div', { className: 'space-y-1.5' }, d.beneficios.map(b => {
                                const o = labelOrigem(b);
                                return h('div', { key: b.gratuidade_id, className: 'rounded-lg border border-gray-200 px-3 py-2' },
                                    h('div', { className: 'flex items-center justify-between gap-2' },
                                        h('div', { className: 'text-xs font-semibold text-gray-800' }, o.titulo + ' · ' + o.sub),
                                        badgeSituacao(b.situacao)),
                                    h('div', { className: 'text-[11px] text-gray-500 mt-0.5' },
                                        (b.quantidade || 1) + '× até ' + fmtBRL(b.valor) + ' · lançado ' + b.lancado_em + (b.expira_em ? ' · vale até ' + b.expira_em : '')),
                                    (b.saques || []).map(s => h('div', { key: s.id, className: 'text-[11px] text-gray-600 mt-0.5' },
                                        '↳ saque ' + fmtBRL(s.valor) + ' · ' + (STATUS_SAQUE[s.status] || s.status) + ' · ' + s.em + (s.motivo_rejeicao ? ' (' + s.motivo_rejeicao + ')' : '')))
                                );
                            }))),
                        (d.gratuidades_ativas || []).length > 0 && secao('Saques grátis do score ativos agora', /* SCORE_DIAG_SO_SCORE_V1 */
                            h('div', { className: 'space-y-1' }, d.gratuidades_ativas.map(g => h('div', { key: g.id, className: 'text-xs text-gray-700 flex justify-between gap-2' },
                                h('span', { className: 'truncate' }, (g.reason || g.created_by || 'Gratuidade')), h('span', { className: 'text-gray-500 whitespace-nowrap' }, g.remaining + '/' + g.quantity + ' · até ' + (g.expira_em || '—')))))),
                        secao('Saques feitos com benefício do score', (d.saques_recentes || []).length === 0
                            ? h('div', { className: 'text-xs text-gray-400' }, 'Nenhum saque usou benefício do score.')
                            : h('div', { className: 'overflow-x-auto' }, h('table', { className: 'w-full text-xs' },
                                h('tbody', null, d.saques_recentes.map(s => h('tr', { key: s.id, className: 'border-b border-gray-100' },
                                    h('td', { className: 'py-1.5 text-gray-500 whitespace-nowrap' }, s.em),
                                    h('td', { className: 'py-1.5 font-medium text-gray-900 whitespace-nowrap' }, fmtBRL(s.valor)),
                                    h('td', { className: 'py-1.5 whitespace-nowrap' }, h('span', { className: 'text-emerald-700', title: s.origem || '' }, s.origem ? String(s.origem).replace(/^Score Nivel \d - /, '').replace(/^Sorteio Score N[ií]vel \d - /, 'Sorteio ') : ('#' + s.gratuity_id))),
                                    h('td', { className: 'py-1.5 text-gray-600 whitespace-nowrap text-right' }, STATUS_SAQUE[s.status] || s.status))))))),
                        d.oficial && (d.oficial.historico || []).length > 0 && secao('Mudanças de categoria',
                            h('div', { className: 'space-y-1' }, d.oficial.historico.map((m, i) => h('div', { key: i, className: 'text-xs text-gray-600 flex items-center gap-2' },
                                chipNivel(m.de), ico('arrowright', 12), chipNivel(m.para),
                                h('span', { className: 'text-gray-400' }, m.em ? new Date(m.em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''))))),
                        d.oficial && d.oficial.ultimo_bonus && d.oficial.ultimo_bonus.motivo && h('div', { className: 'mt-4 text-[11px] text-gray-400' },
                            'Última tentativa de lançar saque: ' + d.oficial.ultimo_bonus.motivo + ' · ' + (d.oficial.ultimo_bonus.em || ''))
                    )
                ),
                h('div', { className: 'px-5 py-3 border-t border-gray-100 flex gap-2 sticky bottom-0 bg-white' },
                    h('button', { onClick: onClose, className: 'flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50' }, 'Fechar'),
                    h('button', { onClick: reavaliar, disabled: reavaliando, className: 'flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 inline-flex items-center justify-center gap-1.5' },
                        ico('refresh', 15), reavaliando ? 'Reavaliando...' : 'Reavaliar agora')
                )
            )
        );
    }

    // ============================================================
    // 🆕 ABA APROVEITAMENTO SEMANAL
    // ============================================================
    function AbaAproveitamento({ fetchApi, showToast }) {
        const [configs, setConfigs] = useState([]);
        const [regiaoSel, setRegiaoSel] = useState('');
        const [motoboys, setMotoboys] = useState([]);
        const [sel, setSel] = useState(null); // motoboy selecionado
        const [corridas, setCorridas] = useState([]);
        const [loadingMb, setLoadingMb] = useState(false);
        const [loadingCorr, setLoadingCorr] = useState(false);
        const [de, setDe] = useState('');   // '' = janela padrao 7 dias
        const [ate, setAte] = useState(''); // '' = hoje
        const [ordem, setOrdem] = useState('no_prazo'); // no_prazo | fora | os

        const fetchApiRef = useRef(fetchApi);
        const showToastRef = useRef(showToast);
        useEffect(() => { fetchApiRef.current = fetchApi; }, [fetchApi]);
        useEffect(() => { showToastRef.current = showToast; }, [showToast]);

        // SCORE_APROV_PRACAS_V1: TODAS as praças ativas no seletor (antes só as com
        // a regra de alerta ligada). A regra só decide se gera alerta semanal;
        // as corridas por motoboy servem pra qualquer praça.
        useEffect(() => {
            (async () => {
                try {
                    const cfgs = await fetchApiRef.current('/score-v2/admin/configuracoes');
                    const ativas = (cfgs || []).filter(c => c.ativo !== false)
                        .sort((a, b) => (b.regra_aproveitamento_ativa === true) - (a.regra_aproveitamento_ativa === true) || String(a.regiao).localeCompare(String(b.regiao), 'pt-BR'));
                    setConfigs(ativas);
                    if (ativas.length > 0 && !regiaoSel) setRegiaoSel(ativas[0].regiao);
                } catch (err) { showToastRef.current('' + err.message, 'error'); }
            })();
        }, []);

        const qperiodo = useCallback(() => {
            const p = [];
            if (de) p.push('de=' + encodeURIComponent(de));
            if (ate) p.push('ate=' + encodeURIComponent(ate));
            return p;
        }, [de, ate]);

        // grid esquerdo: motoboys
        const carregarMotoboys = useCallback(async (regiao) => {
            if (!regiao) return;
            setLoadingMb(true);
            try {
                const p = ['regiao=' + encodeURIComponent(regiao)].concat(qperiodoRef.current());
                const r = await fetchApiRef.current('/score-v2/admin/corridas-motoboys?' + p.join('&'));
                setMotoboys((r && r.motoboys) || []);
            } catch (err) {
                showToastRef.current('' + err.message, 'error');
                setMotoboys([]);
            } finally { setLoadingMb(false); }
        }, []);

        // grid direito: corridas do motoboy
        const carregarCorridas = useCallback(async (codProf) => {
            if (!codProf) { setCorridas([]); return; }
            setLoadingCorr(true);
            try {
                const p = qperiodoRef.current();
                const q = p.length ? ('?' + p.join('&')) : '';
                const r = await fetchApiRef.current('/score-v2/admin/corridas-motoboy/' + codProf + q);
                setCorridas((r && r.corridas) || []);
            } catch (err) {
                showToastRef.current('' + err.message, 'error');
                setCorridas([]);
            } finally { setLoadingCorr(false); }
        }, []);

        // refs estaveis pra usar dentro dos callbacks sem recriar
        const qperiodoRef = useRef(qperiodo);
        useEffect(() => { qperiodoRef.current = qperiodo; }, [qperiodo]);

        // recarrega motoboys quando praca ou periodo muda
        useEffect(() => {
            if (regiaoSel) carregarMotoboys(regiaoSel);
            setSel(null); setCorridas([]);
        }, [regiaoSel, de, ate, carregarMotoboys]);

        // recarrega corridas quando muda o selecionado ou o periodo
        useEffect(() => {
            if (sel) carregarCorridas(sel.cod_prof);
        }, [sel, de, ate, carregarCorridas]);

        if (configs.length === 0) {
            return h('div', { className: 'max-w-2xl mx-auto p-6 text-center' },
                h('div', { className: 'bg-white rounded-xl border border-gray-200 p-8' },
                    h('p', { className: 'text-4xl mb-2' }, h("svg", { className: "ico", style: { width: 38, height: 38 }, "aria-hidden": "true" }, h("use", { href: "#i-trenddown" }))),
                    h('p', { className: 'text-sm font-medium text-gray-700' }, 'Nenhuma praça ativa no Score'),
                    h('p', { className: 'text-xs text-gray-500 mt-1' }, 'Ative uma praça na aba Configurações.')
                )
            );
        }

        // formata timestamp -> "dd/mm HH:MM"
        const fmt = (v) => {
            if (!v) return '—';
            try {
                const d = new Date(v);
                const dd = String(d.getDate()).padStart(2, '0');
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const hh = String(d.getHours()).padStart(2, '0');
                const mi = String(d.getMinutes()).padStart(2, '0');
                return dd + '/' + mm + ' ' + hh + ':' + mi;
            } catch (_) { return '—'; }
        };

        // formata duracao em minutos -> "1h 05" ou "47min"
        const fmtDur = (min) => {
            if (min == null) return '—';
            const m = Math.round(min);
            if (m < 60) return m + 'min';
            const h = Math.floor(m / 60);
            const r = m % 60;
            return h + 'h' + (r > 0 ? ' ' + String(r).padStart(2, '0') : '');
        };

        const corPct = (pct) => {
            if (pct == null) return 'text-gray-400';
            if (pct < 50) return 'text-red-600';
            if (pct < 80) return 'text-amber-600';
            return 'text-green-600';
        };

        // ordena as corridas conforme o toggle
        const rank = { no_prazo: 0, fora: 1, sem_dados: 2 };
        const corridasOrd = [].concat(corridas).sort((a, b) => {
            if (ordem === 'os') return (b.os || 0) - (a.os || 0);
            const ra = rank[a.status] != null ? rank[a.status] : 3;
            const rb = rank[b.status] != null ? rank[b.status] : 3;
            if (ordem === 'fora') {
                // fora primeiro: inverte no_prazo<->fora
                const fa = a.status === 'fora' ? 0 : (a.status === 'no_prazo' ? 1 : 2);
                const fb = b.status === 'fora' ? 0 : (b.status === 'no_prazo' ? 1 : 2);
                return fa - fb;
            }
            return ra - rb; // no_prazo primeiro (default)
        });

        const badgePrazo = (st) => {
            if (st === 'no_prazo') return h('span', { className: 'text-[10px] bg-green-50 text-green-700 rounded px-2 py-0.5 font-semibold' }, 'no prazo');
            if (st === 'fora') return h('span', { className: 'text-[10px] bg-red-50 text-red-700 rounded px-2 py-0.5 font-semibold' }, 'fora');
            return h('span', { className: 'text-[10px] bg-gray-100 text-gray-500 rounded px-2 py-0.5' }, 's/ dados');
        };

        const btnOrdem = (val, label) => h('button', {
            onClick: () => setOrdem(val),
            className: 'text-[11px] rounded px-2.5 py-1 ' + (ordem === val
                ? 'bg-purple-100 text-purple-700 font-semibold'
                : 'border border-gray-300 text-gray-600 hover:bg-gray-50')
        }, label);

        return h('div', { className: 'max-w-full mx-auto p-4' },
            // cabecalho: praca + periodo
            h('div', { className: 'flex items-center gap-2 mb-3 flex-wrap' },
                h('span', { className: 'text-base font-semibold text-gray-800' }, h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-chart" })), "Corridas por motoboy")),
                h('select', {
                    value: regiaoSel,
                    onChange: (e) => setRegiaoSel(e.target.value),
                    className: 'text-sm border border-gray-300 rounded-lg px-2 py-1'
                }, configs.map(c => h('option', { key: c.regiao, value: c.regiao }, c.regiao + (c.regra_aproveitamento_ativa ? '' : ' · sem alerta')))),
                h('div', { className: 'ml-auto flex items-center gap-2' },
                    h('span', { className: 'text-xs text-gray-500' }, 'De:'),
                    h('input', {
                        type: 'date', value: de, max: ate || undefined,
                        onChange: (e) => setDe(e.target.value),
                        className: 'text-xs border border-gray-300 rounded px-2 py-1'
                    }),
                    h('span', { className: 'text-xs text-gray-500' }, 'até:'),
                    h('input', {
                        type: 'date', value: ate,
                        onChange: (e) => setAte(e.target.value),
                        className: 'text-xs border border-gray-300 rounded px-2 py-1'
                    }),
                    (de || ate) && h('button', {
                        onClick: () => { setDe(''); setAte(''); },
                        className: 'text-xs text-purple-600 hover:underline'
                    }, '↺ 7 dias')
                )
            ),

            // dois grids
            h('div', { className: 'grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-3' },
                // GRID ESQUERDO: motoboys
                h('div', { className: 'bg-white border border-gray-200 rounded-xl overflow-hidden' },
                    h('div', { className: 'px-3 py-2 border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400' },
                        'Motoboys · ' + (regiaoSel || '') + (loadingMb ? ' (carregando...)' : ' · ' + motoboys.length)),
                    motoboys.length === 0 && !loadingMb
                        ? h('div', { className: 'p-6 text-center text-xs text-gray-400' }, 'Nenhuma corrida no período')
                        : motoboys.map(m => {
                            const ativo = sel && sel.cod_prof === m.cod_prof;
                            return h('div', {
                                key: m.cod_prof,
                                onClick: () => setSel(m),
                                className: 'px-3 py-2.5 border-b border-gray-100 cursor-pointer ' +
                                    (ativo ? 'bg-purple-50 border-l-4 border-l-purple-500' : 'hover:bg-gray-50')
                            },
                                h('div', { className: 'flex items-center gap-2' },
                                    h('div', { className: 'min-w-0 flex-1' },
                                        h('div', { className: 'text-[13px] font-medium text-gray-800 truncate' }, m.nome_prof || ('cód ' + m.cod_prof)),
                                        h('div', { className: 'text-[10px] text-gray-500' }, 'cód ' + m.cod_prof + ' · ' + m.total + ' corridas')
                                    ),
                                    h('span', { className: 'text-[13px] font-semibold ' + corPct(m.pct) },
                                        m.pct == null ? '—' : (m.pct + '%'))
                                )
                            );
                        })
                ),

                // GRID DIREITO: corridas
                h('div', { className: 'bg-white border border-gray-200 rounded-xl overflow-hidden' },
                    !sel
                        ? h('div', { className: 'p-10 text-center text-sm text-gray-400' }, 'Selecione um motoboy à esquerda para ver as corridas')
                        : h('div', null,
                            h('div', { className: 'px-3 py-2 border-b border-gray-100 flex items-center gap-2 flex-wrap' },
                                h('span', { className: 'text-[13px] font-medium text-gray-800' }, sel.nome_prof || ('cód ' + sel.cod_prof)),
                                h('span', { className: 'text-[11px] text-gray-500' },
                                    '· ' + sel.total + ' corridas · ' + sel.avaliaveis + ' aval. · ' + (sel.pct == null ? '—' : sel.pct + '%') + ' no prazo'),
                                h('span', { className: 'ml-auto flex items-center gap-1.5' },
                                    h('span', { className: 'text-[11px] text-gray-400' }, 'Ordenar:'),
                                    btnOrdem('no_prazo', 'no prazo ↑'),
                                    btnOrdem('fora', 'fora ↑'),
                                    btnOrdem('os', 'OS')
                                )
                            ),
                            loadingCorr
                                ? h('div', { className: 'p-8 text-center text-xs text-gray-400' }, 'Carregando corridas...')
                                : h('div', { className: 'overflow-x-auto' },
                                    h('table', { className: 'w-full text-[11px]' },
                                        h('thead', null,
                                            h('tr', { className: 'bg-gray-50 text-gray-400 text-left' },
                                                h('th', { className: 'px-3 py-1.5 font-medium' }, 'OS'),
                                                h('th', { className: 'px-3 py-1.5 font-medium' }, 'Criação'),
                                                h('th', { className: 'px-3 py-1.5 font-medium' }, 'Alocação'),
                                                h('th', { className: 'px-3 py-1.5 font-medium' }, 'Finalizado'),
                                                h('th', { className: 'px-3 py-1.5 font-medium text-center' }, 'KM'),
                                                h('th', { className: 'px-3 py-1.5 font-medium text-center' }, 'Duração'),
                                                h('th', { className: 'px-3 py-1.5 font-medium text-center' }, 'Prazo')
                                            )
                                        ),
                                        h('tbody', null,
                                            corridasOrd.map((c, i) => h('tr', {
                                                key: (c.os || i) + '_' + i,
                                                className: 'border-t border-gray-100'
                                            },
                                                h('td', { className: 'px-3 py-1.5 font-medium text-gray-800' }, c.os || '—'),
                                                h('td', { className: 'px-3 py-1.5 text-gray-500' }, fmt(c.criacao)),
                                                h('td', { className: 'px-3 py-1.5 text-gray-500' }, fmt(c.alocacao)),
                                                h('td', { className: 'px-3 py-1.5 text-gray-500' }, fmt(c.finalizado)),
                                                h('td', { className: 'px-3 py-1.5 text-center text-gray-500' }, c.distancia != null ? (c.distancia.toFixed(1) + ' km') : '—'),
                                                h('td', { className: 'px-3 py-1.5 text-center text-gray-600 font-medium' }, fmtDur(c.tempo_prof_min)),
                                                h('td', { className: 'px-3 py-1.5 text-center' }, badgePrazo(c.status))
                                            ))
                                        )
                                    )
                                )
                        )
                )
            )
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
                showToastRef.current('' + err.message, 'error');
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
                showToast('Configuração salva', 'success');
                setEditando(null);
                carregar();
            } catch (err) {
                showToast('' + err.message, 'error');
            }
        };

        const desativar = async (id, regiao) => {
            if (!confirm(`Desativar score para "${regiao}"?\n\nMotoboys da região vão deixar de ver/ganhar score. Histórico de sorteios é mantido.`)) return;
            try {
                await fetchApi('/score-v2/admin/configuracoes/' + id, { method: 'DELETE' });
                showToast('Desativada', 'success');
                carregar();
            } catch (err) {
                showToast('' + err.message, 'error');
            }
        };

        // 🚀 Reavalia em massa todos os motoboys da região (CRM + Planilha)
        const reavaliar = async (regiao) => {
            if (!confirm(`Re-avaliar TODOS os motoboys de "${regiao}"?\n\nIsso vai recalcular o nível de cada motoboy da região (CRM + Planilha) e popular as contagens. Pode demorar alguns segundos.`)) return;
            try {
                showToast('Re-avaliando... aguarde', 'info');
                const r = await fetchApi('/score-v2/admin/reavaliar-regiao', {
                    method: 'POST',
                    body: JSON.stringify({ regiao }),
                });
                showToast(`${r.processados} avaliados — Bronze:${r.niveis[1]} Prata:${r.niveis[2]} Ouro:${r.niveis[3]}`, 'success');
                carregar();
            } catch (err) {
                showToast('' + err.message, 'error');
            }
        };

        // 🆕 2026-07: recalcular TODAS as praças de uma vez (nível + aproveitamento).
        const recalcularTudo = async () => {
            if (!confirm('Recalcular TODAS as praças agora?\n\nRecalcula o nível de todos os motoboys de todas as praças ativas (CRM + Planilha) e roda a análise de aproveitamento. Pode demorar alguns minutos.')) return;
            try {
                showToast('Recalculando todas as praças... aguarde', 'info');
                const r = await fetchApi('/score-v2/admin/avaliar-agora', { method: 'POST', body: '{}' });
                const mud = (r.mudancas || []).length;
                showToast('' + (r.processados || 0) + ' motoboys · ' + (r.regioes || 0) + ' praças · ' + mud + ' mudanças de nível', 'success');
                carregar();
            } catch (err) {
                showToast('' + err.message, 'error');
            }
        };

        // Regiões que ainda não foram configuradas
        // ⚠️ Backend agora já filtra: só vêm regiões com ≥1 motoboy avaliado, ordenadas DESC.
        // Aqui mantemos filtro extra pra excluir regiões já configuradas (defensivo, backend já faz).
        const regioesNaoConfig = regioesDisp.filter(r =>
            !configs.some(c => c.regiao.toUpperCase() === r.regiao.toUpperCase())
        );

        if (loading) return h('div', { className: 'text-center py-12 text-gray-500' }, h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-clock" })), "Carregando..."));

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
                }, h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-refresh" })), "Recalcular todas as praças"))
            ),

            // 🚀 2026-05: Painel de regiões sem score — redesign com busca + chips cinzas com badge
            // Mostra 15 inicialmente, expande via "ver mais", filtra por busca em tempo real.
            regioesNaoConfig.length > 0 && h(PainelRegioesNaoConfig, {
                regioes: regioesNaoConfig,
                onSelecionar: (r) => setEditando({
                    regiao: r.regiao, ativo: true, niveis_ativos: [2, 3],
                    sorteio_valor_n2: 50, sorteio_valor_n3: 150,
                    saque_teto_n2: 500, saque_teto_n3: 500,
                    saque_qtd_n2: 1, saque_qtd_n3: 1,
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

        return h('div', { className: 'bg-white border border-gray-200 rounded-2xl mb-4 overflow-hidden', style: { borderLeft: '3px solid #770fa8' } },
            h('button', {
                onClick: () => setAberto(!aberto),
                className: 'w-full flex items-center justify-between gap-2 p-4 hover:bg-gray-50 transition-colors text-left'
            },
                h('div', { className: 'flex items-center gap-2' },
                    h('span', { className: 'text-base' }, h("svg", { className: "ico", style: { width: 18, height: 18 }, "aria-hidden": "true" }, h("use", { href: "#i-pin" }))),
                    h('span', { className: 'text-sm font-semibold text-gray-900' }, 'Configurar nova praça')
                ),
                h('div', { className: 'flex items-center gap-2' },
                    h('span', { className: 'text-[11px] font-medium bg-purple-50 text-purple-700 rounded-full', style: { padding: '4px 10px' } },
                        regioes.length + ' praças · ' + totalMotoboys.toLocaleString('pt-BR')),
                    h('span', { className: 'text-gray-400', style: { fontSize: '11px', transition: 'transform .2s', transform: aberto ? 'rotate(180deg)' : 'none', display: 'inline-block' } }, '')
                )
            ),
            aberto && h('div', { className: 'px-4 pb-4' },
                h('div', { className: 'relative mb-3' },
                    h('span', { className: 'absolute text-gray-400', style: { left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px' } }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-search" }))),
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
            style: { borderLeft: '3px solid ' + (ativo ? '#770fa8' : '#d1d5db') }
        },
            h('div', { className: 'flex items-start justify-between gap-3 mb-4 flex-wrap' },
                h('div', null,
                    h('div', { className: 'flex items-center gap-2' },
                        h('span', { className: 'text-base' }, h("svg", { className: "ico", style: { width: 18, height: 18 }, "aria-hidden": "true" }, h("use", { href: "#i-pin" }))),
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
                    }, h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-refresh" })), "Reavaliar")),
                    ativo
                        ? h('button', { onClick: onDesativar, className: 'px-3 py-1.5 text-gray-500 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50' }, h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-power" })), "Desativar"))
                        : h('button', { onClick: onAtivar, className: 'px-3 py-1.5 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium hover:bg-emerald-50' }, h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-play" })), "Reativar")),
                    h('button', { onClick: onEditar, className: 'px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700' }, h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-pencil" })), "Editar"))
                )
            ),
            h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-2.5' },
                miniCard({ bar: '#92400e', bg: '#fff', txt: '#92400e', num: '#111827' }, '', 'Bronze', counts[1], 'base da praça'),
                miniCard({ bar: '#6b7280', bg: '#fff', txt: '#374151', num: '#111827' }, '', 'Prata', counts[2], 'sorteio ' + fmtBRL(cfg.sorteio_valor_n2), 'saque ' + fmtBRL(cfg.saque_teto_n2) + '/mês'),
                miniCard({ bar: '#f67602', bg: '#fffbeb', txt: '#92400e', num: '#92400e' }, '', 'Ouro', counts[3], 'sorteio ' + fmtBRL(cfg.sorteio_valor_n3), 'saque ' + fmtBRL(cfg.saque_teto_n3) + '/sem'),
                miniCard({ bar: '#770fa8', bg: '#faf7fd', txt: '#770fa8', num: '#770fa8' }, '', 'Total', (counts[1] + counts[2] + counts[3]), 'avaliados')
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
            saque_qtd_n2: cfg.saque_qtd_n2 != null ? Number(cfg.saque_qtd_n2) : 1,
            saque_qtd_n3: cfg.saque_qtd_n3 != null ? Math.min(Number(cfg.saque_qtd_n3), 1) : 1, // SCORE_OURO_1SEMANA_V1
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
            // BONUS_EXTRAS_FORM_INIT_V1: faltava inicializar do cfg -> bonus sumiam ao reabrir e o save zerava.
            bonus_extras: (function () {
                var b = cfg.bonus_extras;
                if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } }
                return (b && typeof b === 'object')
                    ? { n2: Array.isArray(b.n2) ? b.n2 : [], n3: Array.isArray(b.n3) ? b.n3 : [] }
                    : { n2: [], n3: [] };
            })(),
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
            // BONUS_EXTRAS_FRONT_V1: lista de bonus extras desta categoria
            const _bx = form.bonus_extras || { n2: [], n3: [] };
            const extras = Array.isArray(_bx[pk]) ? _bx[pk] : [];
            const setExtras = (arr) => setForm({ ...form, bonus_extras: { ...(form.bonus_extras || { n2: [], n3: [] }), [pk]: arr } });
            const addExtra = () => setExtras([...extras, { tipo: 'valor', titulo: '', valor: null, descricao: '' }]);
            const updExtra = (i, campo, val) => setExtras(extras.map((x, idx) => idx === i ? { ...x, [campo]: val } : x));
            const delExtra = (i) => setExtras(extras.filter((_, idx) => idx !== i));
            const inp = (val, ph, oc, tipo) => h('input', { type: tipo || 'text', value: val == null ? '' : val, placeholder: ph, onChange: oc, className: 'w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200' });
            const badge = h('span', {
                className: 'text-[11px] font-bold px-2.5 py-0.5 rounded-full ' + (isOuro ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600')
            }, isOuro ? 'OURO' : 'PRATA');
            const tetoLabel = isOuro ? 'Teto saque / sem (R$)' : 'Teto saque / mês (R$)';
            const qtdLabel = isOuro ? 'Qtd saque / semana' : 'Qtd saque / mês'; // SAQUE_QTD_FRONT_V1
            return h('div', { className: 'border border-gray-200 rounded-xl p-3.5 space-y-3' },
                h('div', { className: 'flex items-center gap-2' },
                    badge,
                    h('span', { className: 'text-[11px] text-gray-400' }, 'bonificações desta categoria')
                ),
                h('div', { className: 'grid grid-cols-2 gap-2.5' },
                    h('div', null, h('label', { className: 'text-[11px] text-gray-500 font-medium' }, tetoLabel), numInput('saque_teto_' + pk, 0.01, 0)),
                    isOuro
                        ? h('div', null, h('label', { className: 'text-[11px] text-gray-500 font-medium' }, 'Saque grátis'), /* SCORE_OURO_1SEMANA_V1 */
                            h('div', { className: 'px-2.5 py-1.5 rounded-lg text-sm bg-gray-50 border border-gray-200 text-gray-700' }, '1 por semana · vale 3 dias'))
                        : h('div', null, h('label', { className: 'text-[11px] text-gray-500 font-medium' }, qtdLabel), numInput('saque_qtd_' + pk, 1, 0))
                ),
                // BONUS_EXTRAS_FRONT_V1: editor da lista de bonus extras
                h('div', { className: 'pt-3 border-t border-gray-100' },
                    h('div', { className: 'flex items-center justify-between mb-2' },
                        h('span', { className: 'text-[12px] font-bold text-gray-800' }, 'Bônus extras'),
                        h('span', { className: 'text-[10px] text-gray-400' }, 'aparecem pro motoboy se preenchidos')
                    ),
                    extras.length === 0 && h('p', { className: 'text-[11px] text-gray-400 mb-2' }, 'Nenhum bônus extra nesta categoria.'),
                    h('div', { className: 'space-y-2' },
                        extras.map((bx, i) => h('div', { key: i, className: 'border border-gray-150 rounded-lg p-2 bg-gray-50/60' },
                            h('div', { className: 'flex gap-2 items-start' },
                                h('select', {
                                    value: bx.tipo || 'valor',
                                    onChange: e => updExtra(i, 'tipo', e.target.value),
                                    className: 'px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white outline-none focus:border-purple-400', style: { minWidth: 96 }
                                },
                                    h('option', { value: 'sorteio' }, 'Sorteio mensal'),
                                    h('option', { value: 'valor' }, 'Valor (R$)'),
                                    h('option', { value: 'item' }, 'Item'),
                                    h('option', { value: 'texto' }, 'Texto livre')
                                ),
                                h('div', { className: 'flex-1' }, inp(bx.titulo, 'Título do bônus', e => updExtra(i, 'titulo', e.target.value))),
                                h('button', { type: 'button', onClick: () => delExtra(i), className: 'text-red-500 bg-red-50 rounded-lg w-8 h-8 flex-shrink-0 flex items-center justify-center hover:bg-red-100' },
                                    h('svg', { className: 'ico', style: { width: 15, height: 15 }, 'aria-hidden': 'true' }, h('use', { href: '#i-trash' })))
                            ),
                            (bx.tipo === 'valor' || bx.tipo === 'sorteio') && h('div', { className: 'mt-2', style: { maxWidth: 160 } },
                                inp(bx.valor, 'Valor (R$)', e => updExtra(i, 'valor', e.target.value === '' ? null : parseFloat(e.target.value)), 'number')),
                            h('div', { className: 'mt-2' }, inp(bx.descricao, 'Descrição (opcional)', e => updExtra(i, 'descricao', e.target.value)))
                        ))
                    ),
                    h('button', { type: 'button', onClick: addExtra, className: 'mt-2 w-full text-purple-600 border border-dashed border-purple-300 bg-purple-50/50 rounded-lg py-2 text-xs font-bold hover:bg-purple-100/60' },
                        '+ Adicionar bônus')
                )
            );
        };

        return h('div', { className: 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4' },
            h('div', { className: 'bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col' }, // SORTEIO_EXTRA_FRONT_V1
                // Header
                h('div', { className: 'px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0' },
                    h('div', { className: 'flex items-center gap-2.5' },
                        h('span', { className: 'text-xl' }, h("svg", { className: "ico", style: { width: 22, height: 22 }, "aria-hidden": "true" }, h("use", { href: "#i-settings" }))),
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
                            h('div', null, h('label', { className: 'text-[11px] text-gray-500 font-medium' }, h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-medal" })), "Prata — % no prazo")), numInput('pct_prata', 0.1, 0, 100)),
                            h('div', null, h('label', { className: 'text-[11px] text-gray-500 font-medium' }, h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-medal" })), "Prata — dias no pico")), numInput('dias_pico_prata', 1, 0))
                        ),
                        h('div', { className: 'grid grid-cols-2 gap-2.5' },
                            h('div', null, h('label', { className: 'text-[11px] text-gray-500 font-medium' }, h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-medal" })), "Ouro — % no prazo")), numInput('pct_ouro', 0.1, 0, 100)),
                            h('div', null, h('label', { className: 'text-[11px] text-gray-500 font-medium' }, h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-medal" })), "Ouro — dias no pico")), numInput('dias_pico_ouro', 1, 0))
                        ),
                        h('div', { className: 'text-[11px] text-gray-500 bg-gray-50 rounded-lg p-2 leading-relaxed' },
                            'O nível é o ', h('b', null, 'menor'), ' entre o que a qualidade dá e o que a presença permite. Sem os dias no pico, trava embaixo — por melhor que seja o % no prazo.'
                        )
                    ),
                    h('div', { className: 'grid md:grid-cols-2 gap-3' },
                        form.niveis_ativos.includes(2) && cardCategoria(2),
                        form.niveis_ativos.includes(3) && cardCategoria(3)
                    ),
                    // Aproveitamento semanal
                    h('div', { className: 'border border-gray-200 rounded-xl p-3.5' },
                        h('label', { className: 'flex items-start justify-between gap-3 cursor-pointer' },
                            h('div', { className: 'flex gap-2.5' },
                                h('span', { className: 'text-base leading-none mt-0.5' }, h("svg", { className: "ico", style: { width: 18, height: 18 }, "aria-hidden": "true" }, h("use", { href: "#i-trenddown" }))),
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
                        h('span', { className: 'font-semibold' }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-bulb" }))),
                        'Ao salvar, todos os motoboys da praça são recalculados em background com os novos critérios. Pra conferir a contagem por categoria, use a aba "Categorias".'
                    )
                ),
                // Footer
                h('div', { className: 'px-5 py-3.5 border-t border-gray-100 flex gap-2.5 flex-shrink-0' },
                    h('button', { onClick: onCancelar, className: 'flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-medium text-[13px] hover:bg-gray-50' }, 'Cancelar'),
                    h('button', { onClick: () => onSalvar(form), className: 'flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl font-semibold text-[13px] hover:bg-purple-700 flex items-center justify-center gap-1.5' }, h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-save" })), "Salvar e recalcular praça"))
                )
            )
        );
    }

    // ============================================================
    // ABA MOTOBOYS POR NÍVEL
    // 🚀 2026-05: Redesign — cards por região com pódio compacto + drilldown modal
    // ============================================================
    function AbaMotoboys({ fetchApi, showToast, abrirDiagnostico, buscaInicial }) {
        const [filtroNivel, setFiltroNivel] = useState('');
        const [busca, setBusca] = useState(buscaInicial || '');
        useEffect(() => { setBusca(buscaInicial || ''); }, [buscaInicial]);
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
            } catch (err) { showToastRef.current('' + err.message, 'error'); }
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
                    placeholder: 'Buscar por motoboy, código ou região...',
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

            loading ? h('div', { className: 'text-center py-12 text-gray-500' }, h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-clock" })), "Carregando...")) :
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
                            h('span', { className: 'text-sm font-semibold text-gray-800' }, '' + g.regiao),
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
                                        (idx === 0 ? h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-medal" })) : idx === 1 ? h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-medal" })) : h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-medal" }))),
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
                abrirDiagnostico,
            })
        );
    }

    // ============================================================
    // MODAL DE MOTOBOYS DA REGIÃO
    // ============================================================
    // 🆕 2026-05 v3: componente isolado com chips de filtro Todos | Ouro |
    // Prata | Bronze + renumeração ao filtrar + troféu nas 3 primeiras
    // posições quando ordenação é por classificação (sempre, neste modal).
    function ModalMotoboysRegiao({ regiaoModal, onClose, abrirDiagnostico }) {
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
                        h('h2', { className: 'text-lg font-bold' }, '' + regiaoModal.regiao),
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
                                    onClick: abrirDiagnostico ? () => abrirDiagnostico(m.cod_prof) : undefined,
                                    title: 'Abrir diagnóstico',
                                    className: 'border-b border-gray-100 hover:bg-purple-50/40 cursor-pointer ' + bgClasse
                                },
                                    h('td', { className: 'px-3 py-2 text-gray-600 text-center w-12' },
                                        idx === 0 ? h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-medal" })) : idx === 1 ? h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-medal" })) : idx === 2 ? h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-medal" })) :
                                            h('span', { className: 'text-xs font-medium text-gray-500' }, idx + 1)
                                    ),
                                    h('td', { className: 'px-3 py-2' },
                                        h('div', { className: 'font-medium text-gray-900' }, m.nome_prof || ('#' + m.cod_prof)),
                                        h('div', { className: 'text-[11px] text-gray-400' }, 'cód ' + m.cod_prof)),
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
            if (!/^\d{4}-\d{2}$/.test(m)) { showToastRef.current('Mês no formato YYYY-MM', 'warning'); return; }
            setLoading(true); setErro('');
            try {
                const data = await fetchApiRef.current('/score-v2/admin/ranking/' + m);
                const lista = (data && data.ranking) || [];
                setRanking(lista);
                setMesBusca(m);
                if (lista.length === 0) {
                    setErro('Nenhuma colocação congelada para ' + m + '. O congelamento começou em junho/2026 — meses anteriores não têm registro.');
                }
            } catch (err) { showToastRef.current('' + err.message, 'error'); setRanking([]); }
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
        const medalha = (pos) => pos === 1 ? h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-medal" })) : pos === 2 ? h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-medal" })) : pos === 3 ? h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-medal" })) : ('' + pos);

        return h('div', null,
            h('div', { className: 'bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3' },
                h('p', { className: 'text-xs text-purple-900 mb-2 font-medium' }, h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-calendar" })), "Classificação congelada no fechamento do mês. Disponível a partir de junho/2026.")),
                h('div', { className: 'flex gap-2 items-end flex-wrap' },
                    h('div', null,
                        h('label', { className: 'text-xs text-purple-700 block' }, 'Mês (período)'),
                        h('input', { type: 'month', value: mes, onChange: e => setMes(e.target.value), className: 'px-3 py-1.5 border rounded text-sm mt-1' })
                    ),
                    h('button', { onClick: () => carregar(mes), className: 'px-3 py-1.5 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700' }, h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-search" })), "Buscar")),
                    regioes.length > 0 && h('div', null,
                        h('label', { className: 'text-xs text-purple-700 block' }, 'Região'),
                        h('select', { value: regiaoFiltro, onChange: e => setRegiaoFiltro(e.target.value), className: 'px-3 py-1.5 border rounded text-sm mt-1' },
                            h('option', { value: '' }, 'Todas'),
                            regioes.map(rg => h('option', { key: rg, value: rg }, rg))
                        )
                    )
                )
            ),
            loading ? h('div', { className: 'text-center py-12 text-gray-500' }, h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-clock" })), "Carregando...")) :
            erro ? h('div', { className: 'text-center py-12 text-gray-400 text-sm px-4' }, erro) :
            Object.keys(porRegiao).length === 0 ? h('div', { className: 'text-center py-12 text-gray-400 text-sm' }, 'Sem dados.') :
            h('div', null, Object.entries(porRegiao).map(([regiao, lista]) =>
                h('div', { key: regiao, className: 'bg-white rounded-lg border border-gray-200 overflow-x-auto mb-4' },
                    h('div', { className: 'px-3 py-2 bg-gray-50 border-b font-bold text-sm text-gray-700' }, '' + regiao + ' — ' + mesBusca + ' (' + lista.length + ' motoboys)'),
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

    function AbaSorteios({ fetchApi, showToast, abrirDiagnostico }) {
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
            } catch (err) { showToastRef.current('' + err.message, 'error'); }
            finally { setLoading(false); }
        }, []);

        useEffect(() => { carregar(); }, [carregar]);

        const sortearAgora = async () => {
            if (!mesManual.match(/^\d{4}-\d{2}$/)) {
                showToastRef.current('Informe mês no formato YYYY-MM', 'warning'); return;
            }
            if (!confirm(`Disparar sorteio manual para ${mesManual}?\n\nVai sortear 1 vencedor por (região × nível) ativo. Operação idempotente — não duplica se já foi sorteado.`)) return;
            try {
                const r = await fetchApiRef.current('/score-v2/admin/sortear-agora', { method: 'POST', body: JSON.stringify({ mes_referencia: mesManual }) });
                showToastRef.current(`${r.sorteios.length} sorteios realizados`, 'success');
                carregar();
            } catch (err) { showToastRef.current('' + err.message, 'error'); }
        };

        const togglePart = async (id) => {
            if (expandido === id) { setExpandido(null); return; }
            setExpandido(id); setParticipantes([]); setLoadingPart(true);
            try {
                const data = await fetchApiRef.current('/score-v2/admin/sorteios/' + id + '/participantes');
                setParticipantes((data && data.participantes) || []);
            } catch (err) { showToastRef.current('' + err.message, 'error'); }
            finally { setLoadingPart(false); }
        };

        return h('div', null,
            h('div', { className: 'bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3' },
                h('p', { className: 'text-xs text-purple-900 mb-2 font-medium' }, h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-bot" })), "Sorteio automático: dia 1 de cada mês 00:05 (sorteia o mês anterior)")),
                h('div', { className: 'flex gap-2 items-end' },
                    h('div', null,
                        h('label', { className: 'text-xs text-purple-700' }, 'Disparo manual (mês)'),
                        h('input', { type: 'text', placeholder: 'YYYY-MM', value: mesManual, onChange: e => setMesManual(e.target.value), className: 'px-3 py-1.5 border rounded text-sm mt-1' })
                    ),
                    h('button', { onClick: sortearAgora, className: 'px-3 py-1.5 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700' }, h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-gift" })), "Sortear"))
                )
            ),
            loading ? h('div', { className: 'text-center py-12 text-gray-500' }, h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-clock" })), "Carregando...")) :
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
                            h('td', { className: 'px-3 py-2' },
                                h('button', {
                                    onClick: (e) => { e.stopPropagation(); if (abrirDiagnostico) abrirDiagnostico(s.vencedor_cod_prof); },
                                    className: 'font-bold text-purple-900 hover:underline text-left'
                                }, '' + (s.vencedor_nome || s.vencedor_cod_prof))),
                            h('td', { className: 'px-3 py-2 font-bold text-green-700' }, fmtBRL(s.valor)),
                            h('td', { className: 'px-3 py-2 text-gray-600' }, (expandido === s.id ? '' : '') + s.total_participantes),
                            h('td', { className: 'px-3 py-2 text-xs text-gray-500' }, fmtData(s.sorteado_em))
                        ),
                        expandido === s.id && h('tr', { className: 'bg-gray-50 border-b border-gray-100' },
                            h('td', { colSpan: 7, className: 'px-3 py-2' },
                                loadingPart ? h('span', { className: 'text-xs text-gray-500' }, h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-clock" })), "Carregando participantes...")) :
                                participantes.length === 0 ? h('span', { className: 'text-xs text-gray-400' }, 'Nenhum participante registrado (sorteios anteriores a junho/2026 não têm a lista).') :
                                h('div', null,
                                    h('p', { className: 'text-xs font-bold text-gray-600 mb-1' }, 'Participantes (' + participantes.length + '):'),
                                    // SCORE_ADMIN_REDESIGN_V1: antes concatenava o <svg> com a string -> "[object Object]Nome"
                                    h('div', { className: 'flex flex-wrap gap-1' }, participantes.map(p =>
                                        h('button', {
                                            key: p.cod_prof,
                                            onClick: (e) => { e.stopPropagation(); if (abrirDiagnostico) abrirDiagnostico(p.cod_prof); },
                                            className: 'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs hover:ring-1 hover:ring-purple-300 ' + (p.foi_vencedor ? 'bg-green-100 text-green-800 font-bold' : 'bg-gray-100 text-gray-700')
                                        }, p.foi_vencedor ? ico('trophy', 13) : null, p.nome_prof || p.cod_prof)
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
