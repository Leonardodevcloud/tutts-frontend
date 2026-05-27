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
            'parado': '#f59e0b',       // amarelo
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
            return `⚠ Sem execução ${formatarTempoAtras(agente.ultimaExecucao)}`;
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
                }, '⚠️ Reiniciar Worker'),
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
                            background: (podeConfirmar && !processando) ? '#dc2626' : '#fca5a5',
                            cursor: (podeConfirmar && !processando) ? 'pointer' : 'not-allowed',
                        }
                    }, processando ? '⏳ Reiniciando...' : '🔄 Confirmar restart')
                )
            )
        );
    }

    // ── Componente Principal ─────────────────────────────────────────────
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
                    showToast('🔄 Restart iniciado — worker volta em ~30s', 'success');
                    setModalRestartAberto(false);
                    // Limpa dados e recarrega em 30s
                    setDados(null);
                    setCarregando(true);
                    setTimeout(() => {
                        carregar();
                    }, 30000);
                } else {
                    showToast('❌ ' + (data.error || data.erro || 'Erro ao reiniciar'), 'error');
                }
            } catch (e) {
                showToast('❌ Erro de conexão: ' + e.message, 'error');
            } finally {
                setReiniciando(false);
            }
        };

        if (carregando && !dados) {
            return React.createElement('div', { className: 'p-8 text-center text-gray-500' },
                '⏳ Carregando status dos agentes...'
            );
        }

        if (erro && !dados) {
            return React.createElement('div', { className: 'p-8 text-center' },
                React.createElement('p', { className: 'text-red-600 font-medium' }, '❌ Erro ao carregar saúde do sistema'),
                React.createElement('p', { className: 'text-sm text-gray-500 mt-2' }, erro),
                React.createElement('button', {
                    onClick: carregar,
                    className: 'mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'
                }, 'Tentar novamente')
            );
        }

        const statusCor = {
            'healthy': '#16a34a',
            'degraded': '#f59e0b',
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
                    React.createElement('h2', { className: 'text-xl font-semibold m-0' }, '🏥 Saúde do Sistema'),
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
                    }, '🔄 Atualizar'),
                    React.createElement('button', {
                        onClick: () => setModalRestartAberto(true),
                        className: 'px-3 py-2 text-sm text-white rounded-md flex items-center gap-1',
                        style: { background: '#dc2626' }
                    }, '⚡ Reiniciar worker')
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
