/* UI_UNIFICADO_V1: emojis -> sprite de icones; cores na paleta unica (CORES_TOKENS_V1). */
/* DEEMOJI_V1 */
/**
 * saude-sistema.js — Tutts Frontend
 * ─────────────────────────────────────────────────────────────────────────
 * Tela de monitoramento dos agentes RPA do tutts-agents.
 *
 * Funcionalidades:
 *  - Lê /api/health/agents a cada 10s (auto-refresh)
 *  - Mostra status geral, memória, uptime, browser-pool
 *  - Lista 11 agentes com bolinha de status (verde/amarelo/vermelho/cinza)
 *  - Tooltip ao passar mouse explica o que cada agente faz
 *  - Botão "Reiniciar Worker" (master only) com dupla confirmação
 *
 * Exposto como: window.SaudeSistemaView
 * Usado em: modulo-config.js (aba "saude-sistema")
 */

(function() {
    'use strict';

    // ── Descrições dos agentes (mostradas no tooltip) ────────────────────
    const DESCRICOES_AGENTES = {
        'sla-capture': 'Captura pontos de cada OS no sistema externo pra alimentar rastreio WhatsApp e BI',
        'agent-correcao': 'Corrige automaticamente endereços inválidos nas entregas (via RPA)',
        'sla-detector': 'Detecta novas OS em execução a cada 2 minutos e enfileira pra captura de pontos',
        'performance': 'Coleta dados de SLA dos clientes pra alimentar a tela de BI / Performance',
        'performance-cron-1010': 'Dispara coleta automática de performance às 10:10 (dias úteis)',
        'performance-cron-1400': 'Dispara coleta automática de performance às 14:00 (dias úteis)',
        'performance-cron-1710': 'Dispara coleta automática de performance às 17:10 (dias úteis)',
        'crm-leads': 'Captura leads novos cadastrados no sistema externo pra o CRM',
        'liberar-ponto': 'Libera pontos de OS no sistema externo (via fila do "Liberar Ponto")',
        'bi-import': 'Importa dados do BI diário (cron 12h) e processa uploads manuais',
        'fila-validador': 'Verifica filas auto-gerenciáveis: remove motoboys que pegaram corrida',
    };

    // ── Helpers ──────────────────────────────────────────────────────────
    function formatarTempoAtras(isoString) {
        if (!isoString) return '—';
        const agora = Date.now();
        const t = new Date(isoString).getTime();
        const diff = Math.max(0, agora - t);
        const seg = Math.floor(diff / 1000);
        if (seg < 60) return `há ${seg}s`;
        const min = Math.floor(seg / 60);
        if (min < 60) return `há ${min}min`;
        const h = Math.floor(min / 60);
        if (h < 24) return `há ${h}h`;
        const d = Math.floor(h / 24);
        return `há ${d}d`;
    }

    function formatarUptime(seg) {
        if (!seg) return '—';
        const h = Math.floor(seg / 3600);
        const m = Math.floor((seg % 3600) / 60);
        if (h >= 24) {
            const d = Math.floor(h / 24);
            return `${d}d ${h % 24}h`;
        }
        return `${h}h ${m}m`;
    }

    // Classifica saúde do agente baseado em ticks, erros, última execução
    function classificarAgente(agente) {
        const isCron = agente.nome.startsWith('performance-cron-');

        // Crons: cinza se não executou ainda hoje (esperando horário)
        if (isCron) {
            if (!agente.ultimaExecucao) return 'cron-aguardando';
            // Se executou hoje, fica verde
            const hoje = new Date().toDateString();
            const ultExec = new Date(agente.ultimaExecucao).toDateString();
            return hoje === ultExec ? 'ok' : 'cron-aguardando';
        }

        // Inativo
        if (!agente.ativo) return 'inativo';

        // Tem erros recentes
        if (agente.taxaErroPct > 50 && agente.ticksErr >= 5) return 'erro';

        // Sem execução faz muito tempo (>15min pra agentes ativos)
        if (agente.ultimaExecucao) {
            const minAtras = (Date.now() - new Date(agente.ultimaExecucao).getTime()) / 60000;
            if (minAtras > 15) return 'parado';
        } else if (agente.slotsAtivos > 0) {
            // Tem slot ativo mas nunca executou — provavelmente recém-iniciado, considera ok
            return 'ok';
        }

        return 'ok';
    }

    function corDoStatus(status) {
        const mapa = {
            'ok': '#16a34a',           // verde
            'parado': '#d97706',       // amarelo
            'erro': '#dc2626',         // vermelho
            'inativo': '#9ca3af',      // cinza claro
            'cron-aguardando': '#9ca3af', // cinza
        };
        return mapa[status] || '#9ca3af';
    }

    function textoDoStatus(agente, status) {
        if (status === 'cron-aguardando') {
            // Extrai horário do nome (performance-cron-1010 → 10:10)
            const m = agente.nome.match(/(\d{2})(\d{2})$/);
            if (m) return `Aguardando ${m[1]}:${m[2]}`;
            return 'Aguardando horário';
        }
        if (status === 'inativo') return 'Inativo';
        if (status === 'erro') {
            return `${agente.ticksErr} erros (${agente.taxaErroPct}%) · última ${formatarTempoAtras(agente.ultimaExecucao)}`;
        }
        if (status === 'parado') {
            return `Sem execução ${formatarTempoAtras(agente.ultimaExecucao)}`;
        }
        // ok
        if (agente.ultimaExecucao) {
            return `Última: ${formatarTempoAtras(agente.ultimaExecucao)} · ${agente.ticksOk} OK / ${agente.ticksErr} erros`;
        }
        return 'Aguardando primeira execução';
    }

    // ── Componente Card de Agente ────────────────────────────────────────
    function AgenteCard({ agente }) {
        const status = classificarAgente(agente);
        const isCron = agente.nome.startsWith('performance-cron-');
        const descricao = DESCRICOES_AGENTES[agente.nome] || 'Agente do sistema';

        return React.createElement('div', {
            title: descricao, // tooltip nativo do navegador
            className: 'bg-white rounded-lg p-3 flex items-center gap-3 transition-shadow hover:shadow-md cursor-help',
            style: { border: '1px solid #e5e7eb' }
        },
            // Bolinha de status
            React.createElement('span', {
                style: {
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: corDoStatus(status),
                    flexShrink: 0,
                }
            }),
            // Nome + texto
            React.createElement('div', { className: 'flex-1 min-w-0' },
                React.createElement('p', { className: 'text-sm font-medium text-gray-900 truncate m-0' },
                    agente.nome
                ),
                React.createElement('p', { 
                    className: 'text-xs text-gray-500 truncate m-0', 
                    style: { marginTop: '2px' } 
                }, textoDoStatus(agente, status))
            ),
            // Badge de slots
            React.createElement('span', {
                className: 'text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded',
                style: { fontSize: '11px', flexShrink: 0 }
            }, isCron ? 'cron' : `${agente.slotsAtivos}/${agente.slots}`)
        );
    }

    // ── Componente Métrica ────────────────────────────────────────────────
    function MetricaCard({ label, valor, sublabel, statusColor }) {
        return React.createElement('div', {
            className: 'bg-gray-50 rounded-lg p-4'
        },
            React.createElement('p', { 
                className: 'text-xs text-gray-500 m-0' 
            }, label),
            React.createElement('p', { 
                className: 'text-lg font-medium m-0', 
                style: { marginTop: '4px', color: statusColor || '#111827' } 
            },
                statusColor && React.createElement('span', {
                    style: {
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: statusColor,
                        marginRight: '6px',
                        verticalAlign: '2px',
                    }
                }),
                valor,
                sublabel && React.createElement('span', { 
                    className: 'text-xs text-gray-500 ml-1',
                    style: { fontSize: '13px', fontWeight: 'normal' }
                }, ' ' + sublabel)
            )
        );
    }

    // ── Modal de Confirmação de Restart ──────────────────────────────────
    function ModalRestart({ onConfirmar, onCancelar, processando }) {
        const [texto, setTexto] = React.useState('');
        const podeConfirmar = texto.trim().toUpperCase() === 'REINICIAR';

        return React.createElement('div', {
            className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4',
            style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }
        },
            React.createElement('div', { 
                className: 'bg-white rounded-lg shadow-xl max-w-md w-full p-6' 
            },
                React.createElement('h3', { 
                    className: 'text-lg font-semibold mb-2' 
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#d97706" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-alert" })), "Reiniciar Worker")),
                React.createElement('p', { 
                    className: 'text-sm text-gray-600 mb-4' 
                }, 'Isso vai pausar TODOS os agentes RPA por 10-30 segundos enquanto o container reinicia. Durante esse período:'),
                React.createElement('ul', { 
                    className: 'text-sm text-gray-600 mb-4 list-disc pl-5' 
                },
                    React.createElement('li', null, 'Filas auto não validam motoboys'),
                    React.createElement('li', null, 'BI Performance não coleta'),
                    React.createElement('li', null, 'Liberar Ponto fica parado'),
                    React.createElement('li', null, 'Captura de SLA pausa')
                ),
                React.createElement('p', { 
                    className: 'text-sm font-medium mb-2' 
                }, 'Digite REINICIAR pra confirmar:'),
                React.createElement('input', {
                    type: 'text',
                    value: texto,
                    onChange: e => setTexto(e.target.value),
                    placeholder: 'REINICIAR',
                    className: 'w-full px-3 py-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-red-500',
                    disabled: processando,
                    autoFocus: true,
                }),
                React.createElement('div', { className: 'flex gap-2 justify-end' },
                    React.createElement('button', {
                        onClick: onCancelar,
                        className: 'px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md',
                        disabled: processando,
                    }, 'Cancelar'),
                    React.createElement('button', {
                        onClick: onConfirmar,
                        disabled: !podeConfirmar || processando,
                        className: 'px-4 py-2 text-sm text-white rounded-md',
                        style: {
                            background: (podeConfirmar && !processando) ? '#dc2626' : '#fecaca',
                            cursor: (podeConfirmar && !processando) ? 'pointer' : 'not-allowed',
                        }
                    }, processando ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clock" })), "Reiniciando...") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-refresh" })), "Confirmar restart"))
                )
            )
        );
    }

    // ── Componente Principal ─────────────────────────────────────────────
    // ═══════════════ GEOCODE_USO_TELA_V1: Custo de APIs (Google Geocoding) ═══════════════
    const ORIGENS_GEO = [
        [/^cf-|^similar$/, 'ConfirmaFácil'],
        [/^hub-/, 'Hub (Uber/99)'],
        [/^geocode-google:filas/, 'Filas'],
        // GEOCODE_AUTOCOMPLETE_V1: origem separada por tela
        [/^geocode-google:solicitacao-digitando/, 'Solicitação · enquanto digita'],
        [/^geocode-google:solicitacao-selecao/, 'Solicitação · ao escolher endereço'],
        [/^geocode-google:solicitacao-buscar/, 'Solicitação · botão buscar'],
        [/^geocode-google:solicitacao-mapa/, 'Solicitação · pino no mapa'],
        [/^geocode-google:solicitacao-numero/, 'Solicitação · busca com número'],
        [/^geocode-google:roteirizador/, 'Roteirizador (tela de rotas)'],
        [/^geocode-google:coleta/, 'Consultar endereços'],
        [/^autocomplete/, 'Autocomplete Geoapify (grátis)'],
        [/^geocode-google|^geocode-reverse/, 'Telas sem origem (versão antiga em cache no navegador)'],
        [/^roteirizador-tutts/, 'Roteirizador Tutts'],
        [/^agent-|^playwright-agent/, 'Agente RPA'],
        [/^coleta-/, 'Consultar endereços'],
    ];
    const nomeOrigem = (o) => { for (const [re, n] of ORIGENS_GEO) if (re.test(o || '')) return n; return o || '—'; };
    const TIPOS_GEO = {
        'fwd-novo': ['Endereço novo (1ª vez)', 'pago'], 'forward': ['Endereço (antes do detalhamento)', 'pago'],
        'fwd-texto': ['Mesmo lugar, texto diferente', 'pago'], 'fwd-refresh': ['Atualização de cache antigo', 'pago'],
        'reverse': ['Coordenada → endereço', 'pago'], 'cep': ['CEP por coordenada (Hub)', 'pago'],
        'hit-fwd': ['Cache por texto', 'cache'], 'hit-sim': ['Cache por rua + número', 'cache'], 'hit-cep': ['Cache de CEP', 'cache'],
        'hit-rev': ['Cache de coordenada', 'cache'], 'hit-neg': ['Já sabia que não existe', 'cache'],
        'ext-auto': ['Autocomplete Geoapify (franquia grátis)', 'cache'], 'hit-auto': ['Autocomplete do cache', 'cache'], // GEOCODE_AUTOCOMPLETE_V1
    };
    const brl = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const num = (v) => (Number(v) || 0).toLocaleString('pt-BR');

    function GeocodeUsoCard({ apiUrl, fetchAuth }) {
        const h = React.createElement;
        const [dias, setDias] = React.useState(30);
        const [d, setD] = React.useState(null);
        const [erro, setErro] = React.useState(null);
        const carregar = React.useCallback(async () => {
            try {
                const r = await fetchAuth(apiUrl + '/system/geocode-uso?dias=' + dias);
                const j = await r.json();
                if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
                setD(j); setErro(null);
            } catch (e) { setErro(e.message); }
        }, [apiUrl, fetchAuth, dias]);
        React.useEffect(() => { carregar(); }, [carregar]);

        const kpi = (rot, val, sub, tom) => h('div', { className: 'rounded-xl border p-3 ' + (tom === 'verde' ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white') },
            h('div', { className: 'text-xs ' + (tom === 'verde' ? 'text-green-800' : 'text-gray-500') }, rot),
            h('div', { className: 'text-xl font-semibold ' + (tom === 'verde' ? 'text-green-800' : 'text-gray-900'), style: { fontVariantNumeric: 'tabular-nums' } }, val),
            h('div', { className: 'text-xs ' + (tom === 'verde' ? 'text-green-800' : 'text-gray-500') }, sub));

        let corpo;
        if (erro && !d) corpo = h('p', { className: 'text-sm text-red-700' }, 'Não deu para carregar: ' + erro);
        else if (!d) corpo = h('p', { className: 'text-sm text-gray-500' }, 'Carregando…');
        else if (!d.desde) corpo = h('p', { className: 'text-sm text-gray-600' }, 'Ainda não há chamadas registradas. O contador começa a partir do deploy do pacote de economia do geocode.');
        else {
            const t = d.totais;
            const maxDia = Math.max(1, ...d.por_dia.map((x) => x.pagas));
            const totPagas = d.por_origem.reduce((a, x) => a + x.pagas, 0) || 1;
            const th = 'text-left text-xs font-semibold text-gray-500 py-2 px-2';
            const td = 'text-sm py-2 px-2 border-t border-gray-100';
            corpo = h('div', { className: 'flex flex-col gap-4' },
                h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3' },
                    kpi('Hoje', brl(t.hoje.custo), num(t.hoje.chamadas) + ' chamadas pagas'),
                    kpi('Últimos 7 dias', brl(t.semana.custo), num(t.semana.chamadas) + ' chamadas pagas'),
                    kpi('Este mês', brl(t.mes.custo), num(t.mes.chamadas) + ' chamadas pagas'),
                    kpi('Economizado pelo cache (mês)', brl(t.economia_mes.custo), num(t.economia_mes.acertos) + ' consultas sem pagar', 'verde')),
                h('div', null,
                    h('div', { className: 'text-xs font-semibold text-gray-600 mb-2' }, 'Chamadas pagas por dia'),
                    h('div', { className: 'flex items-end gap-1 overflow-x-auto', style: { height: 120, paddingBottom: 2 } },
                        d.por_dia.map((x) => h('div', { key: x.dia, className: 'flex flex-col items-center', style: { minWidth: 18, flex: '1 0 18px' },
                            title: x.dia.split('-').reverse().join('/') + ': ' + num(x.pagas) + ' pagas (' + brl(x.custo) + ') · ' + num(x.cache) + ' do cache' },
                            h('div', { style: { width: '100%', maxWidth: 22, height: Math.max(2, Math.round((x.pagas / maxDia) * 100)), background: '#770fa8', borderRadius: '4px 4px 0 0' } }),
                            h('span', { className: 'text-gray-400', style: { fontSize: 9, marginTop: 2 } }, x.dia.slice(8)))))),
                h('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-4' },
                    h('div', { className: 'rounded-xl border border-gray-200 overflow-x-auto' },
                        h('table', { className: 'w-full', style: { borderCollapse: 'collapse', minWidth: 420 } },
                            h('thead', null, h('tr', null, h('th', { className: th }, 'Quem gasta'), h('th', { className: th + ' text-right' }, 'Pagas'), h('th', { className: th + ' text-right' }, 'Custo'), h('th', { className: th + ' text-right' }, 'Do cache'))),
                            h('tbody', null, d.por_origem.filter((x) => x.pagas || x.cache).map((x) => h('tr', { key: x.origem },
                                h('td', { className: td }, h('div', { className: 'font-medium text-gray-900' }, nomeOrigem(x.origem)), h('div', { className: 'text-xs text-gray-400' }, x.origem)),
                                h('td', { className: td + ' text-right', style: { fontVariantNumeric: 'tabular-nums' } }, num(x.pagas), h('div', { className: 'text-xs text-gray-400' }, Math.round((x.pagas / totPagas) * 100) + '%')),
                                h('td', { className: td + ' text-right font-semibold', style: { fontVariantNumeric: 'tabular-nums' } }, brl(x.custo)),
                                h('td', { className: td + ' text-right text-green-700', style: { fontVariantNumeric: 'tabular-nums' } }, num(x.cache))))))),
                    h('div', { className: 'rounded-xl border border-gray-200 overflow-x-auto' },
                        h('table', { className: 'w-full', style: { borderCollapse: 'collapse', minWidth: 360 } },
                            h('thead', null, h('tr', null, h('th', { className: th }, 'Por quê'), h('th', { className: th + ' text-right' }, 'Consultas'))),
                            h('tbody', null, d.por_tipo.map((x) => {
                                const info = TIPOS_GEO[x.tipo] || [x.tipo, 'pago'];
                                return h('tr', { key: x.tipo },
                                    h('td', { className: td }, h('span', { className: 'inline-flex items-center gap-2' },
                                        h('span', { 'aria-hidden': 'true', style: { width: 8, height: 8, borderRadius: 99, background: info[1] === 'cache' ? '#16a34a' : '#d97706' } }),
                                        info[0], h('span', { className: 'text-xs ' + (info[1] === 'cache' ? 'text-green-700' : 'text-amber-700') }, info[1] === 'cache' ? 'grátis' : 'pago'))),
                                    h('td', { className: td + ' text-right', style: { fontVariantNumeric: 'tabular-nums' } }, num(x.chamadas)));
                            }))))),
                h('p', { className: 'text-xs text-gray-500 m-0' }, 'Custo estimado em ' + brl(d.custo_mil_brl) + ' por mil chamadas. O valor oficial é o da fatura do Google Cloud. Contando desde ' + d.desde.split('-').reverse().join('/') + '.'));
        }

        return h('section', { className: 'mt-8 rounded-2xl border border-gray-200 bg-white p-5', 'aria-label': 'Custo de APIs do Google' },
            h('div', { className: 'flex items-center justify-between flex-wrap gap-2 mb-4' },
                h('div', null,
                    h('h3', { className: 'text-lg font-semibold m-0' }, 'Custo de APIs · Google Geocoding'),
                    h('p', { className: 'text-sm text-gray-500 m-0', style: { marginTop: 2 } }, 'Quanto o sistema está pagando para transformar endereço em coordenada, e quanto o cache está economizando')),
                h('div', { className: 'flex items-center gap-2' },
                    h('label', { className: 'text-xs text-gray-600 flex items-center gap-2' }, 'Período',
                        h('select', { value: dias, onChange: (ev) => setDias(Number(ev.target.value)), className: 'border border-gray-300 rounded-md px-2 py-1 text-sm bg-white' },
                            h('option', { value: 7 }, '7 dias'), h('option', { value: 30 }, '30 dias'), h('option', { value: 90 }, '90 dias'))),
                    h('button', { type: 'button', onClick: carregar, className: 'px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md' }, 'Atualizar'))),
            corpo);
    }

    window.SaudeSistemaView = function SaudeSistemaView({ apiUrl, fetchAuth, showToast, usuario }) {
        const [dados, setDados] = React.useState(null);
        const [erro, setErro] = React.useState(null);
        const [carregando, setCarregando] = React.useState(true);
        const [ultimaAtualizacao, setUltimaAtualizacao] = React.useState(null);
        const [modalRestartAberto, setModalRestartAberto] = React.useState(false);
        const [reiniciando, setReiniciando] = React.useState(false);

        // Auto-refresh a cada 10s
        const carregar = React.useCallback(async () => {
            try {
                const r = await fetchAuth(apiUrl + '/health/agents');
                if (!r.ok && r.status !== 503) {
                    // 503 retorna body com dados — só não-503 e não-200 é erro de verdade
                    throw new Error(`HTTP ${r.status}`);
                }
                const data = await r.json();
                setDados(data);
                setErro(null);
                setUltimaAtualizacao(new Date());
            } catch (e) {
                setErro(e.message);
            } finally {
                setCarregando(false);
            }
        }, [apiUrl, fetchAuth]);

        React.useEffect(() => {
            carregar();
            const id = setInterval(carregar, 10000);
            return () => clearInterval(id);
        }, [carregar]);

        const confirmarRestart = async () => {
            setReiniciando(true);
            try {
                const r = await fetchAuth(apiUrl + '/system/restart-worker', {
                    method: 'POST',
                });
                const data = await r.json();
                if (r.ok) {
                    showToast('Restart iniciado — worker volta em ~30s', 'success');
                    setModalRestartAberto(false);
                    // Limpa dados e recarrega em 30s
                    setDados(null);
                    setCarregando(true);
                    setTimeout(() => {
                        carregar();
                    }, 30000);
                } else {
                    showToast('' + (data.error || data.erro || 'Erro ao reiniciar'), 'error');
                }
            } catch (e) {
                showToast('Erro de conexão: ' + e.message, 'error');
            } finally {
                setReiniciando(false);
            }
        };

        if (carregando && !dados) {
            return React.createElement('div', { className: 'p-8 text-center text-gray-500' },
                'Carregando status dos agentes...'
            );
        }

        if (erro && !dados) {
            return React.createElement('div', { className: 'p-8 text-center' },
                React.createElement('p', { className: 'text-red-600 font-medium' }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })), "Erro ao carregar saúde do sistema")),
                React.createElement('p', { className: 'text-sm text-gray-500 mt-2' }, erro),
                React.createElement('button', {
                    onClick: carregar,
                    className: 'mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'
                }, 'Tentar novamente'),
                // GEOCODE_USO_TELA_V1: o custo aparece mesmo com o worker de agentes fora do ar
                React.createElement('div', { className: 'text-left' }, React.createElement(GeocodeUsoCard, { apiUrl, fetchAuth }))
            );
        }

        const statusCor = {
            'healthy': '#16a34a',
            'degraded': '#d97706',
            'critical': '#dc2626',
            'starting': '#9ca3af',
            'error': '#9ca3af',
        }[dados?.status] || '#9ca3af';

        const statusTexto = {
            'healthy': 'Saudável',
            'degraded': 'Degradado',
            'critical': 'Crítico',
            'starting': 'Iniciando',
            'error': 'Erro',
        }[dados?.status] || dados?.status;

        const agentesDetalhes = dados?.agentes?.detalhes || [];
        const totalAgentes = agentesDetalhes.length;
        const comProblema = (dados?.agentes?.com_problema || 0);

        return React.createElement('div', { className: 'p-6' },
            // Cabeçalho
            React.createElement('div', { className: 'flex items-center justify-between mb-6' },
                React.createElement('div', null,
                    React.createElement('h2', { className: 'text-xl font-semibold m-0' }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-building" })), "Saúde do Sistema")),
                    React.createElement('p', { 
                        className: 'text-sm text-gray-500 m-0', 
                        style: { marginTop: '4px' } 
                    }, 
                        ultimaAtualizacao 
                            ? `Atualizado ${formatarTempoAtras(ultimaAtualizacao.toISOString())} · Auto-refresh a cada 10s`
                            : 'Aguardando primeira atualização...'
                    )
                ),
                React.createElement('div', { className: 'flex gap-2' },
                    React.createElement('button', {
                        onClick: carregar,
                        className: 'px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md flex items-center gap-1'
                    }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-refresh" })), "Atualizar")),
                    React.createElement('button', {
                        onClick: () => setModalRestartAberto(true),
                        className: 'px-3 py-2 text-sm text-white rounded-md flex items-center gap-1',
                        style: { background: '#dc2626' }
                    }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-zap" })), "Reiniciar worker"))
                )
            ),

            // Métricas gerais
            React.createElement('div', {
                className: 'grid grid-cols-2 md:grid-cols-4 gap-3 mb-6'
            },
                React.createElement(MetricaCard, {
                    label: 'Status geral',
                    valor: statusTexto,
                    statusColor: statusCor,
                }),
                React.createElement(MetricaCard, {
                    label: 'Memória (RSS)',
                    valor: dados?.memoria?.rss_mb || '?',
                    sublabel: `/ ${dados?.memoria?.limites?.kill_mb || 1700} MB`,
                }),
                React.createElement(MetricaCard, {
                    label: 'Tempo no ar',
                    valor: formatarUptime(dados?.uptime_seg),
                }),
                React.createElement(MetricaCard, {
                    label: 'Browser pool',
                    valor: (dados?.pool?.browser_pool?.poolSize || 4) - 
                           (dados?.pool?.browser_pool?.slots?.filter(s => s.livre)?.length || 0),
                    sublabel: `/ ${dados?.pool?.browser_pool?.poolSize || 4} em uso`,
                })
            ),

            // Header da lista
            React.createElement('p', { 
                className: 'text-sm text-gray-600 font-medium mb-3' 
            }, `Agentes (${totalAgentes} ativos, ${comProblema} com problema) · Passe o mouse pra ver descrição`),

            // Lista de agentes
            React.createElement('div', {
                className: 'grid grid-cols-1 md:grid-cols-2 gap-2'
            },
                agentesDetalhes.map(agente => 
                    React.createElement(AgenteCard, { 
                        key: agente.nome, 
                        agente: agente 
                    })
                )
            ),

            // GEOCODE_USO_TELA_V1: custo do Google Geocoding
            React.createElement(GeocodeUsoCard, { apiUrl, fetchAuth }),

            // Modal de restart
            modalRestartAberto && React.createElement(ModalRestart, {
                onConfirmar: confirmarRestart,
                onCancelar: () => setModalRestartAberto(false),
                processando: reiniciando,
            })
        );
    };

    console.log('%c🏥 SaudeSistemaView carregado', 'background:#16a34a;color:#fff;font-size:12px;padding:3px 6px;border-radius:3px;');
})();
