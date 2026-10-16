/* REDESIGN_CLEAN_V1: telas no padrao clean aprovado (mockups 16/10). */
/* UI_UNIFICADO_V1: emojis -> sprite de icones; cores na paleta unica (CORES_TOKENS_V1). */
/* FIN_DEEMOJI_FULL_V2 */
/* FIN_HOME_REDESIGN_V1 */
// MÓDULO FINANCEIRO - TUTTS v2.0
(function() {
    'use strict';
    
    window.formatarMoeda = window.formatarMoeda || function(valor) {
        return parseFloat(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    };
    
    window.parseSaldoBR = window.parseSaldoBR || function(valor) {
        if (typeof valor === "number") return valor;
        if (!valor) return 0;
        const str = String(valor);
        return str.includes(",") ? parseFloat(str.replace(/\./g, "").replace(",", ".")) || 0 : parseFloat(str) || 0;
    };
    
    /* FIN_ABAS_V1: base visual das abas do Financeiro (padrão clean BRIEF2).
       - CSS de apoio injetado uma vez (.fin-card, .fin-tbl, .fin-inp, .fin-lbl, .fin-btn, .fin-chip)
       - window.FinUI: cabeçalho de página, faixa de KPIs, pílula de status, chips, estado vazio.
       Só visual — nenhuma regra de negócio mora aqui. */
    (function finAbasInjetarCss() {
        try {
            if (typeof document === "undefined" || document.getElementById("fin-abas-v1-css")) return;
            var css = [
                ".fin-card{background:#fff;border:1px solid #e5e7eb;border-radius:14px}",
                ".fin-tbl{width:100%;border-collapse:collapse;font-size:12.5px;color:#111827}",
                ".fin-tbl thead th{background:#f9fafb;color:#6b7280;font-weight:600;font-size:12px;padding:10px 12px;white-space:nowrap;border:0}",
                ".fin-tbl tbody td{border-top:1px solid #f3f4f6;padding:10px 12px;vertical-align:middle}",
                ".fin-tbl tbody tr:hover>td{background:#f9fafb}",
                ".fin-inp{height:38px;border:1px solid #e5e7eb;border-radius:10px;padding:0 12px;font-size:13px;background:#fff;color:#111827;font-family:inherit;box-sizing:border-box;max-width:100%}",
                "textarea.fin-inp{height:auto;min-height:76px;padding:8px 12px;line-height:1.45}",
                "select.fin-inp{padding-right:28px}",
                ".fin-inp:focus{outline:none;border-color:#770fa8;box-shadow:0 0 0 3px #f3e8fb}",
                ".fin-inp[readonly],.fin-inp:disabled{background:#f9fafb;color:#374151}",
                ".fin-lbl{display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:4px}",
                ".fin-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:38px;padding:0 14px;border-radius:10px;font-size:13px;font-weight:600;white-space:nowrap;cursor:pointer;border:1px solid transparent;font-family:inherit;line-height:1}",
                ".fin-btn:disabled{opacity:.5;cursor:not-allowed}",
                ".fin-btn-p{background:#770fa8;border-color:#770fa8;color:#fff}.fin-btn-p:hover:not(:disabled){background:#5d0b85;border-color:#5d0b85}",
                ".fin-btn-s{background:#fff;border-color:#e5e7eb;color:#374151}.fin-btn-s:hover:not(:disabled){background:#f9fafb}",
                ".fin-btn-d{background:#fff;border-color:#fecaca;color:#991b1b}.fin-btn-d:hover:not(:disabled){background:#fef2f2}",
                ".fin-btn-sm{height:30px;padding:0 10px;font-size:12px;border-radius:8px;gap:6px}",
                ".fin-chip{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:999px;font-size:12.5px;font-weight:500;border:1px solid #e5e7eb;background:#fff;color:#374151;cursor:pointer;white-space:nowrap;font-family:inherit}",
                ".fin-chip:hover{background:#f9fafb}",
                ".fin-chip[aria-pressed=true]{background:#770fa8;border-color:#770fa8;color:#fff;font-weight:600}",
                ".fin-chip .fin-chip-n{opacity:.7;font-variant-numeric:tabular-nums}",
                ".fin-kpis{background:#fff;border:1px solid #e5e7eb;border-radius:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0;overflow:hidden}",
                ".fin-kpis>div{background:#fff;padding:14px 18px;min-width:0;box-shadow:0 0 0 1px #f3f4f6}",
                ".fin-kpi-l{font-size:12px;color:#6b7280}",
                ".fin-kpi-v{font-family:Sora,Inter,sans-serif;font-size:24px;font-weight:700;line-height:1.25;margin:2px 0;font-variant-numeric:tabular-nums;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
                ".fin-kpi-s{font-size:11.5px;color:#6b7280}",
                ".fin-page-t{margin:0;font-family:Sora,Inter,sans-serif;font-size:24px;font-weight:700;letter-spacing:-0.01em;color:#111827;line-height:1.25}",
                ".fin-page-s{margin:4px 0 0;color:#6b7280;font-size:13px}",
                ".fin-sec-t{margin:0;font-size:15px;font-weight:600;color:#111827}",
                /* pílula de status via classe: o tom vem da classe bg-*-50 já existente; o ponto é ::before */
                ".fin-pill{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:3px 9px;font-size:12px;font-weight:600;white-space:nowrap;line-height:1.3}",
                ".fin-pill::before{content:'';width:6px;height:6px;border-radius:999px;flex:none;background:#9ca3af}",
                ".fin-pill.bg-green-50::before{background:#16a34a}.fin-pill.bg-amber-50::before{background:#d97706}.fin-pill.bg-red-50::before{background:#dc2626}.fin-pill.bg-blue-50::before{background:#2563eb}.fin-pill.bg-purple-50::before{background:#770fa8}"
            ].join("\n");
            var el = document.createElement("style");
            el.id = "fin-abas-v1-css";
            el.textContent = css;
            (document.head || document.documentElement).appendChild(el);
        } catch (_) {}
    })();

    window.FinUI = (function() {
        var h = function() { return React.createElement.apply(React, arguments); };
        var TONS = {
            verde: { bg: "#f0fdf4", cor: "#166534", dot: "#16a34a" },
            ambar: { bg: "#fffbeb", cor: "#92400e", dot: "#d97706" },
            vermelho: { bg: "#fef2f2", cor: "#991b1b", dot: "#dc2626" },
            azul: { bg: "#eff6ff", cor: "#1e40af", dot: "#2563eb" },
            roxo: { bg: "#faf7fd", cor: "#5d0b85", dot: "#770fa8" },
            cinza: { bg: "#f3f4f6", cor: "#374151", dot: "#9ca3af" }
        };
        var ico = function(nome, px, cor) {
            return h("svg", { className: "ico", style: { width: px || 16, height: px || 16, color: cor || undefined, flex: "none" }, "aria-hidden": "true" }, h("use", { href: "#i-" + nome }));
        };
        /* cabeçalho de página: título Sora 24 + subtítulo cinza + ações à direita */
        var cabecalho = function(titulo, sub, acoes) {
            return h("div", { className: "fin-page-head", style: { display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 12, marginBottom: 16 } },
                h("div", { style: { minWidth: 0 } },
                    h("h1", { className: "fin-page-t" }, titulo),
                    sub ? h("p", { className: "fin-page-s" }, sub) : null),
                acoes ? h("div", { style: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" } }, acoes) : null);
        };
        /* faixa única de KPIs: [{ rotulo, valor, sub, tom, title }] — tom pinta só o número (800) */
        var kpis = function(itens, extra) {
            return h("section", { className: "fin-kpis", "aria-label": "Indicadores", style: Object.assign({ marginBottom: 16 }, extra || {}) },
                itens.filter(Boolean).map(function(k, i) {
                    var t = k.tom && TONS[k.tom];
                    return h("div", { key: i, title: k.title || undefined },
                        h("div", { className: "fin-kpi-l" }, k.rotulo),
                        h("div", { className: "fin-kpi-v", style: t ? { color: t.cor } : null }, k.valor),
                        k.sub ? h("div", { className: "fin-kpi-s" }, k.sub) : null);
                }));
        };
        /* pílula de status: fundo 50 + texto 800 + ponto 6px 600 */
        var pilula = function(tom, texto, extra) {
            var t = TONS[tom] || TONS.cinza;
            return h("span", { style: Object.assign({ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "3px 9px", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap", background: t.bg, color: t.cor, lineHeight: 1.3 }, extra || {}) },
                h("span", { "aria-hidden": "true", style: { width: 6, height: 6, borderRadius: 999, background: t.dot, flex: "none" } }),
                texto);
        };
        /* chips segmentados: opcoes [{ id, label, n }] */
        var chips = function(opcoes, valor, onChange, rotulo) {
            return h("div", { role: "group", "aria-label": rotulo || "Filtro", style: { display: "flex", flexWrap: "wrap", gap: 6 } },
                opcoes.map(function(o) {
                    var ativo = valor === o.id;
                    return h("button", { key: String(o.id), type: "button", className: "fin-chip", "aria-pressed": ativo, onClick: function() { onChange(o.id); } },
                        o.label, o.n != null ? h("span", { className: "fin-chip-n" }, Number(o.n).toLocaleString("pt-BR")) : null);
                }));
        };
        var vazio = function(texto, acao) {
            return h("div", { style: { padding: "40px 16px", textAlign: "center", color: "#6b7280", fontSize: 13 } },
                h("p", { style: { margin: 0 } }, texto),
                acao ? h("div", { style: { marginTop: 12 } }, acao) : null);
        };
        return { TONS: TONS, ico: ico, cabecalho: cabecalho, kpis: kpis, pilula: pilula, chips: chips, vazio: vazio };
    })();

    // Traduzir erros do Stark Bank para mensagens legíveis no frontend
    window.traduzirErroStarkFE = function(erroStr) {
        if (!erroStr) return '';
        var s = String(erroStr);
        var map = {
            'invalidPixKey': 'Chave Pix inválida ou inexistente',
            'invalidAccountNumber': 'Conta bancária inválida',
            'invalidBranchCode': 'Agência inválida',
            'invalidTaxId': 'CPF/CNPJ divergente',
            'invalidName': 'Nome divergente no banco',
            'invalidAmount': 'Valor inválido',
            'invalidExternalId': 'Transferência duplicada',
            'insufficientFunds': 'Saldo insuficiente na Stark',
            'insufficientBalance': 'Saldo insuficiente na Stark',
            'accountClosed': 'Conta do beneficiário encerrada',
            'accountBlocked': 'Conta do beneficiário bloqueada',
            'timeout': 'Timeout — banco não respondeu',
            'internalError': 'Erro interno Stark Bank',
            'bankError': 'Banco recusou a transferência',
            'pixKeyNotFound': 'Chave Pix não encontrada no BACEN',
            'pixKeyInactive': 'Chave Pix inativa/excluída',
            'transactionRefused': 'Transação recusada',
            'limitExceeded': 'Limite Pix excedido',
            'fraudSuspicion': 'Bloqueado por suspeita de fraude',
            'entryNotFound': 'Chave não encontrada no DICT',
            'entryInactive': 'Chave inativa no DICT',
            'entryLocked': 'Chave em portabilidade'
        };
        // Se já é uma mensagem traduzida pelo backend, retorna direto
        if (s.includes('Chave Pix inválida —') || s.includes('Saldo insuficiente') || s.includes('Conta do beneficiário')) return s;
        // Tentar parsear JSON
        try {
            var parsed = JSON.parse(s);
            var arr = Array.isArray(parsed) ? parsed : [parsed];
            return arr.map(function(e) { return map[e.code] || e.message || e.code || 'Erro'; }).join(' | ');
        } catch(_) {}
        // Buscar código no texto
        for (var code in map) {
            if (map.hasOwnProperty(code) && s.includes(code)) return map[code];
        }
        return s.length > 80 ? s.substring(0, 77) + '...' : s;
    };

    // ════════════════════════════════════════════════════════════════════
    // SUB-COMPONENTE: FinConfigTogglesSecao
    // ════════════════════════════════════════════════════════════════════
    // 2026-04: Toggles de configuração do módulo financeiro:
    //   - Saques habilitados (kill switch global)
    //   - Saques automáticos (modo auto: solicitação → débito → Stark imediato)
    //
    // - Permissão: só admin/admin_master vê. admin_financeiro NÃO pode mexer aqui.
    // - Lê GET /api/financial/config no mount + após cada update.
    // - Modal de confirmação pra LIGAR auto-saque (digita CONFIRMAR).
    // - Backend valida via header X-Confirm-Auto-Saque (defesa em profundidade).
    function FinConfigTogglesSecao(props) {
        const { API_URL, fetchAuth, usuario, ja } = props;
        const [config, setConfig] = React.useState(null);
        const [loading, setLoading] = React.useState(true);
        const [salvando, setSalvando] = React.useState(null); // chave atualmente sendo salva
        const [modalConfirmAuto, setModalConfirmAuto] = React.useState(false);
        const [textoConfirm, setTextoConfirm] = React.useState('');

        const podeEditar = usuario && (usuario.role === 'admin' || usuario.role === 'admin_master');

        // 🐛 FIX 2026-04: refs pra estabilizar fetchAuth/API_URL/ja entre renders.
        // Sem isso, props mudam a cada render do pai → useCallback recria função →
        // useEffect dispara de novo → loop infinito de GET /financial/config.
        // Logs do Railway mostraram 180+ chamadas/segundo até bater rate limit (HTTP 429).
        const fetchAuthRef = React.useRef(fetchAuth);
        const apiUrlRef    = React.useRef(API_URL);
        const jaRef        = React.useRef(ja);
        // Atualiza refs sem disparar re-render
        fetchAuthRef.current = fetchAuth;
        apiUrlRef.current    = API_URL;
        jaRef.current        = ja;

        async function carregar() {
            try {
                const r = await fetchAuthRef.current(`${apiUrlRef.current}/financial/config`);
                if (!r.ok) {
                    if (r.status === 403) {
                        setConfig(null);
                        setLoading(false);
                        return;
                    }
                    throw new Error('HTTP ' + r.status);
                }
                const d = await r.json();
                setConfig(d.config || {});
            } catch (err) {
                console.error('Erro ao ler /financial/config:', err);
                jaRef.current && jaRef.current('Erro ao carregar configurações: ' + (err.message || 'desconhecido'), 'error');
            } finally {
                setLoading(false);
            }
        }

        // 🐛 FIX: Carrega UMA vez no mount. Deps vazias = só roda na primeira renderização.
        // Recargas manuais via salvar() chamam carregar() explicitamente.
        React.useEffect(() => { carregar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

        async function salvar(chave, novoValor, headers) {
            setSalvando(chave);
            try {
                const opts = {
                    method: 'PUT',
                    headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}),
                    body: JSON.stringify({ chave, valor: String(novoValor) }),
                };
                const r = await fetchAuthRef.current(`${apiUrlRef.current}/financial/config`, opts);
                const d = await r.json().catch(() => ({}));
                if (!r.ok) {
                    if (r.status === 428 && d.requer_confirmacao) {
                        // Backend exigiu confirmação; o frontend já deveria ter mandado.
                        jaRef.current && jaRef.current('Confirmação obrigatória ao ligar saques automáticos.', 'error');
                        return false;
                    }
                    throw new Error(d.error || 'HTTP ' + r.status);
                }
                jaRef.current && jaRef.current('Configuração atualizada', 'success');
                await carregar();
                return true;
            } catch (err) {
                console.error('Erro ao salvar config:', err);
                jaRef.current && jaRef.current('' + (err.message || 'erro ao salvar'), 'error');
                return false;
            } finally {
                setSalvando(null);
            }
        }

        // ⚠️ Funções abaixo virou código morto (substituídas pelos handlers nativos
        // via addEventListener no useEffect). Mantidas por enquanto pra histórico.
        function onToggleSaquesHabilitados(novoValor) {
            if (!podeEditar) return;
            salvar('saques_habilitados', novoValor);
        }

        function onToggleSaquesAutomaticos(novoValor) {
            if (!podeEditar) return;
            // Pra LIGAR, exige modal de confirmação
            if (novoValor === true) {
                setTextoConfirm('');
                setModalConfirmAuto(true);
                return;
            }
            // Pra DESLIGAR, só salva direto
            salvar('saques_automaticos', false);
        }

        async function confirmarLigarAuto() {
            if (textoConfirm.trim().toUpperCase() !== 'CONFIRMAR') {
                ja && ja('Digite exatamente CONFIRMAR pra prosseguir.', 'error');
                return;
            }
            const ok = await salvar('saques_automaticos', true, {
                'X-Confirm-Auto-Saque': 'SIM',
            });
            if (ok) {
                setModalConfirmAuto(false);
                setTextoConfirm('');
            }
        }

        // ── Helpers de display ──
        function valorBool(chave) {
            if (!config || !config[chave]) return false;
            const v = String(config[chave].valor).trim().toLowerCase();
            return v === 'true' || v === '1' || v === 'yes';
        }
        function ultimaAlteracao(chave) {
            if (!config || !config[chave]) return null;
            const c = config[chave];
            if (!c.updated_at) return null;
            const d = new Date(c.updated_at);
            const dataStr = d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            return `Última alteração: ${dataStr}${c.updated_by ? ' por ' + c.updated_by : ''}`;
        }

        // ════════════════════════════════════════════════════════════════════
        // 🐛 FIX FINAL 2026-04-30 (round 8): callback refs anexam listeners SÍNCRONOS
        // ════════════════════════════════════════════════════════════════════
        // Round 7 falhou porque useEffect com [config !== null] não disparou nas
        // condições corretas — debug mostrou listenersChrome=0 no botão.
        //
        // Solução robusta: callback ref. React chama essa função DIRETAMENTE quando
        // monta/desmonta o nó DOM, antes mesmo de useEffect rodar. Não tem como o
        // listener não ser anexado. Usa closure pra acessar o handler atual via ref.

        // Refs com os handlers atuais (atualizados a cada render — sem disparar re-render)
        const handlerHabRef  = React.useRef(null);
        const handlerAutoRef = React.useRef(null);

        handlerHabRef.current = function() {
            console.log('[FinConfig] CLICK Saques Habilitados — atual:', valorBool('saques_habilitados'));
            if (!podeEditar || salvando === 'saques_habilitados') return;
            const novoValor = !valorBool('saques_habilitados');
            salvar('saques_habilitados', novoValor);
        };
        handlerAutoRef.current = function() {
            console.log('[FinConfig] CLICK Saques Automaticos — atual:', valorBool('saques_automaticos'));
            if (!podeEditar || salvando === 'saques_automaticos') return;
            const ativoAtual = valorBool('saques_automaticos');
            const novoValor = !ativoAtual;
            if (novoValor === true) {
                setTextoConfirm('');
                setModalConfirmAuto(true);
                return;
            }
            salvar('saques_automaticos', false);
        };

        // Callback refs: React chama com o nó DOM quando monta, e com null quando desmonta.
        // Anexamos addEventListener nativo direto. Se React desmontar e remontar, refaz tudo.
        // Usamos useMemo com [] pra memoizar a função (evita recriar a cada render — senão
        // o callback ref é chamado com null+nó toda hora).
        const refHab = React.useMemo(() => {
            let nodoAtual = null;
            const onClick = (e) => {
                e.preventDefault();
                if (handlerHabRef.current) handlerHabRef.current();
            };
            return (nodo) => {
                if (nodoAtual) {
                    nodoAtual.removeEventListener('click', onClick);
                    console.log('[FinConfig] listener REMOVIDO de saques_habilitados');
                }
                nodoAtual = nodo;
                if (nodo) {
                    nodo.addEventListener('click', onClick);
                    console.log('[FinConfig] listener ANEXADO em saques_habilitados');
                }
            };
        }, []);

        const refAuto = React.useMemo(() => {
            let nodoAtual = null;
            const onClick = (e) => {
                e.preventDefault();
                if (handlerAutoRef.current) handlerAutoRef.current();
            };
            return (nodo) => {
                if (nodoAtual) {
                    nodoAtual.removeEventListener('click', onClick);
                    console.log('[FinConfig] listener REMOVIDO de saques_automaticos');
                }
                nodoAtual = nodo;
                if (nodo) {
                    nodo.addEventListener('click', onClick);
                    console.log('[FinConfig] listener ANEXADO em saques_automaticos');
                }
            };
        }, []);

        // ── Renderização ──
        if (loading) {
            return React.createElement('div', { className: 'bg-white rounded-[14px] p-4 mb-6 border border-gray-200' },
                React.createElement('p', { className: 'text-sm text-gray-500' }, 'Carregando configurações...')
            );
        }

        // Não-admin (admin_financeiro) cai aqui — não vê a seção
        if (!podeEditar || !config) {
            return null;
        }

        const habOn = valorBool('saques_habilitados');
        const autoOn = valorBool('saques_automaticos');

        return React.createElement('div', { className: 'fin-card p-5 mb-6' }, /* FIN_ABAS_V1 */
            React.createElement('h2', { className: 'fin-sec-t mb-1' },
                'Sistema de saques'
            ),
            React.createElement('p', { className: 'text-sm text-gray-500 mb-4' },
                'Controle global de solicitações de saque e modo automático de pagamento.'
            ),

            // ── Toggle: saques_habilitados ──
            React.createElement('div', { className: 'flex items-start justify-between gap-4 p-4 bg-gray-50 border border-gray-200 rounded-[10px] mb-3' },
                React.createElement('div', { className: 'flex-1' },
                    React.createElement('div', { className: 'flex items-center gap-2 mb-1' },
                        React.createElement('span', { className: 'font-semibold text-gray-900' }, 'Saques habilitados'),
                        habOn
                            ? React.createElement('span', { className: 'fin-pill bg-green-50 text-green-800' }, 'Ativo')
                            : React.createElement('span', { className: 'fin-pill bg-red-50 text-red-800' }, 'Desabilitado')
                    ),
                    React.createElement('p', { className: 'text-xs text-gray-500 leading-relaxed' },
                        'Quando desabilitado, motoboys recebem mensagem ',
                        React.createElement('em', null, '"Saques temporariamente indisponíveis"'),
                        ' e o backend rejeita qualquer tentativa.'
                    ),
                    ultimaAlteracao('saques_habilitados') && React.createElement('p', {
                        className: 'text-[11px] text-gray-400 mt-1.5'
                    }, ultimaAlteracao('saques_habilitados'))
                ),
                // 🆕 Toggle visual estilo iOS — mantém callback ref que finalmente funcionou
                React.createElement('button', {
                    ref: refHab,
                    type: 'button',
                    disabled: salvando === 'saques_habilitados',
                    'aria-pressed': habOn ? 'true' : 'false',
                    title: habOn ? 'Clique pra desabilitar' : 'Clique pra habilitar',
                    className: 'relative inline-flex shrink-0 h-7 w-12 items-center rounded-full transition-colors duration-200 ' +
                        (habOn ? 'bg-green-600' : 'bg-gray-300') +
                        (salvando === 'saques_habilitados' ? ' opacity-50 cursor-wait' : ' cursor-pointer'),
                },
                    React.createElement('span', {
                        style: { pointerEvents: 'none' },
                        className: 'inline-block h-5 w-5 rounded-full bg-white transition-transform duration-200 ' +
                            (habOn ? 'translate-x-6' : 'translate-x-1')
                    })
                )
            ),

            // ── Toggle: saques_automaticos ──
            React.createElement('div', {
                className: `flex items-start justify-between gap-4 p-4 rounded-[10px] mb-3 border ${autoOn ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`
            },
                React.createElement('div', { className: 'flex-1' },
                    React.createElement('div', { className: 'flex items-center gap-2 mb-1' },
                        React.createElement('span', { className: 'font-semibold text-gray-900' }, 'Saques automáticos'),
                        autoOn
                            ? React.createElement('span', { className: 'fin-pill bg-amber-50 text-amber-800' }, 'Modo automático')
                            : React.createElement('span', { className: 'fin-pill bg-gray-100 text-gray-700' }, 'Manual')
                    ),
                    React.createElement('p', { className: 'text-xs text-gray-700 leading-relaxed' },
                        'Quando ativo: motoboy solicita → débito Plific → ',
                        React.createElement('strong', null, 'pagamento Stark imediato'),
                        '. Sem cron, sem aprovação admin.'
                    ),
                    React.createElement('p', { className: 'text-xs text-amber-800 leading-relaxed mt-1.5 font-semibold' },
                        React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#d97706" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-alert" })), "Atenção: pagamentos saem direto da conta Stark. Limites atuais (mín R$ 15, máx R$ 1.000/saque, R$ 1.000/dia, R$ 1.500/semana) continuam valendo.")
                    ),
                    ultimaAlteracao('saques_automaticos') && React.createElement('p', {
                        className: 'text-[11px] text-gray-400 mt-1.5'
                    }, ultimaAlteracao('saques_automaticos'))
                ),
                React.createElement('button', {
                    ref: refAuto,
                    type: 'button',
                    disabled: salvando === 'saques_automaticos',
                    'aria-pressed': autoOn ? 'true' : 'false',
                    title: autoOn ? 'Clique pra voltar a manual' : 'Clique pra ligar AUTO',
                    className: 'relative inline-flex shrink-0 h-7 w-12 items-center rounded-full transition-colors duration-200 ' +
                        (autoOn ? 'bg-amber-600' : 'bg-gray-300') +
                        (salvando === 'saques_automaticos' ? ' opacity-50 cursor-wait' : ' cursor-pointer'),
                },
                    React.createElement('span', {
                        style: { pointerEvents: 'none' },
                        className: 'inline-block h-5 w-5 rounded-full bg-white transition-transform duration-200 ' +
                            (autoOn ? 'translate-x-6' : 'translate-x-1')
                    })
                )
            ),

            // ── Aviso de fallback ──
            autoOn && React.createElement('div', {
                className: 'text-xs text-gray-500 p-3 bg-blue-50 border border-blue-200 rounded-lg leading-relaxed'
            },
                React.createElement('strong', null, 'Comportamento de fallback: '),
                'se o pagamento Stark falhar (CPF inválido, chave Pix errada, etc.), o saque cai automaticamente no fluxo manual (status ',
                React.createElement('code', { className: 'px-1 bg-blue-50 rounded' }, 'aguardando_pagamento_stark'),
                ') e o cron de 8-18h processa normalmente. O débito Plific NÃO é revertido.'
            ),

            // ── Modal de confirmação pra ligar auto ──
            modalConfirmAuto && React.createElement('div', {
                className: 'fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4',
                onClick: () => { if (!salvando) { setModalConfirmAuto(false); setTextoConfirm(''); } }
            },
                React.createElement('div', {
                    className: 'bg-white rounded-[14px] max-w-lg w-full p-6 border border-gray-200',
                    onClick: (e) => e.stopPropagation(),
                },
                    React.createElement('h3', { className: 'text-2xl font-bold text-amber-800 mb-3 flex items-center gap-2' },
                        React.createElement("svg", { className: "ico", style: { width: 18, height: 18, color: "#d97706" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-alert" })),
                        'Ligar saques automáticos?'
                    ),
                    React.createElement('div', { className: 'space-y-3 text-sm text-gray-700 mb-4' },
                        React.createElement('p', null,
                            'Você está prestes a ativar o modo de pagamento automático. A partir desse momento, ',
                            React.createElement('strong', null, 'cada saque solicitado por motoboy será pago imediatamente via Stark Bank'),
                            ' sem revisão do administrador.'
                        ),
                        React.createElement('div', { className: 'p-3 bg-amber-50 border border-amber-200 rounded-lg' },
                            React.createElement('p', { className: 'font-semibold text-amber-800 mb-1' }, 'O que continua valendo:'),
                            React.createElement('ul', { className: 'list-disc list-inside text-xs text-amber-800 space-y-0.5' },
                                React.createElement('li', null, 'Mínimo R$ 15 e máximo R$ 1.000 por saque'),
                                React.createElement('li', null, 'Limite de R$ 1.000 por dia, R$ 1.500 por semana'),
                                React.createElement('li', null, 'Bloqueio de profissionais restritos'),
                                React.createElement('li', null, 'Validação de CPF e chave Pix')
                            )
                        ),
                        React.createElement('p', { className: 'text-xs text-gray-500' },
                            'Se o pagamento Stark falhar, o saque cai automaticamente no fluxo manual.'
                        ),
                        React.createElement('p', { className: 'font-semibold' },
                            'Pra confirmar, digite ',
                            React.createElement('code', { className: 'px-2 py-0.5 bg-gray-200 rounded font-mono' }, 'CONFIRMAR'),
                            ' abaixo:'
                        ),
                        React.createElement('input', {
                            type: 'text',
                            value: textoConfirm,
                            onChange: (e) => setTextoConfirm(e.target.value),
                            placeholder: 'Digite CONFIRMAR',
                            disabled: !!salvando,
                            autoFocus: true,
                            className: 'w-full px-4 py-3 border-2 border-amber-200 rounded-lg font-mono uppercase focus:border-purple-700 focus:outline-none',
                            onKeyDown: (e) => {
                                if (e.key === 'Enter' && textoConfirm.trim().toUpperCase() === 'CONFIRMAR') {
                                    confirmarLigarAuto();
                                }
                            }
                        })
                    ),
                    React.createElement('div', { className: 'flex gap-3' },
                        React.createElement('button', {
                            disabled: !!salvando,
                            onClick: () => { setModalConfirmAuto(false); setTextoConfirm(''); },
                            className: 'flex-1 px-4 py-3 rounded-[10px] font-semibold disabled:opacity-50 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50',
                        }, 'Cancelar'),
                        React.createElement('button', {
                            disabled: !!salvando || textoConfirm.trim().toUpperCase() !== 'CONFIRMAR',
                            onClick: confirmarLigarAuto,
                            className: 'flex-1 px-4 py-3 text-white rounded-[10px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed bg-purple-700 hover:bg-purple-800 border border-purple-700',
                        }, salvando ? 'Salvando...' : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-zap" })), "Ativar modo auto"))
                    )
                )
            )
        );
    }

    // ========================================================================
    // 🆕 2026-05: ABA RELATÓRIOS — REDESIGN COMPLETO
    // ========================================================================
    // Substituiu a versão antiga que:
    //   - Filtrava `q` (lista carregada com LIMIT 500) por mês/ano client-side
    //   - Não tinha filtro por período livre
    //   - Tinha gráfico de barras semanal estático com janela fixa de 4 semanas
    //   - Misturava cálculos de "tempo médio" obsoletos (saques são em tempo real
    //     agora via Stark Bank automático)
    //
    // O componente agora:
    //   - Tem state PRÓPRIO de dados (independente do `q` global)
    //   - Faz fetch direto a /withdrawals com dataInicio/dataFim (sem limit)
    //   - Período livre via 2 date pickers + 6 atalhos
    //   - Gráfico em linha (SVG) com 3 séries: Solicitado, Pago, Lucro
    //   - Granularidade auto: ≤31 dias = diário, senão semanal
    //   - Comparativo só quando o período é um mês inteiro
    // ========================================================================
    function RelatoriosFinanceiroV2({ fetchAuth, API_URL, er, ja }) {
        const { useState, useEffect, useMemo, useRef, useCallback } = React;

        // Helpers de data
        const hoje = () => {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            return d;
        };
        const formatarData = (d) => {
            const ano = d.getFullYear();
            const mes = String(d.getMonth() + 1).padStart(2, '0');
            const dia = String(d.getDate()).padStart(2, '0');
            return `${ano}-${mes}-${dia}`;
        };
        const formatarDataBR = (iso) => {
            // Aceita 'YYYY-MM-DD' ou Date
            const d = typeof iso === 'string' ? new Date(iso + 'T12:00:00') : iso;
            return d.toLocaleDateString('pt-BR');
        };

        // Inicializa com o mês corrente
        const inicialIni = useMemo(() => {
            const d = hoje();
            d.setDate(1);
            return formatarData(d);
        }, []);
        const inicialFim = useMemo(() => {
            const d = hoje();
            d.setMonth(d.getMonth() + 1, 0); // último dia do mês corrente
            return formatarData(d);
        }, []);

        const [dataIni, setDataIni] = useState(inicialIni);
        const [dataFim, setDataFim] = useState(inicialFim);
        const [dados, setDados] = useState([]);
        const [loading, setLoading] = useState(false);
        const [erro, setErro] = useState(null);

        // Refs estáveis pra fetchAuth/API_URL/ja (padrão Tutts pra evitar loop)
        const fetchAuthRef = useRef(fetchAuth);
        const apiUrlRef = useRef(API_URL);
        const jaRef = useRef(ja);
        useEffect(() => { fetchAuthRef.current = fetchAuth; }, [fetchAuth]);
        useEffect(() => { apiUrlRef.current = API_URL; }, [API_URL]);
        useEffect(() => { jaRef.current = ja; }, [ja]);

        // Fetch quando as datas mudam
        const carregar = useCallback(async () => {
            setLoading(true);
            setErro(null);
            try {
                const url = `${apiUrlRef.current}/withdrawals?dataInicio=${dataIni}&dataFim=${dataFim}&tipoFiltro=solicitacao`;
                const resp = await fetchAuthRef.current(url);
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const json = await resp.json();
                setDados(Array.isArray(json) ? json : (json && Array.isArray(json.rows) ? json.rows : []));
            } catch (e) {
                console.error('Erro ao carregar relatório:', e);
                setErro(e.message);
                setDados([]);
            } finally {
                setLoading(false);
            }
        }, [dataIni, dataFim]);

        useEffect(() => { carregar(); }, [carregar]);

        // ====================================================================
        // CÁLCULOS DERIVADOS (memoizados)
        // ====================================================================

        // Filtros por status com semântica correta (incluindo pago_stark)
        const filtrados = useMemo(() => {
            const aprovados = dados.filter(e =>
                e.status === 'aprovado' ||
                e.status === 'aprovado_gratuidade' ||
                e.status === 'pago_stark'
            );
            // Sem gratuidade: aprovado strict + pago_stark sem has_gratuity
            const semGrat = dados.filter(e =>
                e.status === 'aprovado' ||
                (e.status === 'pago_stark' && !e.has_gratuity)
            );
            // Com gratuidade: aprovado_gratuidade + pago_stark com has_gratuity
            const comGrat = dados.filter(e =>
                e.status === 'aprovado_gratuidade' ||
                (e.status === 'pago_stark' && e.has_gratuity === true)
            );
            const rejeitados = dados.filter(e => e.status === 'rejeitado');
            const pendentes = dados.filter(e => e.status === 'aguardando_aprovacao' || e.status === 'pending');
            return { aprovados, semGrat, comGrat, rejeitados, pendentes };
        }, [dados]);

        // KPIs monetários
        const kpis = useMemo(() => {
            const totalSolicitado = dados.reduce((s, e) => s + parseFloat(e.requested_amount || 0), 0);
            const totalPago = filtrados.aprovados.reduce((s, e) => s + parseFloat(e.final_amount || 0), 0);
            // Lucro = soma da diferença (requested - final) dos SEM gratuidade
            const lucro = filtrados.semGrat.reduce((s, e) =>
                s + (parseFloat(e.requested_amount || 0) - parseFloat(e.final_amount || 0)), 0
            );
            // Deixou arrecadar = 4,5% do que teria taxa nos COM gratuidade
            const deixouArrecadar = filtrados.comGrat.reduce((s, e) =>
                s + 0.045 * parseFloat(e.requested_amount || 0), 0
            );
            return { totalSolicitado, totalPago, lucro, deixouArrecadar };
        }, [dados, filtrados]);

        // ====================================================================
        // SÉRIES DO GRÁFICO (auto granularidade)
        // ====================================================================
        const serie = useMemo(() => {
            if (!dataIni || !dataFim) return { pontos: [], tipo: 'diario' };
            const d1 = new Date(dataIni + 'T00:00:00');
            const d2 = new Date(dataFim + 'T23:59:59');
            const msPorDia = 24 * 60 * 60 * 1000;
            const dias = Math.round((d2.getTime() - d1.getTime()) / msPorDia) + 1;

            // ≤32 dias = diário (incluindo mês cheio); senão = semanal
            const tipoGranularidade = dias <= 32 ? 'diario' : 'semanal';
            const bucketsMs = tipoGranularidade === 'diario' ? msPorDia : 7 * msPorDia;
            const totalBuckets = Math.ceil(dias / (tipoGranularidade === 'diario' ? 1 : 7));

            // Inicializa buckets
            const buckets = [];
            for (let i = 0; i < totalBuckets; i++) {
                const inicio = new Date(d1.getTime() + i * bucketsMs);
                const fim = new Date(Math.min(inicio.getTime() + bucketsMs - 1, d2.getTime()));
                buckets.push({
                    inicio, fim,
                    solicitado: 0, pago: 0, lucro: 0,
                    qtd: 0,
                });
            }

            // Distribui os registros nos buckets
            dados.forEach(e => {
                const ts = new Date(e.created_at).getTime();
                if (ts < d1.getTime() || ts > d2.getTime()) return;
                const idx = Math.floor((ts - d1.getTime()) / bucketsMs);
                if (!buckets[idx]) return;
                const req = parseFloat(e.requested_amount || 0);
                const fin = parseFloat(e.final_amount || 0);
                const aprovado = e.status === 'aprovado' ||
                                 e.status === 'aprovado_gratuidade' ||
                                 e.status === 'pago_stark';
                const semGrat = e.status === 'aprovado' ||
                                (e.status === 'pago_stark' && !e.has_gratuity);
                buckets[idx].solicitado += req;
                if (aprovado) buckets[idx].pago += fin;
                if (semGrat) buckets[idx].lucro += (req - fin);
                buckets[idx].qtd++;
            });

            return { pontos: buckets, tipo: tipoGranularidade };
        }, [dados, dataIni, dataFim]);

        // ====================================================================
        // TOPS 10
        // ====================================================================
        const tops = useMemo(() => {
            const mapSolicitam = {};
            filtrados.semGrat.forEach(e => {
                const k = e.user_cod + '|' + (e.user_name || '');
                if (!mapSolicitam[k]) {
                    mapSolicitam[k] = { cod: e.user_cod, nome: e.user_name, qtd: 0, valor: 0, lucro: 0 };
                }
                mapSolicitam[k].qtd++;
                mapSolicitam[k].valor += parseFloat(e.final_amount || 0);
                mapSolicitam[k].lucro += parseFloat(e.requested_amount || 0) - parseFloat(e.final_amount || 0);
            });
            const topSolicitam = Object.values(mapSolicitam).sort((a, b) => b.qtd - a.qtd).slice(0, 10);

            const mapGrat = {};
            filtrados.comGrat.forEach(e => {
                const k = e.user_cod + '|' + (e.user_name || '');
                if (!mapGrat[k]) {
                    mapGrat[k] = { cod: e.user_cod, nome: e.user_name, qtd: 0, valor: 0, deixouArrecadar: 0 };
                }
                mapGrat[k].qtd++;
                mapGrat[k].valor += parseFloat(e.final_amount || 0);
                mapGrat[k].deixouArrecadar += 0.045 * parseFloat(e.requested_amount || 0);
            });
            const topGratuidade = Object.values(mapGrat).sort((a, b) => b.qtd - a.qtd).slice(0, 10);

            return { topSolicitam, topGratuidade };
        }, [filtrados]);

        // ====================================================================
        // COMPARATIVO COM MÊS ANTERIOR (só se período é mês inteiro)
        // ====================================================================
        const [comparativo, setComparativo] = useState(null);

        // Detecta se o período cobre exatamente um mês inteiro
        const ehMesInteiro = useMemo(() => {
            if (!dataIni || !dataFim) return false;
            const di = new Date(dataIni + 'T00:00:00');
            const df = new Date(dataFim + 'T00:00:00');
            if (di.getMonth() !== df.getMonth() || di.getFullYear() !== df.getFullYear()) return false;
            if (di.getDate() !== 1) return false;
            // último dia do mês
            const ultimoDia = new Date(di.getFullYear(), di.getMonth() + 1, 0).getDate();
            if (df.getDate() !== ultimoDia) return false;
            return true;
        }, [dataIni, dataFim]);

        useEffect(() => {
            // Só busca comparativo se for mês inteiro
            if (!ehMesInteiro) { setComparativo(null); return; }
            const di = new Date(dataIni + 'T00:00:00');
            // Calcula mês anterior
            const mesAntIni = new Date(di.getFullYear(), di.getMonth() - 1, 1);
            const mesAntFim = new Date(di.getFullYear(), di.getMonth(), 0);
            const iniIso = formatarData(mesAntIni);
            const fimIso = formatarData(mesAntFim);

            (async () => {
                try {
                    const url = `${apiUrlRef.current}/withdrawals?dataInicio=${iniIso}&dataFim=${fimIso}&tipoFiltro=solicitacao`;
                    const resp = await fetchAuthRef.current(url);
                    if (!resp.ok) return;
                    const json = await resp.json();
                    const arr = Array.isArray(json) ? json : (json && Array.isArray(json.rows) ? json.rows : []);
                    const totalAnt = arr
                        .filter(e => ['aprovado', 'aprovado_gratuidade', 'pago_stark'].includes(e.status))
                        .reduce((s, e) => s + parseFloat(e.final_amount || 0), 0);
                    setComparativo({ totalAnt, mesAntIni, mesAntFim });
                } catch (e) {
                    console.warn('Comparativo falhou:', e);
                }
            })();
        }, [ehMesInteiro, dataIni]);

        // ====================================================================
        // ATALHOS DE PERÍODO
        // ====================================================================
        const atalhos = useMemo(() => {
            const h = hoje();
            const mesIni = new Date(h.getFullYear(), h.getMonth(), 1);
            const mesFim = new Date(h.getFullYear(), h.getMonth() + 1, 0);
            const mesAntIni = new Date(h.getFullYear(), h.getMonth() - 1, 1);
            const mesAntFim = new Date(h.getFullYear(), h.getMonth(), 0);
            const seteAtras = new Date(h); seteAtras.setDate(h.getDate() - 6);
            const trintaAtras = new Date(h); trintaAtras.setDate(h.getDate() - 29);
            const anoIni = new Date(h.getFullYear(), 0, 1);
            const anoFim = new Date(h.getFullYear(), 11, 31);

            return [
                { id: 'hoje', label: 'Hoje', ini: formatarData(h), fim: formatarData(h) },
                { id: '7d', label: '7 dias', ini: formatarData(seteAtras), fim: formatarData(h) },
                { id: '30d', label: '30 dias', ini: formatarData(trintaAtras), fim: formatarData(h) },
                { id: 'mes', label: 'Este mês', ini: formatarData(mesIni), fim: formatarData(mesFim) },
                { id: 'mes_ant', label: 'Mês anterior', ini: formatarData(mesAntIni), fim: formatarData(mesAntFim) },
                { id: 'ano', label: 'Este ano', ini: formatarData(anoIni), fim: formatarData(anoFim) },
            ];
        }, []);

        const atalhoAtivo = useMemo(() => {
            return atalhos.find(a => a.ini === dataIni && a.fim === dataFim)?.id || null;
        }, [atalhos, dataIni, dataFim]);

        const aplicarAtalho = (atalho) => {
            setDataIni(atalho.ini);
            setDataFim(atalho.fim);
        };

        // ====================================================================
        // GERAR PDF
        // ====================================================================
        const gerarPdf = () => {
            const html = `
                <html>
                <head>
                <title>Relatório Financeiro - ${formatarDataBR(dataIni)} até ${formatarDataBR(dataFim)}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; font-size: 12px; }
                    h1 { color: #166534; border-bottom: 3px solid #166534; padding-bottom: 10px; }
                    h2 { color: #374151; margin-top: 25px; }
                    .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
                    .card { background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; }
                    .card-value { font-size: 20px; font-weight: bold; color: #166534; }
                    .card-label { font-size: 11px; color: #6b7280; }
                    table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
                    th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
                    th { background: #166534; color: white; }
                    .footer { margin-top: 30px; text-align: center; color: #9ca3af; font-size: 10px; }
                </style>
                </head>
                <body>
                <h1>Relatório Financeiro</h1>
                <p><strong>Período:</strong> ${formatarDataBR(dataIni)} até ${formatarDataBR(dataFim)}</p>
                <p><strong>Gerado em:</strong> ${new Date().toLocaleString('pt-BR')}</p>
                <div class="cards">
                    <div class="card"><div class="card-value">R$ ${kpis.totalSolicitado.toFixed(2)}</div><div class="card-label">Total Solicitado</div></div>
                    <div class="card"><div class="card-value">R$ ${kpis.totalPago.toFixed(2)}</div><div class="card-label">Total Pago</div></div>
                    <div class="card"><div class="card-value" style="color:#16a34a">R$ ${kpis.lucro.toFixed(2)}</div><div class="card-label">Lucro (Taxas)</div></div>
                    <div class="card"><div class="card-value" style="color:#dc2626">R$ ${kpis.deixouArrecadar.toFixed(2)}</div><div class="card-label">Deixou Arrecadar</div></div>
                </div>
                <h2>Detalhamento (primeiros 100)</h2>
                <table>
                    <thead><tr><th>Data</th><th>Profissional</th><th>Código</th><th>Solicitado</th><th>Pago</th><th>Status</th></tr></thead>
                    <tbody>
                    ${dados.slice(0, 100).map(e => `
                        <tr>
                        <td>${new Date(e.created_at).toLocaleDateString('pt-BR')}</td>
                        <td>${e.user_name || '-'}</td>
                        <td>${e.user_cod}</td>
                        <td>R$ ${parseFloat(e.requested_amount).toFixed(2)}</td>
                        <td>R$ ${parseFloat(e.final_amount).toFixed(2)}</td>
                        <td>${e.status === 'aprovado' || (e.status === 'pago_stark' && !e.has_gratuity) ? React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })) :
                              e.status === 'aprovado_gratuidade' || (e.status === 'pago_stark' && e.has_gratuity) ? React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-gift" })) :
                              e.status === 'rejeitado' ? React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })) : React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clock" }))}</td>
                        </tr>
                    `).join('')}
                    </tbody>
                </table>
                <div class="footer"><p>Central do Entregador Tutts</p></div>
                </body>
                </html>
            `;
            const w = window.open('', '_blank');
            w.document.write(html);
            w.document.close();
            w.print();
        };

        // ====================================================================
        // RENDER
        // ====================================================================

        // maxValor: usado pra detectar período vazio (todos zerados)
        const maxValor = useMemo(() => {
            return Math.max(
                ...serie.pontos.map(p => Math.max(p.solicitado, p.pago, p.lucro)),
                0
            );
        }, [serie]);

        // Variação do comparativo
        const variacao = useMemo(() => {
            if (!comparativo) return null;
            const ant = comparativo.totalAnt || 0;
            const atual = kpis.totalPago || 0;
            if (ant === 0) return atual === 0 ? 0 : 100;
            return ((atual - ant) / ant) * 100;
        }, [comparativo, kpis.totalPago]);

        /* FIN_ABAS_V1: Relatórios — cabeçalho com "Gerar PDF", filtros em card com pílulas, faixa única de KPIs */
        return React.createElement(React.Fragment, null,
            window.FinUI.cabecalho("Relatórios", loading ? "Carregando…" : `${dados.length.toLocaleString('pt-BR')} saques · ${formatarDataBR(dataIni)} a ${formatarDataBR(dataFim)}`,
                React.createElement('button', {
                    type: 'button',
                    onClick: gerarPdf,
                    disabled: loading || dados.length === 0,
                    className: 'fin-btn fin-btn-p',
                }, React.createElement("svg", { className: "ico", style: { width: 15, height: 15 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-filetext" })), "Gerar PDF")),
            // Card de filtros (período + atalhos)
            React.createElement('div', { className: 'fin-card p-3 mb-4' },
                React.createElement('div', { className: 'flex flex-wrap items-center justify-between gap-3' },
                    React.createElement('div', { className: 'flex flex-wrap items-center gap-2' },
                        React.createElement('span', { className: 'font-semibold text-gray-700 text-xs' }, "Período"),
                        React.createElement('input', {
                            type: 'date', value: dataIni,
                            onChange: e => setDataIni(e.target.value),
                            className: 'fin-inp',
                        }),
                        React.createElement('span', { className: 'text-gray-400 text-sm' }, 'até'),
                        React.createElement('input', {
                            type: 'date', value: dataFim,
                            onChange: e => setDataFim(e.target.value),
                            className: 'fin-inp',
                        })
                    ),
                    // Atalhos rápidos (pílulas)
                    window.FinUI.chips(atalhos.map(a => ({ id: a.id, label: a.label })), atalhoAtivo, id => { const a = atalhos.find(x => x.id === id); if (a) aplicarAtalho(a); }, 'Atalhos de período')
                ),
                erro ? React.createElement('p', { className: 'text-xs text-red-800 mt-2' }, '' + erro) : null
            ),

            // KPIs — faixa única (monetários + contagens)
            window.FinUI.kpis([
                { rotulo: 'Total solicitado', valor: er(kpis.totalSolicitado), sub: `${dados.length} saques` },
                { rotulo: 'Total pago', valor: er(kpis.totalPago), sub: 'após taxas' },
                { rotulo: 'Lucro (taxas 4,5%)', valor: er(kpis.lucro), tom: 'roxo', sub: `${filtrados.semGrat.length} saques` },
                { rotulo: 'Deixou de arrecadar', valor: er(kpis.deixouArrecadar), sub: `${filtrados.comGrat.length} com gratuidade` }
            ], { marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }),
            window.FinUI.kpis([
                { rotulo: 'Total', valor: dados.length.toLocaleString('pt-BR') },
                { rotulo: 'Aprovados', valor: filtrados.aprovados.length.toLocaleString('pt-BR') },
                { rotulo: 'Com gratuidade', valor: filtrados.comGrat.length.toLocaleString('pt-BR') },
                { rotulo: 'Rejeitados', valor: filtrados.rejeitados.length.toLocaleString('pt-BR'), tom: filtrados.rejeitados.length > 0 ? 'vermelho' : null },
                { rotulo: 'Pendentes', valor: filtrados.pendentes.length.toLocaleString('pt-BR'), tom: filtrados.pendentes.length > 0 ? 'ambar' : null }
            ], { borderTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }),

            // Comparativo (só se mês inteiro)
            ehMesInteiro && comparativo && React.createElement('div', { className: 'bg-white rounded-[14px] p-4 mb-4 border border-gray-200' },
                React.createElement('div', { className: 'flex items-center justify-between flex-wrap gap-2 mb-2' },
                    React.createElement('h2', { className: 'fin-sec-t' }, "Comparativo com mês anterior"),
                    React.createElement('span', { className: 'text-xs text-gray-500' },
                        formatarDataBR(formatarData(comparativo.mesAntIni)), ' a ', formatarDataBR(formatarData(comparativo.mesAntFim))
                    )
                ),
                React.createElement('div', { className: 'flex items-center gap-3 flex-wrap text-sm' },
                    React.createElement('span', { className: 'text-gray-500' }, 'Mês anterior: ', React.createElement('strong', { className: 'text-gray-900' }, er(comparativo.totalAnt))),
                    React.createElement('span', { className: 'text-gray-400' }, '→'),
                    React.createElement('span', { className: 'text-gray-500' }, 'Mês atual: ', React.createElement('strong', { className: 'text-gray-900' }, er(kpis.totalPago))),
                    React.createElement('span', {
                        className: 'px-3 py-1 rounded-full text-xs font-bold ' +
                            (variacao >= 0 ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'),
                    },
                        variacao >= 0 ? '↑' : '↓', ' ', Math.abs(variacao).toFixed(1), '%'
                    )
                )
            ),

            // Gráfico em linha (Recharts — interativo, animado, responsivo)
            // 2026-05 v3: usa window.Recharts (já carregado por CDN no index.html, mesma versão 2.12.7
            // usada pelo dashboard BI). Substituiu o SVG manual que era pequeno e estático.
            // Quando Recharts não estiver disponível (carregamento ainda em andamento), faz fallback
            // pra mensagem simples.
            (() => {
                const R = (typeof window !== 'undefined') && window.Recharts;
                // Dataset normalizado pro Recharts (array de objetos com labels prontos)
                const chartData = serie.pontos.map((pt) => {
                    const d = pt.inicio;
                    const dia = String(d.getDate()).padStart(2, '0');
                    const mes = String(d.getMonth() + 1).padStart(2, '0');
                    // Pra granularidade semanal, mostra range "DD/MM-DD/MM"; pra diária, "DD/MM"
                    const label = serie.tipo === 'semanal'
                        ? `${dia}/${mes}-${String(pt.fim.getDate()).padStart(2, '0')}/${String(pt.fim.getMonth() + 1).padStart(2, '0')}`
                        : `${dia}/${mes}`;
                    return {
                        label,
                        labelCompleto: formatarDataBR(formatarData(d)) +
                            (serie.tipo === 'semanal' ? ' a ' + formatarDataBR(formatarData(pt.fim)) : ''),
                        Solicitado: Math.round(pt.solicitado * 100) / 100,
                        Pago: Math.round(pt.pago * 100) / 100,
                        Lucro: Math.round(pt.lucro * 100) / 100,
                        qtd: pt.qtd,
                    };
                });

                // Custom tooltip — bonito e legível
                const CustomTooltip = ({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const dado = payload[0].payload;
                    return React.createElement('div', {
                        className: 'bg-white rounded-lg border border-gray-200 p-3 text-xs',
                        style: { minWidth: 200 },
                    },
                        React.createElement('p', { className: 'font-bold text-gray-900 mb-2 pb-2 border-b border-gray-100' }, dado.labelCompleto),
                        React.createElement('div', { className: 'space-y-1.5' },
                            React.createElement('div', { className: 'flex items-center justify-between gap-3' },
                                React.createElement('span', { className: 'flex items-center gap-1.5' },
                                    React.createElement('span', { style: { width: 10, height: 10, background: '#1e40af', borderRadius: 2, display: 'inline-block' } }),
                                    React.createElement('span', { className: 'text-gray-500' }, 'Solicitado')
                                ),
                                React.createElement('span', { className: 'font-bold text-gray-900' }, er(dado.Solicitado))
                            ),
                            React.createElement('div', { className: 'flex items-center justify-between gap-3' },
                                React.createElement('span', { className: 'flex items-center gap-1.5' },
                                    React.createElement('span', { style: { width: 10, height: 10, background: '#16a34a', borderRadius: 2, display: 'inline-block' } }),
                                    React.createElement('span', { className: 'text-gray-500' }, 'Pago')
                                ),
                                React.createElement('span', { className: 'font-bold text-gray-900' }, er(dado.Pago))
                            ),
                            React.createElement('div', { className: 'flex items-center justify-between gap-3' },
                                React.createElement('span', { className: 'flex items-center gap-1.5' },
                                    React.createElement('span', { style: { width: 10, height: 10, background: '#c084e6', borderRadius: 2, display: 'inline-block' } }),
                                    React.createElement('span', { className: 'text-gray-500' }, 'Lucro (taxas)')
                                ),
                                React.createElement('span', { className: 'font-bold text-gray-900' }, er(dado.Lucro))
                            ),
                            React.createElement('div', { className: 'flex items-center justify-between gap-3 pt-1.5 mt-1.5 border-t border-gray-100' },
                                React.createElement('span', { className: 'text-gray-500' }, 'Saques'),
                                React.createElement('span', { className: 'font-bold text-gray-900' }, dado.qtd.toLocaleString('pt-BR'))
                            )
                        )
                    );
                };

                // Format do eixo Y (R$ Xk pra valores grandes)
                const formatarEixoY = (v) => {
                    if (v >= 1000000) return 'R$ ' + (v / 1000000).toFixed(1) + 'M';
                    if (v >= 1000) return 'R$ ' + Math.round(v / 1000) + 'k';
                    return 'R$ ' + Math.round(v);
                };

                return React.createElement('div', { className: 'bg-white rounded-[14px] p-5 mb-4 border border-gray-200' },
                    React.createElement('div', { className: 'flex items-center justify-between mb-3 flex-wrap gap-2' },
                        React.createElement('div', null,
                            React.createElement('h2', { className: 'fin-sec-t' }, "Evolução do período"),
                            React.createElement('p', { className: 'text-xs text-gray-500 mt-0.5' },
                                'Granularidade ', serie.tipo === 'diario' ? 'diária' : 'semanal',
                                ' · ', serie.pontos.length, ' ponto(s)'
                            )
                        )
                    ),
                    // Sem dados ou Recharts ainda não disponível
                    serie.pontos.length === 0 || maxValor <= 0
                        ? React.createElement('p', { className: 'text-center text-gray-400 py-12 text-sm' }, 'Sem dados no período selecionado.')
                        : !R
                            ? React.createElement('p', { className: 'text-center text-gray-400 py-12 text-sm' }, 'Carregando gráfico…')
                            : React.createElement('div', { style: { width: '100%', height: '380px' } },
                                React.createElement(R.ResponsiveContainer, { width: '100%', height: '100%' },
                                    React.createElement(R.LineChart, {
                                        data: chartData,
                                        margin: { top: 20, right: 30, left: 10, bottom: 10 },
                                    },
                                        React.createElement(R.CartesianGrid, {
                                            strokeDasharray: '3 3',
                                            stroke: '#E5E7EB',
                                            vertical: false,
                                        }),
                                        React.createElement(R.XAxis, {
                                            dataKey: 'label',
                                            tick: { fontSize: 11, fill: '#6B7280' },
                                            tickLine: false,
                                            axisLine: { stroke: '#E5E7EB' },
                                            interval: 'preserveStartEnd',
                                            minTickGap: 30,
                                        }),
                                        React.createElement(R.YAxis, {
                                            tickFormatter: formatarEixoY,
                                            tick: { fontSize: 11, fill: '#6B7280' },
                                            tickLine: false,
                                            axisLine: { stroke: '#E5E7EB' },
                                            width: 65,
                                        }),
                                        React.createElement(R.Tooltip, {
                                            content: CustomTooltip,
                                            cursor: { stroke: '#9CA3AF', strokeWidth: 1, strokeDasharray: '4 4' },
                                        }),
                                        React.createElement(R.Legend, {
                                            verticalAlign: 'top',
                                            height: 36,
                                            iconType: 'plainline',
                                            wrapperStyle: { fontSize: 12, paddingBottom: 8 },
                                        }),
                                        React.createElement(R.Line, {
                                            type: 'monotone',
                                            dataKey: 'Solicitado',
                                            stroke: '#1e40af',
                                            strokeWidth: 2.5,
                                            dot: { r: 3, fill: '#1e40af', strokeWidth: 0 },
                                            activeDot: { r: 6, strokeWidth: 2, stroke: '#fff' },
                                            animationDuration: 800,
                                        }),
                                        React.createElement(R.Line, {
                                            type: 'monotone',
                                            dataKey: 'Pago',
                                            stroke: '#16a34a',
                                            strokeWidth: 2.5,
                                            dot: { r: 3, fill: '#16a34a', strokeWidth: 0 },
                                            activeDot: { r: 6, strokeWidth: 2, stroke: '#fff' },
                                            animationDuration: 800,
                                            animationBegin: 100,
                                        }),
                                        React.createElement(R.Line, {
                                            type: 'monotone',
                                            dataKey: 'Lucro',
                                            stroke: '#c084e6',
                                            strokeWidth: 2.5,
                                            strokeDasharray: '5 3',
                                            dot: { r: 3, fill: '#c084e6', strokeWidth: 0 },
                                            activeDot: { r: 6, strokeWidth: 2, stroke: '#fff' },
                                            animationDuration: 800,
                                            animationBegin: 200,
                                        })
                                    )
                                )
                            )
                );
            })(),

            // Top 10 - 2 colunas
            React.createElement('div', { className: 'grid md:grid-cols-2 gap-4 mb-4' },
                // Mais Solicitam
                React.createElement('div', { className: 'bg-white rounded-[14px] p-5 border border-gray-200' },
                    React.createElement('h2', { className: 'fin-sec-t mb-2' }, "Top 10 - Mais Solicitam Saques"),
                    tops.topSolicitam.length === 0
                        ? React.createElement('p', { className: 'text-gray-500 text-center py-4' }, 'Nenhum dado no período')
                        : React.createElement('div', { className: '' },
                            tops.topSolicitam.map((e, i) =>
                                React.createElement('div', {
                                    key: i,
                                    className: 'flex items-center justify-between py-2.5 ' + (i === 0 ? '' : 'border-t border-gray-100'),
                                },
                                    React.createElement('div', { className: 'flex items-center gap-2' },
                                        React.createElement('span', { className: 'font-bold text-gray-700 text-sm w-6' }, (i + 1) + 'º'),
                                        React.createElement('div', null,
                                            React.createElement('p', { className: 'font-semibold text-sm' }, e.nome || '-'),
                                            React.createElement('p', { className: 'text-xs text-gray-500' }, 'Cód: ', e.cod)
                                        )
                                    ),
                                    React.createElement('div', { className: 'text-right' },
                                        React.createElement('p', { className: 'font-semibold text-gray-900 tabular-nums' }, er(e.valor)),
                                        React.createElement('p', { className: 'text-xs text-gray-500' }, e.qtd, ' saques'),
                                        React.createElement('p', { className: 'text-xs text-green-800' }, 'Lucro: ', er(e.lucro))
                                    )
                                )
                            )
                        )
                ),
                // Com Gratuidade
                React.createElement('div', { className: 'bg-white rounded-[14px] p-5 border border-gray-200' },
                    React.createElement('h2', { className: 'fin-sec-t mb-2' }, "Top 10 - Saques com Gratuidade"),
                    tops.topGratuidade.length === 0
                        ? React.createElement('p', { className: 'text-gray-500 text-center py-4' }, 'Nenhum dado no período')
                        : React.createElement('div', { className: '' },
                            tops.topGratuidade.map((e, i) =>
                                React.createElement('div', {
                                    key: i,
                                    className: 'flex items-center justify-between py-2.5 ' + (i === 0 ? '' : 'border-t border-gray-100'),
                                },
                                    React.createElement('div', { className: 'flex items-center gap-2' },
                                        React.createElement('span', { className: 'font-bold text-gray-700 text-sm w-6' }, (i + 1) + 'º'),
                                        React.createElement('div', null,
                                            React.createElement('p', { className: 'font-semibold text-sm' }, e.nome || '-'),
                                            React.createElement('p', { className: 'text-xs text-gray-500' }, 'Cód: ', e.cod)
                                        )
                                    ),
                                    React.createElement('div', { className: 'text-right' },
                                        React.createElement('p', { className: 'font-semibold text-gray-900 tabular-nums' }, er(e.valor)),
                                        React.createElement('p', { className: 'text-xs text-gray-500' }, e.qtd, ' saques'),
                                        React.createElement('p', { className: 'text-xs text-red-800' }, 'Deixou: ', er(e.deixouArrecadar))
                                    )
                                )
                            )
                        )
                )
            )
        );

        // Helpers internos de render
        function kpiCard(label, valor, sub, corClass) {
            return React.createElement('div', { className: 'bg-white rounded-[14px] p-4 border border-gray-200' },
                React.createElement('p', { className: 'text-sm text-gray-500' }, label),
                React.createElement('p', { className: 'text-2xl font-bold ' + corClass }, valor),
                React.createElement('p', { className: 'text-xs text-gray-500 mt-1' }, sub)
            );
        }
        function kpiContagem(valor, label, corClass) {
            return React.createElement('div', { className: 'bg-white rounded-[14px] p-3 text-center border border-gray-200' },
                React.createElement('p', { className: 'text-2xl font-bold ' + corClass }, valor.toLocaleString('pt-BR')),
                React.createElement('p', { className: 'text-xs text-gray-500' }, label)
            );
        }
        function legendaItem(cor, label) {
            return React.createElement('span', { className: 'flex items-center gap-1.5' },
                React.createElement('span', {
                    style: { width: 10, height: 10, background: cor, borderRadius: 2, display: 'inline-block' },
                }),
                label
            );
        }
    }
    // Expõe globalmente pra ser usado no IIFE da aba "relatorios"
    window.__RelatoriosFinanceiroV2 = RelatoriosFinanceiroV2;

    window.renderModuloFinanceiro = function(props) {
        const {
            c, s, p, x, q, U, Q, H, Z, Y, K, X, z, B, V, J,
            A, S, j, C, k, P, T, D, L, I, F, $, M, O, G, W,
            ee, te, ae, le, re, oe, ce, se, ne, me,
            // Planilha de profissionais com cidades (NOVO)
            planilhaProfissionais, cidadesIndicacao,
            Me, Oe, qe, Ue, ze, Be,
            Ke, Xe, Ze, Ye, et, tt, at, lt, it, dt, ut, gt, bt, Rt,
            nt, mt, rt, ot, pt, xt, ct, st, Qe, He, Ge, We,
            plificState, setPlificState, modalDebitoPlific, setModalDebitoPlific,
            debitoFormPlific, setDebitoFormPlific, saldoPlificUser, setSaldoPlificUser,
            solicitacoesPagina, setSolicitacoesPagina, conciliacaoPagina, setConciliacaoPagina,
            solicitacoesPorPagina, conciliacaoPorPagina, acertoRealizado, setAcertoRealizado,
            // Proteção contra débito duplicado
            processandoWithdrawals, setProcessandoWithdrawals,
            // Validação server-side
            validacaoData, setValidacaoData, validacaoLoading, setValidacaoLoading, carregarValidacao,
            // Conciliação server-side
            conciliacaoData, setConciliacaoData, conciliacaoLoading, setConciliacaoLoading, carregarConciliacao,
            // Resumo server-side
            resumoData, setResumoData, resumoLoading, setResumoLoading, carregarResumo,
            // Cadastro indicados (API Tutts prof-status)
            cadastroIndicados, setCadastroIndicados, cadastroIndicadosLoading, verificarCadastrosIndicados,
            // ⚡ Contadores do backend
            withdrawalCounts,
            l, Ee, he, o, f, E, e,
            er, ja, ul, fetchAuth, API_URL, navegarSidebar,
            HeaderCompacto, Toast, LoadingOverlay, PixQRCodeModal, i, n,
            elegibilidadeNovatos, setElegibilidadeNovatos, regioesNovatos, setRegioesNovatos,
            clientesBINovatos, setClientesBINovatos, clientesSelecionados, setClientesSelecionados,
            carregandoClientes, carregarClientesPorRegiao,
            socialProfile, relatorioNaoLido, setRelatorioNaoLido,
            relatorioImagemAmpliada, setRelatorioImagemAmpliada,
            relatoriosNaoLidos, setRelatoriosNaoLidos, marcarRelatorioComoLido,
            todoNotifModal, setTodoNotifModal, todoPendentesNotif,
            Ua, za, Ba, Va, Ja, Qa, Ha, Ga, Wa, Za, Ya, Ka, gl, vl, wl, _l, Cl,
            Rl, El, hl, fl, Nl, yl, bl, Jl, Hl, Gl, Ml, Ol, Sl, Tl, Fl, Pl,
            lancarDebitoPlific,
            consultarSaldoPlific,
            consultarSaldosLotePlific,
            exportarSaldosCSVPlific,
            fe, Ne, ye, ve, we, _e, je, Ce, Ae, Se, ke, Pe, Te, De, Le, Ie, Fe, $e,
            y, v, w, _
        } = props;
        
        // Helper para obter cidade do profissional logado (NOVO)
        const getCidadeProfissional = (codProfissional) => {
            if (!planilhaProfissionais || planilhaProfissionais.length === 0 || !codProfissional) return null;
            const prof = planilhaProfissionais.find(p => p.codigo === String(codProfissional));
            return prof ? prof.cidade : null;
        };
        
        // Cidade do usuário logado (para motoboys)
        const cidadeUsuarioLogado = l && l.role === "user" && (l.cod_profissional || l.codProfissional)
            ? getCidadeProfissional(l.cod_profissional || l.codProfissional) 
            : null;
        
        // ⚡ Contadores do backend (precisos, sem carregar todos os registros)
        const wc = withdrawalCounts || {};
        
        // Referência local para traduzir erros Stark
        const traduzirErroStarkFE = window.traduzirErroStarkFE;
        
        // Normalizar string para comparação (remove acentos, lowercase, trim)
        const normalizarTexto = (texto) => {
            if (!texto) return "";
            return texto.toString().toLowerCase().trim()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        };
        
        // Filtrar promoções para mostrar apenas da região do motoboy (se for user)
        // Compara de forma flexível: a região da promoção deve conter a cidade do usuário
        const promocoesFiltradas = l && l.role === "user" && cidadeUsuarioLogado
            ? ee.filter(promo => {
                if (!promo.regiao) return false;
                const regiaoNorm = normalizarTexto(promo.regiao);
                const cidadeNorm = normalizarTexto(cidadeUsuarioLogado);
                // Match exato OU região contém a cidade OU cidade contém a região
                return regiaoNorm === cidadeNorm || 
                       regiaoNorm.includes(cidadeNorm) || 
                       cidadeNorm.includes(regiaoNorm);
            })
            : ee;
        
        // Debug - remover depois
        if (l && l.role === "user") {
            console.log("🔍 [DEBUG Indicações] Usuário:", l.cod_profissional || l.codProfissional);
            console.log("🔍 [DEBUG Indicações] Cidade do usuário:", cidadeUsuarioLogado);
            console.log("🔍 [DEBUG Indicações] Total promoções:", ee.length);
            console.log("🔍 [DEBUG Indicações] Promoções filtradas:", promocoesFiltradas.length);
            console.log("🔍 [DEBUG Indicações] Planilha carregada:", planilhaProfissionais?.length || 0, "profissionais");
        }
        
        // ========== FUNÇÃO EXPORTAR VALIDAÇÃO EXCEL ==========
        const exportarValidacaoExcel = () => {
            const tipoFiltro = p.validacaoTipo || "solicitacao";
            const dataInicio = p.validacaoDataInicio;
            const dataFim = p.validacaoDataFim;
            
            // Aplicar os mesmos filtros da visualização
            const dadosFiltrados = q.filter(item => {
                if (!dataInicio && !dataFim) return true;
                let dataComparacao;
                const toLocalDate = (dt) => { const d = new Date(dt); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); };
                if (tipoFiltro === "solicitacao") {
                    if (!item.created_at) return false;
                    dataComparacao = toLocalDate(item.created_at);
                } else if (tipoFiltro === "lancamento") {
                    if (!item.lancamento_at) return false;
                    dataComparacao = toLocalDate(item.lancamento_at);
                } else {
                    if (!item.debito_plific_at) return false;
                    dataComparacao = toLocalDate(item.debito_plific_at);
                }
                if (dataInicio && dataFim) return dataComparacao >= dataInicio && dataComparacao <= dataFim;
                if (dataInicio) return dataComparacao >= dataInicio;
                return dataComparacao <= dataFim;
            });
            
            if (dadosFiltrados.length === 0) {
                ja("Nenhum dado encontrado com os filtros selecionados", "warning");
                return;
            }
            
            const formatarDataExcel = (dataISO) => {
                if (!dataISO) return "-";
                const dt = new Date(dataISO);
                return dt.toLocaleDateString("pt-BR") + " " + dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            };
            
            const formatarValorExcel = (valor) => parseFloat(valor || 0).toFixed(2).replace(".", ",");
            
            const traduzirStatus = (status) => {
                const map = { "aprovado": "Aprovado", "aprovado_gratuidade": "Aprovado c/ Gratuidade", "rejeitado": "Rejeitado", "aguardando_aprovacao": "Aguardando", "aguardando_pagamento_stark": "Aguard. Pgto Stark", "pago_stark": "PAGO VIA STARK BANK" };
                // Sobrescrever com status Stark se existir
                if (e && e.stark_status === 'em_lote') return "Lote Gerado - Aguard. Pagamento";
                if (e && e.stark_status === 'processando') return "Processando Pix";
                if (e && e.stark_status === 'pago') return "PAGO VIA STARK BANK";
                return map[status] || status || "-";
            };
            
            const traduzirTipoFiltro = (tipo) => {
                const map = { "solicitacao": "Data da Solicitação", "lancamento": "Data de Lançamento", "debito": "Data do Débito" };
                return map[tipo] || tipo;
            };
            
            // Estatísticas
            const totalAprovadas = dadosFiltrados.filter(e => e.status === "aprovado" || e.status === "aprovado_gratuidade" || e.status === "pago_stark").length;
            const totalSemGrat = dadosFiltrados.filter(e => e.status === "aprovado").length;
            const totalComGrat = dadosFiltrados.filter(e => e.status === "aprovado_gratuidade").length;
            const totalRejeitadas = dadosFiltrados.filter(e => e.status === "rejeitado").length;
            const valorTotal = dadosFiltrados.filter(e => e.status?.includes("aprovado") || e.status === "pago_stark").reduce((a, e) => a + parseFloat(e.requested_amount || 0), 0);
            
            // Construir dados Excel
            const dadosExcel = [];
            dadosExcel.push(["RELATÓRIO DE VALIDAÇÃO - TUTTS"]);
            dadosExcel.push(["Gerado em:", new Date().toLocaleString("pt-BR")]);
            dadosExcel.push(["Filtro:", traduzirTipoFiltro(tipoFiltro)]);
            
            if (dataInicio && dataFim && dataInicio === dataFim) {
                dadosExcel.push(["Período:", new Date(dataInicio + "T12:00:00").toLocaleDateString("pt-BR")]);
            } else if (dataInicio && dataFim) {
                dadosExcel.push(["Período:", new Date(dataInicio + "T12:00:00").toLocaleDateString("pt-BR") + " até " + new Date(dataFim + "T12:00:00").toLocaleDateString("pt-BR")]);
            } else {
                dadosExcel.push(["Período:", "Todos"]);
            }
            
            dadosExcel.push([]);
            dadosExcel.push(["=== RESUMO ==="]);
            dadosExcel.push(["Total Registros:", dadosFiltrados.length]);
            dadosExcel.push(["Total Aprovadas:", totalAprovadas]);
            dadosExcel.push(["Sem Gratuidade:", totalSemGrat]);
            dadosExcel.push(["Com Gratuidade:", totalComGrat]);
            dadosExcel.push(["Rejeitadas:", totalRejeitadas]);
            dadosExcel.push(["Valor Total Aprovado:", "R$ " + formatarValorExcel(valorTotal)]);
            dadosExcel.push(["Taxa (4.5%):", "R$ " + formatarValorExcel(valorTotal * 0.045)]);
            dadosExcel.push([]);
            dadosExcel.push([]);
            
            // Cabeçalho tabela
            dadosExcel.push(["ID", "Código", "Nome", "CPF", "Data Solicitação", "Data Aprovação", "Data Lançamento", "Data Débito", "Vencimento MAP", "Dom. Anterior", "Valor Solicitado", "Valor Final", "Taxa", "Status", "Gratuidade", "OMIE"]);
            
            // Dados
            dadosFiltrados.forEach(item => {
                const valSolic = parseFloat(item.requested_amount || 0);
                dadosExcel.push([
                    item.id || "-",
                    item.user_cod || "-",
                    item.user_name || "-",
                    item.cpf || "-",
                    formatarDataExcel(item.created_at),
                    formatarDataExcel(item.approved_at),
                    formatarDataExcel(item.lancamento_at),
                    formatarDataExcel(item.debito_plific_at),
                    item.vencimento_map ? (String(item.vencimento_map).slice(8,10) + "/" + String(item.vencimento_map).slice(5,7) + "/" + String(item.vencimento_map).slice(0,4)) : "-",
                    item.vencimento_retroativo ? "Sim" : "Não",
                    valSolic,
                    parseFloat(item.final_amount || 0),
                    valSolic * 0.045,
                    traduzirStatus(item.status),
                    item.has_gratuity ? "Sim" : "Não",
                    item.conciliacao_omie ? "Sim" : "Não"
                ]);
            });
            
            // Criar e baixar Excel
            const ws = XLSX.utils.aoa_to_sheet(dadosExcel);
            ws["!cols"] = [{ wch: 8 }, { wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 13 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 22 }, { wch: 12 }, { wch: 10 }]; /* VENC_MAP_V2 +2 cols */
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Validação");
            const nomeArquivo = "Validacao_" + tipoFiltro + "_" + new Date().toISOString().split("T")[0].replace(/-/g, "") + ".xlsx";
            XLSX.writeFile(wb, nomeArquivo);
            ja("Exportação concluída: " + dadosFiltrados.length + " registros", "success");
        };
        // ========== FIM FUNÇÃO EXPORTAR ==========
        
            return React.createElement("div", {
                className: "min-h-screen bg-gray-50"
            }, i && React.createElement(Toast, i), n && React.createElement(LoadingOverlay, null), 
            // Modal de Relatório Não Lido (ciência)
            relatorioNaoLido && React.createElement("div", {
                className: "fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4"
            },
                React.createElement("div", {className: "bg-white rounded-[14px] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in border border-gray-200"},
                    // Header
                    React.createElement("div", {className: "p-4 flex items-center gap-3 bg-white text-gray-900 border-b border-gray-200"},
                        React.createElement("svg", { className: "ico", style: { width: 30, height: 30 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-bell" })),
                        React.createElement("div", null,
                            React.createElement("h3", {className: "text-lg font-bold"}, "Novo Relatório Diário"),
                            React.createElement("p", {className: "text-gray-500 text-sm"}, 
                                relatoriosNaoLidos.length > 1 
                                    ? `${relatoriosNaoLidos.length} relatórios pendentes de leitura`
                                    : "1 relatório pendente de leitura"
                            )
                        )
                    ),
                    // Info do autor
                    React.createElement("div", {className: "p-4 bg-gray-50 border-b flex items-center gap-3"},
                        relatorioNaoLido.usuario_foto 
                            ? React.createElement("img", {
                                src: relatorioNaoLido.usuario_foto,
                                className: "w-12 h-12 rounded-full object-cover border-2 border-green-200"
                            })
                            : React.createElement("div", {
                                className: "w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-800 font-bold text-lg"
                            }, (relatorioNaoLido.usuario_nome || "?").charAt(0).toUpperCase()),
                        React.createElement("div", null,
                            React.createElement("p", {className: "font-bold text-gray-900"}, relatorioNaoLido.titulo),
                            React.createElement("p", {className: "text-sm text-gray-500"}, 
                                relatorioNaoLido.usuario_nome, " • ", 
                                new Date(relatorioNaoLido.created_at).toLocaleDateString('pt-BR', {
                                    day: '2-digit', month: '2-digit', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                })
                            )
                        )
                    ),
                    // Conteúdo
                    React.createElement("div", {className: "p-4 overflow-y-auto flex-1"},
                        React.createElement("div", {
                            className: "text-gray-700 whitespace-pre-wrap",
                            dangerouslySetInnerHTML: { __html: (relatorioNaoLido.conteudo || '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/_(.*?)_/g, '<em>$1</em>') }
                        }),
                        relatorioNaoLido.imagem_url && React.createElement("div", {className: "mt-4"},
                            React.createElement("img", {
                                src: relatorioNaoLido.imagem_url,
                                className: "max-w-full rounded-lg cursor-pointer hover:opacity-90",
                                onClick: () => setRelatorioImagemAmpliada(relatorioNaoLido.imagem_url)
                            })
                        )
                    ),
                    // Footer com botão de ciência
                    React.createElement("div", {className: "p-4 bg-gray-50 border-t"},
                        React.createElement("button", {
                            onClick: () => marcarRelatorioComoLido(relatorioNaoLido.id),
                            className: "fin-btn fin-btn-p w-full"
                        }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), "Estou Ciente"))
                    )
                )
            ),
            // Modal de imagem ampliada (relatório)
            relatorioImagemAmpliada && React.createElement("div", {
                className: "fixed inset-0 bg-black/90 flex items-center justify-center z-[110] p-4",
                onClick: () => setRelatorioImagemAmpliada(null)
            },
                React.createElement("div", {className: "relative max-w-4xl max-h-[90vh]"},
                    React.createElement("button", {
                        onClick: () => setRelatorioImagemAmpliada(null),
                        className: "absolute -top-10 right-0 text-white text-3xl hover:text-gray-300"
                    }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" }))),
                    React.createElement("img", {
                        src: relatorioImagemAmpliada,
                        className: "max-w-full max-h-[85vh] rounded-lg",
                        onClick: (e) => e.stopPropagation()
                    })
                )
            ),
            V && React.createElement(PixQRCodeModal, {
                withdrawal: V,
                onClose: () => J(null),
                showToast: ja
            }), 
            // Modal de notificação de tarefas pendentes
            todoNotifModal && todoPendentesNotif.length > 0 && React.createElement("div", {
                className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            }, React.createElement("div", {
                className: "bg-white rounded-[14px] w-full max-w-md overflow-hidden border border-gray-200"
            }, React.createElement("div", {
                className: "p-4 bg-white text-gray-900 border-b border-gray-200"
            }, React.createElement("h2", {className: "text-xl font-bold flex items-center gap-2"}, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#d97706" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-alert" })), "Atenção!")),
                React.createElement("p", {className: "text-gray-500 text-sm"}, "Você possui tarefas pendentes")
            ), React.createElement("div", {className: "p-4 max-h-60 overflow-y-auto"},
                React.createElement("p", {className: "text-gray-500 mb-3"}, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clipboard" })), todoPendentesNotif.length, " tarefa(s) precisam da sua atenção:"),
                React.createElement("div", {className: "space-y-2"},
                    todoPendentesNotif.slice(0, 5).map(t => React.createElement("div", {
                        key: t.id,
                        className: "bg-amber-50 p-3 rounded"
                    }, React.createElement("p", {className: "font-semibold text-gray-900"}, t.titulo),
                        t.data_prazo && React.createElement("p", {className: "text-xs text-amber-800"}, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-calendar" })), "Vence: "), new Date(t.data_prazo).toLocaleDateString("pt-BR"))
                    ))
                ),
                todoPendentesNotif.length > 5 && React.createElement("p", {className: "text-sm text-gray-500 mt-2"}, "... e mais ", todoPendentesNotif.length - 5, " tarefa(s)")
            ), React.createElement("div", {className: "flex gap-3 p-4 border-t"},
                React.createElement("button", {
                    onClick: () => setTodoNotifModal(false),
                    className: "fin-btn fin-btn-s flex-1"
                }, "Fechar"),
                React.createElement("button", {
                    onClick: () => { setTodoNotifModal(false); he("todo"); },
                    className: "fin-btn fin-btn-p flex-1"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clipboard" })), "Ir para Tarefas"))
            ))),
            // ========== HEADER COM NAVEGAÇÃO - FINANCEIRO ==========
            React.createElement(HeaderCompacto, {
                usuario: l,
                moduloAtivo: Ee,
                abaAtiva: p.finTab || "home-fin",
                socialProfile: socialProfile,
                isLoading: f,
                lastUpdate: E,
                onRefresh: ul,
                onLogout: () => o(null),
                onGoHome: () => he("home"),
                onNavigate: navegarSidebar,
                onChangeTab: (abaId) => x({...p, finTab: abaId})
            }),
            p.deleteConfirm && React.createElement("div", {
                className: "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            }, React.createElement("div", {
                className: "bg-white rounded-[14px] p-6 max-w-md w-full border border-gray-200"
            }, React.createElement("h3", {
                className: "text-xl font-bold text-red-800 mb-4"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#d97706" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-alert" })), "Confirmar Exclusão")), React.createElement("p", {
                className: "text-gray-700 mb-2"
            }, "Tem certeza que deseja excluir esta solicitação?"), React.createElement("div", {
                className: "bg-gray-50 rounded-lg p-4 mb-4"
            }, React.createElement("p", {
                className: "text-sm"
            }, React.createElement("strong", null, "Profissional:"), " ", p.deleteConfirm.user_name), React.createElement("p", {
                className: "text-sm"
            }, React.createElement("strong", null, "Código:"), " ", p.deleteConfirm.user_cod), React.createElement("p", {
                className: "text-sm"
            }, React.createElement("strong", null, "Valor:"), " ", er(p.deleteConfirm.requested_amount)), React.createElement("p", {
                className: "text-sm"
            }, React.createElement("strong", null, "Data:"), " ", new Date(p.deleteConfirm.created_at).toLocaleString("pt-BR"))),
            // 🆕 2026-04-30: Alerta especial pra status protegidos (force-delete)
            (() => {
                const e = p.deleteConfirm;
                const protegido = e.status === "pago_stark" || e.status === "processando" || e.status === "aguardando_pagamento_stark" || e.stark_status === "processando" || e.stark_status === "pago";
                if (!protegido) return null;
                return React.createElement("div", {
                    className: "bg-red-50 border-2 border-red-200 rounded-lg p-3 mb-4"
                },
                    React.createElement("p", {
                        className: "text-red-800 font-bold text-sm mb-1"
                    }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#d97706" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-alert" })), "ATENÇÃO — Saque em processamento")),
                    React.createElement("p", {
                        className: "text-red-800 text-xs leading-relaxed"
                    },
                        "Status: ", React.createElement("strong", null, e.status),
                        e.debito ? React.createElement(React.Fragment, null, " — ", React.createElement("strong", null, "débito Plific JÁ FOI FEITO")) : null,
                        ". Excluir este saque NÃO devolve o dinheiro pro motoboy automaticamente. Você precisa estornar manualmente depois."
                    )
                );
            })(),
            React.createElement("p", {
                className: "text-red-800 text-sm mb-4 font-semibold"
            }, "Esta ação não pode ser desfeita!"), React.createElement("div", {
                className: "flex gap-3"
            }, React.createElement("button", {
                onClick: () => x({
                    ...p,
                    deleteConfirm: null
                }),
                className: "fin-btn fin-btn-s flex-1"
            }, "Cancelar"), React.createElement("button", {
                onClick: () => (async e => {
                    // 🐛 FIX 2026-04-30: o código antigo era "otimista" — removia da UI ANTES
                    // de a API responder e mostrava toast "Excluída!" mesmo quando o backend
                    // rejeitava (saques em processamento têm exclusão bloqueada por segurança).
                    // Resultado: motoboy via "excluída", mas no F5 voltava porque nunca deletou.
                    // Agora: aguarda response, valida response.ok, mostra erro real do backend.
                    console.log('[DELETE] iniciando exclusão saque #' + e);
                    try {
                        const resp = await fetchAuth(`${API_URL}/withdrawals/${e}`, {
                            method: "DELETE"
                        });
                        const respBody = await resp.json().catch(() => ({}));
                        console.log('[DELETE] response status=' + resp.status + ', body=', respBody);
                        if (!resp.ok) {
                            const msg = respBody.motivo || respBody.error || `Erro ao excluir (HTTP ${resp.status})`;
                            ja("" + msg, "error");
                            x({ ...p, deleteConfirm: null });
                            return;
                        }
                        // Sucesso confirmado pelo backend (status 200, body { success: true })
                        if (!respBody.success) {
                            console.warn('[DELETE] backend retornou 200 mas success=false:', respBody);
                            ja("Resposta inesperada do servidor — recarregando", "error");
                            x({ ...p, deleteConfirm: null });
                            Ua();
                            return;
                        }
                        const idRemover = e;
                        U(prev => prev.filter(w => w.id !== idRemover));
                        x({ ...p, deleteConfirm: null });
                        ja(respBody.forcado ? "Excluída (forçada)!" : "Solicitação excluída!", "success");
                        console.log('[DELETE] sucesso saque #' + e + (respBody.forcado ? ' (FORÇADO)' : ''));
                    } catch (err) {
                        console.error('[DELETE] exception:', err);
                        ja("Erro ao excluir: " + (err.message || "rede indisponível"), "error");
                        x({ ...p, deleteConfirm: null });
                        Ua(); // recarrega lista pra estado consistente
                    }
                })(p.deleteConfirm.id),
                className: "fin-btn fin-btn-d flex-1"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-trash" })), "Excluir"))))), 
            
            // =============================================
            // HOME FINANCEIRO — FIN_ABAS_V1: mesmo padrão do Início da Central
            // (título, faixa "Pendências" e tiles brancos agrupados por assunto).
            // onClick de cada tile é idêntico ao card antigo; sem gates novos.
            // =============================================
            ("home-fin" === p.finTab || !p.finTab) && (() => {
                const icoH = (nome, px) => React.createElement("svg", { className: "ico", style: { width: px || 16, height: px || 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-" + nome }));
                const irValidacao = () => {
                    const now = new Date();
                    const hoje = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");
                    x({...p, finTab: "validacao", validacaoDataInicio: hoje, validacaoDataFim: hoje});
                    carregarValidacao(p.validacaoTipo || "solicitacao", hoje, hoje);
                };
                const tile = (key, onClick, icone, titulo, desc, badge) => React.createElement("button", {
                    key: key, type: "button", onClick: onClick,
                    className: "text-left bg-white border border-gray-200 hover:border-[#c084e6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#770fa8] focus-visible:ring-offset-1 transition-colors",
                    style: { borderRadius: 14, padding: 14, display: "flex", gap: 12, alignItems: "center", minWidth: 0, color: "#111827" }
                },
                    React.createElement("span", { style: { width: 38, height: 38, borderRadius: 10, background: "#faf7fd", color: "#770fa8", display: "grid", placeItems: "center", flex: "none" } }, icoH(icone, 18)),
                    React.createElement("span", { style: { minWidth: 0, flex: 1 } },
                        React.createElement("span", { style: { display: "block", fontWeight: 600, fontSize: 13.5 } }, titulo),
                        React.createElement("span", { style: { display: "block", fontSize: 12, color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, title: desc }, desc)),
                    badge > 0 && React.createElement("span", {
                        style: { flex: "none", minWidth: 22, height: 20, padding: "0 6px", borderRadius: 99, background: "#f3e8fb", color: "#5d0b85", fontSize: 11, fontWeight: 700, display: "grid", placeItems: "center", fontVariantNumeric: "tabular-nums" },
                        "aria-label": badge + " pendente(s)"
                    }, badge > 9 ? "9+" : badge)
                );
                const secao = (nome, tiles) => React.createElement("section", { key: nome, style: { display: "flex", flexDirection: "column", gap: 10 } },
                    React.createElement("h2", { style: { margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "#6b7280" } }, nome),
                    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 } }, tiles));
                const pend = [
                    { key: "saq", rotulo: "Saques pendentes", n: y.solicitacoes || 0, cor: "#d97706", ir: () => { x({...p, finTab: "solicitacoes"}); } },
                    { key: "val", rotulo: "Ajustes p/ validar", n: y.validacao || 0, cor: "#2563eb", ir: irValidacao },
                    { key: "gra", rotulo: "Gratuidades pendentes", n: y.gratuidades || 0, cor: "#770fa8", ir: () => { x({...p, finTab: "gratuidades"}); } },
                    { key: "loj", rotulo: "Pedidos Loja", n: y.loja || 0, cor: "#16a34a", ir: () => { x({...p, finTab: "loja"}); } }
                ];
                return React.createElement("main", {
                    style: { padding: "32px 24px", maxWidth: 1280 /* FIN_MARGEM_V1 */, width: "100%", boxSizing: "border-box", margin: "0 auto", display: "flex", flexDirection: "column", gap: 28, color: "#111827", fontSize: 13 },
                    className: "sm:px-6"
                },
                    React.createElement("div", null,
                        React.createElement("h1", { className: "fin-page-t" }, "Financeiro"),
                        React.createElement("p", { className: "fin-page-s" }, "Saques, acertos, benefícios e controle dos profissionais")),
                    // Pendências
                    React.createElement("section", { style: { display: "flex", flexDirection: "column", gap: 10 }, "aria-label": "Pendências" },
                        React.createElement("h2", { className: "fin-sec-t" }, "Pendências"),
                        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 } },
                            pend.map(c => React.createElement("button", {
                                key: c.key, type: "button", onClick: c.ir,
                                className: "text-left bg-white border border-gray-200 hover:border-[#c084e6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#770fa8] focus-visible:ring-offset-1 transition-colors",
                                style: { borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 6, color: "#111827" }
                            },
                                React.createElement("span", { style: { display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#6b7280" } },
                                    React.createElement("span", { style: { width: 8, height: 8, borderRadius: 99, background: c.cor, flex: "none" } }), c.rotulo),
                                React.createElement("span", { style: { fontFamily: "Sora, Inter, sans-serif", fontSize: 26, fontWeight: 700, lineHeight: 1.15, fontVariantNumeric: "tabular-nums", color: c.n > 0 ? "#111827" : "#9ca3af" } }, Number(c.n).toLocaleString("pt-BR"))
                            )))),
                    secao("Saques", [
                        tile("solicitacoes", () => { x({...p, finTab: "solicitacoes"}); }, "clipboard", "Solicitações", "Saques emergenciais pendentes de aprovação e histórico completo.", y.solicitacoes),
                        tile("limites", () => { x({...p, finTab: "limites"}); }, "lock", "Limites", "Solicitações de liberação de limite de saque.", y.limites_pendentes),
                        tile("stark", function() { x({...p, finTab: "stark-bank"}); }, "building", "Pix Stark", "Pagamento automático via Stark Bank."),
                        tile("validacao", irValidacao, "check", "Validação", "Aprovação de ajustes de OS e retornos enviados pelos entregadores.", y.validacao),
                        tile("conciliacao", () => { x({...p, finTab: "conciliacao"}); }, "refresh", "Conciliação", "Marcar saques como efetivamente pagos e controle de pagamentos."),
                        tile("resumo", () => { x({...p, finTab: "resumo"}); }, "filetext", "Resumo", "Busca detalhada por profissional com histórico completo de saques.")
                    ]),
                    secao("Acertos", [
                        tile("acerto-prof", function() { x({...p, finTab: "acerto-prof"}); }, "wallet", "Acerto Prof", "Upload de planilha de faturamento e pagamento via Stark Bank."),
                        tile("conciliacao-acerto", function() { x({...p, finTab: "conciliacao-acerto"}); }, "chart", "Conc. Acerto", "Conciliação e acompanhamento dos acertos profissionais."),
                        tile("saldo-plific", function() { x({...p, finTab: "saldo-plific"}); }, "card", "Saldo Plific", "Consultar saldos dos profissionais.")
                    ]),
                    secao("Benefícios", [
                        tile("gratuidades", () => { x({...p, finTab: "gratuidades"}); }, "gift", "Gratuidades", "Gerenciar saques gratuitos como premiações e bonificações.", y.gratuidades),
                        tile("indicacoes", () => { x({...p, finTab: "indicacoes"}); if (ae && ae.length > 0) verificarCadastrosIndicados(ae); }, "users", "Indicações", "Programa de indicação de novos profissionais e bonificações."),
                        tile("promo-novatos", () => { x({...p, finTab: "promo-novatos"}); }, "rocket", "Promo Novatos", "Promoções e campanhas especiais para novos entregadores."),
                        tile("loja", () => { x({...p, finTab: "loja"}); }, "package", "Loja", "Lojinha Tutts com produtos, pedidos e gestão de estoque.", y.loja),
                        tile("comissao", () => { x({...p, finTab: "comissao"}); }, "wallet", "Comissão", "Comissão dos vendedores por cliente e competência, com faixas pela data de início.")
                    ]),
                    secao("Controle", [
                        tile("sinistros", () => { x({...p, finTab: "sinistros"}); }, "alert", "Sinistros", "Apuração de avarias e extravios: tratativa com o cliente e com o entregador."),
                        tile("restritos", () => { x({...p, finTab: "restritos"}); }, "ban", "Restritos", "Profissionais bloqueados de realizar saques emergenciais."),
                        tile("relatorios", () => { x({...p, finTab: "relatorios"}); }, "trendup", "Relatórios", "Relatórios gerenciais e exportação de dados financeiros."),
                        tile("avisos", () => { x({...p, finTab: "avisos"}); }, "bell", "Avisos", "Comunicados e avisos para os profissionais no app."),
                        tile("horarios", () => { x({...p, finTab: "horarios"}); }, "settings", "Configurações", "Toggles de saque, horários de atendimento e regras gerais."),
                        tile("backup", () => { x({...p, finTab: "backup"}); }, "save", "Backup", "Exportar e fazer backup dos dados do sistema.")
                    ])
                );
            })(),
            
            React.createElement("div", {
                className: "max-w-7xl mx-auto px-4 py-6 sm:px-6" /* FIN_ABAS_V1: gutter 16px no celular */
            }, ("solicitacoes" === p.finTab) && (window.SolicitacoesV2 ? React.createElement(window.SolicitacoesV2, {
                // 🆕 V2 SOLICITACOES (2026-04-30 - refator visual completo)
                // Backup do código antigo: ModuloFinanceiro.solicitacoes.OLD.js
                q, U, p, x, z, B,
                solicitacoesPagina, setSolicitacoesPagina, solicitacoesPorPagina,
                Jl, er, ja,
                acertoRealizado, setAcertoRealizado,
                traduzirErroStarkFE,
                fetchAuth, API_URL,
                abrirQRPix: J, // setter do state V — abre o PixQRCodeModal renderizado pelo parent
                withdrawalCounts: wc, // 🔧 contadores agregados pros badges (Todas/Aprovadas/etc)
            }) : React.createElement("div", {
                style: { padding: 32, textAlign: "center", color: "#991B1B", background: "#fef2f2", border: "1px solid #FECACA", borderRadius: 8 }
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#d97706" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-alert" })), "Componente SolicitacoesV2 não foi carregado. Verifique se ModuloFinanceiroSolicitacoesV2.js está no index.html antes do ModuloFinanceiro.js.")))
            , "limites" === p.finTab && window.LimitesComponent && React.createElement(window.LimitesComponent, {
                fetchAuth: fetchAuth, API_URL: API_URL, ja: ja, er: er, v: v, y: y
            }), "validacao" === p.finTab && React.createElement(React.Fragment, null, /* FIN_ABAS_V1 */ window.FinUI.cabecalho("Validação", "Aprovação de ajustes de OS e conferência dos saques do período"), React.createElement("div", {
                className: "bg-white rounded-[14px] border border-gray-200 p-4 mb-4" /* FIN_CLEAN_V1: Validação sem sombra/gradiente */
            }, React.createElement("div", {
                className: "flex flex-wrap gap-4 items-end"
            }, React.createElement("div", null, React.createElement("label", {
                className: "fin-lbl"
            }, "Filtrar por"), React.createElement("select", {
                value: p.validacaoTipo || "solicitacao",
                onChange: e => {
                    x({ ...p, validacaoTipo: e.target.value });
                    if (p.validacaoDataInicio && p.validacaoDataFim) carregarValidacao(e.target.value, p.validacaoDataInicio, p.validacaoDataFim);
                },
                className: "fin-inp"
            }, React.createElement("option", {
                value: "solicitacao"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-calendar" })), "Data da Solicitação")), React.createElement("option", {
                value: "lancamento"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-filetext" })), "Data de Lançamento")), React.createElement("option", {
                value: "debito"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-card" })), "Data do Débito")))), React.createElement("div", null, React.createElement("label", {
                className: "fin-lbl"
            }, "Data Início"), React.createElement("input", {
                type: "date",
                value: p.validacaoDataInicio || "",
                onChange: e => {
                    const novoInicio = e.target.value;
                    x({ ...p, validacaoDataInicio: novoInicio });
                    if (novoInicio && p.validacaoDataFim) carregarValidacao(p.validacaoTipo || "solicitacao", novoInicio, p.validacaoDataFim);
                },
                className: "fin-inp"
            })), React.createElement("div", null, React.createElement("label", {
                className: "fin-lbl"
            }, "Data Fim"), React.createElement("input", {
                type: "date",
                value: p.validacaoDataFim || "",
                onChange: e => {
                    const novoFim = e.target.value;
                    x({ ...p, validacaoDataFim: novoFim });
                    if (p.validacaoDataInicio && novoFim) carregarValidacao(p.validacaoTipo || "solicitacao", p.validacaoDataInicio, novoFim);
                },
                className: "fin-inp"
            })), React.createElement("button", {
                onClick: () => {
                    const now = new Date();
                    const e = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");
                    x({ ...p, validacaoDataInicio: e, validacaoDataFim: e });
                    carregarValidacao(p.validacaoTipo || "solicitacao", e, e);
                },
                className: "fin-btn fin-btn-s"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-calendar" })), "Hoje")), React.createElement("button", {
                onClick: () => {
                    const now = new Date();
                    const hoje = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");
                    x({ ...p, validacaoDataInicio: hoje, validacaoDataFim: hoje });
                    carregarValidacao(p.validacaoTipo || "solicitacao", hoje, hoje);
                },
                className: "fin-btn fin-btn-s"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-refresh" })), "Limpar")), React.createElement("button", {
                onClick: exportarValidacaoExcel,
                className: "fin-btn fin-btn-p"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-download" })), "Exportar Excel")))), validacaoLoading ? React.createElement("div", { className: "flex items-center justify-center py-12" }, React.createElement("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" }), React.createElement("span", { className: "ml-3 text-gray-500" }, "Carregando validação...")) : (() => {
                const e = p.validacaoTipo || "solicitacao",
                    t = p.validacaoDataInicio,
                    a = p.validacaoDataFim,
                    l = (t && a && validacaoData) ? validacaoData : (t && a && !validacaoData) ? [] : q.filter(l => {
                        if (!t && !a) return !0;
                        let r;
                        const toLocalDate = (dt) => { const d = new Date(dt); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); };
                        if ("solicitacao" === e) {
                            if (!l.created_at) return !1;
                            r = toLocalDate(l.created_at);
                        } else if ("lancamento" === e) {
                            if (!l.lancamento_at) return !1;
                            r = toLocalDate(l.lancamento_at);
                        } else {
                            if (!l.debito_plific_at) return !1;
                            r = toLocalDate(l.debito_plific_at);
                        }
                        return t && a ? r >= t && r <= a : t ? r >= t : !a || r <= a
                    }),
                    r = l.length,
                    o = l.filter(e => "rejeitado" === e.status).length,
                    c = l.filter(e => "aprovado" === e.status || "aprovado_gratuidade" === e.status || "pago_stark" === e.status).length,
                    s = l.filter(e => "aprovado" === e.status || ("pago_stark" === e.status && !e.has_gratuity)).length,
                    n = l.filter(e => "aprovado_gratuidade" === e.status || ("pago_stark" === e.status && e.has_gratuity)).length,
                    m = l.filter(e => "aprovado" === e.status || ("pago_stark" === e.status && !e.has_gratuity)).reduce((e, t) => e + parseFloat(t.requested_amount || 0), 0),
                    i = .045 * m,
                    d = l.filter(e => "aprovado_gratuidade" === e.status || ("pago_stark" === e.status && e.has_gratuity)).reduce((e, t) => e + parseFloat(t.requested_amount || 0), 0),
                    x = .045 * d,
                    u = m + d,
                    custoStark = c * 0.50,
                    custoTotal = x + custoStark;
                return React.createElement(React.Fragment, null, React.createElement("div", {
                    className: "mb-3"
                }, React.createElement("p", {
                    className: "text-gray-500 text-sm font-medium"
                }, "solicitacao" === e ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-calendar" })), "Filtrando por Data da Solicitação") : "lancamento" === e ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-filetext" })), "Filtrando por Data de Lançamento") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-card" })), "Filtrando por Data do Débito"), t && a && t === a && ` - ${new Date(t+"T12:00:00").toLocaleDateString("pt-BR")}`, t && a && t !== a && ` - ${new Date(t+"T12:00:00").toLocaleDateString("pt-BR")} até ${new Date(a+"T12:00:00").toLocaleDateString("pt-BR")}`, !t && !a && " - Todos os períodos")), React.createElement("div", {
                    className: "fin-kpis", style: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } /* FIN_ABAS_V1: faixa única */
                }, React.createElement("div", {
                    className: ""
                }, React.createElement("p", {
                    className: "text-xs text-gray-500"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-download" })), "Total Recebidas")), React.createElement("p", {
                    className: "text-2xl font-bold text-gray-900 tabular-nums", style: { fontFamily: "Sora, Inter, sans-serif" }
                }, r)), React.createElement("div", {
                    className: ""
                }, React.createElement("p", {
                    className: "text-xs text-gray-500"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), "Total Aprovadas")), React.createElement("p", {
                    className: "text-2xl font-bold text-gray-900 tabular-nums", style: { fontFamily: "Sora, Inter, sans-serif" }
                }, c)), React.createElement("div", {
                    className: ""
                }, React.createElement("p", {
                    className: "text-xs text-gray-500"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), "Sem Gratuidade")), React.createElement("p", {
                    className: "text-2xl font-bold text-gray-900 tabular-nums", style: { fontFamily: "Sora, Inter, sans-serif" }
                }, s)), React.createElement("div", {
                    className: ""
                }, React.createElement("p", {
                    className: "text-xs text-gray-500"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-gift" })), "Com Gratuidade")), React.createElement("p", {
                    className: "text-2xl font-bold text-gray-900 tabular-nums", style: { fontFamily: "Sora, Inter, sans-serif" }
                }, n)), React.createElement("div", {
                    className: ""
                }, React.createElement("p", {
                    className: "text-xs text-gray-500"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })), "Rejeitadas")), React.createElement("p", {
                    className: "text-2xl font-bold text-gray-900 tabular-nums", style: { fontFamily: "Sora, Inter, sans-serif" }
                }, o))), React.createElement("div", {
                    className: "fin-kpis", style: { borderTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }
                }, React.createElement("div", {
                    className: ""
                }, React.createElement("p", {
                    className: "text-xs text-gray-500"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-wallet" })), "Valor Total Aprovado")), React.createElement("p", {
                    className: "text-2xl font-bold mt-1 tabular-nums", style: { fontFamily: "Sora, Inter, sans-serif" }
                }, er(u)), React.createElement("p", {
                    className: "text-xs text-gray-500 mt-1"
                }, "Soma de ", c, " aprovações (com + sem gratuidade)")), React.createElement("div", {
                    className: ""
                }, React.createElement("p", {
                    className: "text-xs text-gray-500"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-wallet" })), "Lucro com Saque (4,5%)")), React.createElement("p", {
                    className: "text-2xl font-bold mt-1 tabular-nums", style: { fontFamily: "Sora, Inter, sans-serif" }
                }, er(i)), React.createElement("p", {
                    className: "text-xs text-gray-500 mt-1"
                }, "Baseado em ", s, " aprovações sem gratuidade (", er(m), ")")), React.createElement("div", {
                    className: ""
                }, React.createElement("p", {
                    className: "text-xs text-gray-500"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-building" })), "Custo Stark Bank")), React.createElement("p", {
                    className: "text-2xl font-bold mt-1 tabular-nums", style: { fontFamily: "Sora, Inter, sans-serif" }
                }, er(custoStark)), React.createElement("p", {
                    className: "text-xs text-gray-500 mt-1"
                }, "R$ 0,50 × ", c, " transferências aprovadas")), React.createElement("div", {
                    className: ""
                }, React.createElement("p", {
                    className: "text-xs text-gray-500"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-trenddown" })), "Deixou de Arrecadar")), React.createElement("p", {
                    className: "text-2xl font-bold mt-1 tabular-nums", style: { fontFamily: "Sora, Inter, sans-serif" }
                }, er(custoTotal)), React.createElement("p", {
                    className: "text-xs text-gray-500 mt-1"
                }, "Gratuidades: ", er(x), " + Stark: ", er(custoStark)))))
            })()), "conciliacao" === p.finTab && React.createElement(React.Fragment, null, 
                /* FIN_ABAS_V1: Conciliação — cabeçalho, filtros em card com pílula de gratuidade, faixa de KPIs, tabela limpa */
                window.FinUI.cabecalho("Conciliação", (p.concDataSolicitacao ? "Solicitados em " + p.concDataSolicitacao.split("-").reverse().join("/") : p.concDataRealizacao ? "Realizados em " + p.concDataRealizacao.split("-").reverse().join("/") : p.concDataVencimento ? "Vencimento em " + p.concDataVencimento.split("-").reverse().join("/") : "Saques aprovados recentes") + " · marque os saques conciliados no OMIE"),
                // Filtros de Conciliação
                React.createElement("div", {
                    className: "fin-card p-4 mb-4"
                }, 
                    React.createElement("div", {className: "flex flex-wrap items-end gap-3"},
                        // Filtro por Data de Solicitação
                        React.createElement("div", null,
                            React.createElement("label", {className: "fin-lbl"}, "Data de solicitação"),
                            React.createElement("input", {
                                type: "date",
                                value: p.concDataSolicitacao || "",
                                onChange: e => { 
                                    setConciliacaoPagina(1); 
                                    x({...p, concDataSolicitacao: e.target.value, concDataRealizacao: ""});
                                    if (e.target.value) carregarConciliacao(e.target.value, e.target.value, "solicitacao");
                                    else setConciliacaoData(null);
                                },
                                className: "fin-inp"
                            })
                        ),
                        // Filtro por Data de Realização
                        React.createElement("div", null,
                            React.createElement("label", {className: "fin-lbl"}, "Data de realização"),
                            React.createElement("input", {
                                type: "date",
                                value: p.concDataRealizacao || "",
                                onChange: e => { 
                                    setConciliacaoPagina(1); 
                                    x({...p, concDataRealizacao: e.target.value, concDataSolicitacao: ""});
                                    // 🆕 2026-05 FIX: "aprovacao" → approved_at, a MESMA coluna exibida
                                    // como "Realizado". Antes era "lancamento" (lancamento_at), que
                                    // diverge em re-lançamentos e trazia saques de outro dia.
                                    if (e.target.value) carregarConciliacao(e.target.value, e.target.value, "aprovacao");
                                    else setConciliacaoData(null);
                                },
                                className: "fin-inp"
                            })
                        ),
                        // VENC_MAP_V2: Filtro por Data de Vencimento (competencia enviada a MAP)
                        React.createElement("div", null,
                            React.createElement("label", {className: "fin-lbl"}, "Data de vencimento"),
                            React.createElement("input", {
                                type: "date",
                                value: p.concDataVencimento || "",
                                onChange: e => {
                                    setConciliacaoPagina(1);
                                    x({...p, concDataVencimento: e.target.value, concDataSolicitacao: "", concDataRealizacao: ""});
                                    if (e.target.value) carregarConciliacao(e.target.value, e.target.value, "vencimento");
                                    else setConciliacaoData(null);
                                },
                                className: "fin-inp"
                            })
                        ),
                        // Loading indicator
                        conciliacaoLoading && React.createElement("div", {className: "flex items-center gap-2 text-gray-500", style: { height: 38 }},
                            React.createElement("div", {className: "w-4 h-4 border-2 border-purple-700 border-t-transparent rounded-full animate-spin"}),
                            React.createElement("span", {className: "text-sm"}, "Buscando...")
                        ),
                        // Filtro de Gratuidade
                        React.createElement("div", {className: "flex items-center gap-2"},
                            React.createElement("button", {
                                type: "button",
                                "aria-pressed": !!p.concApenasGratuidade,
                                onClick: () => { setConciliacaoPagina(1); x({...p, concApenasGratuidade: !p.concApenasGratuidade}); },
                                className: "fin-chip",
                                style: { height: 38 }
                            }, React.createElement("svg", { className: "ico", style: { width: 15, height: 15 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-gift" })), "Apenas gratuidades")
                        ),
                        // Botão Limpar Filtros
                        (p.concDataSolicitacao || p.concDataRealizacao || p.concDataVencimento || p.concApenasGratuidade) && React.createElement("button", {
                            onClick: () => { setConciliacaoPagina(1); setConciliacaoData(null); x({...p, concDataSolicitacao: "", concDataRealizacao: "", concDataVencimento: "", concApenasGratuidade: false}); },
                            type: "button",
                            className: "fin-btn fin-btn-s"
                        }, React.createElement("svg", { className: "ico", style: { width: 15, height: 15 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })), "Limpar filtros")
                    )
                ),
                // Cards dinâmicos baseados nos filtros
                (() => {
                    // Usar dados do servidor quando disponível
                    const fonte = conciliacaoData || q;
                    const dadosFiltrados = conciliacaoData 
                        ? fonte.filter(e => {
                            if (p.concApenasGratuidade && !e.has_gratuity) return false;
                            return true;
                        })
                        : fonte.filter(e => {
                            if (!e.status?.includes("aprovado") && e.status !== "pago_stark") return false;
                            if (p.concDataSolicitacao) {
                                const dataSolic = (() => { const d = new Date(e.created_at); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); })();
                                if (dataSolic !== p.concDataSolicitacao) return false;
                            }
                            if (p.concDataRealizacao) {
                                if (!e.approved_at) return false;
                                const dataReal = (() => { const d = new Date(e.approved_at); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); })();
                                if (dataReal !== p.concDataRealizacao) return false;
                            }
                            if (p.concApenasGratuidade && !e.has_gratuity) return false;
                            return true;
                        }).sort((a, b) => parseFloat(b.requested_amount || 0) - parseFloat(a.requested_amount || 0));
                    
                    const totalAprovados = dadosFiltrados.length;
                    const totalConciliados = dadosFiltrados.filter(e => e.conciliacao_omie).length;
                    const pendenteConciliacao = totalAprovados - totalConciliados;
                    const totalGratuidades = dadosFiltrados.filter(e => e.has_gratuity).length;
                    
                    // FIN_ABAS_V1: faixa única de KPIs
                    return window.FinUI.kpis([
                        { rotulo: "Aprovados", valor: totalAprovados.toLocaleString("pt-BR"), sub: "no filtro atual" },
                        { rotulo: "Conciliados", valor: totalConciliados.toLocaleString("pt-BR"), tom: totalConciliados > 0 ? "verde" : null, sub: "marcados no OMIE" },
                        { rotulo: "Pend. conciliação", valor: pendenteConciliacao.toLocaleString("pt-BR"), tom: pendenteConciliacao > 0 ? "ambar" : null, sub: "falta marcar" },
                        { rotulo: "Gratuidades", valor: totalGratuidades.toLocaleString("pt-BR"), sub: "sem taxa" }
                    ]);
                })(),
                React.createElement("div", {
                className: "bg-white rounded-[14px] overflow-x-auto border border-gray-200"
            }, React.createElement("table", {
                className: "w-full text-sm min-w-[600px] fin-tbl"
            }, React.createElement("thead", {
                className: "bg-gray-50"
            }, React.createElement("tr", null, React.createElement("th", {
                className: "px-4 py-3 text-left"
            }, "Datas"), React.createElement("th", {
                className: "px-4 py-3 text-left"
            }, "Nome"), React.createElement("th", {
                className: "px-4 py-3 text-left"
            }, "CPF"), React.createElement("th", {
                className: "px-4 py-3 text-left"
            }, "Código"), React.createElement("th", {
                className: "px-4 py-3 text-right"
            }, "Solicitado"), React.createElement("th", {
                className: "px-4 py-3 text-right"
            }, "Valor Profissional"), React.createElement("th", {
                className: "px-4 py-3 text-center"
            }, "Gratuidade"), React.createElement("th", {
                className: "px-4 py-3 text-center"
            }, "Pagamento"), React.createElement("th", {
                className: "px-4 py-3 text-center"
            }, "OMIE"))), React.createElement("tbody", null, (() => {
                // Filtrar dados - usar servidor quando disponível
                const fonte = conciliacaoData || q;
                const filtrados = conciliacaoData
                    ? fonte.filter(e => {
                        if (p.concApenasGratuidade && !e.has_gratuity) return false;
                        return true;
                    })
                    : fonte.filter(e => {
                        if (!e.status?.includes("aprovado") && e.status !== "pago_stark") return false;
                        if (p.concDataSolicitacao) {
                            const dataSolic = (() => { const d = new Date(e.created_at); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); })();
                            if (dataSolic !== p.concDataSolicitacao) return false;
                        }
                        if (p.concDataRealizacao) {
                            if (!e.approved_at) return false;
                            const dataReal = (() => { const d = new Date(e.approved_at); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); })();
                            if (dataReal !== p.concDataRealizacao) return false;
                        }
                        if (p.concApenasGratuidade && !e.has_gratuity) return false;
                        return true;
                    }).sort((a, b) => parseFloat(b.requested_amount || 0) - parseFloat(a.requested_amount || 0));
                
                // Aplicar paginação
                const inicio = (conciliacaoPagina - 1) * conciliacaoPorPagina;
                const fim = inicio + conciliacaoPorPagina;
                return filtrados.slice(inicio, fim);
            })().map(e => {
                const t = new Date(e.created_at),
                    a = t.toLocaleDateString("pt-BR"),
                    l = t.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit"
                    }),
                    r = e.approved_at ? new Date(e.approved_at) : null,
                    o = r ? r.toLocaleDateString("pt-BR") : "-",
                    c = r ? r.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit"
                    }) : "",
                    s = e.has_gratuity;
                return React.createElement("tr", {
                    key: e.id,
                    className: "border-t"
                }, React.createElement("td", {
                    className: "px-4 py-3"
                }, React.createElement("div", {
                    className: "flex flex-col text-[11.5px] leading-5"
                }, React.createElement("span", {
                    className: "text-gray-500"
                }, "Solicitado: ", React.createElement("span", {
                    className: "font-medium text-gray-900"
                }, a), " às ", React.createElement("span", {
                    className: "font-medium text-gray-900"
                }, l)), React.createElement("span", {
                    className: "text-green-800"
                }, "Realizado: ", React.createElement("span", {
                    className: "font-medium text-green-800"
                }, o), c && React.createElement(React.Fragment, null, " às ", React.createElement("span", {
                    className: "font-medium text-green-800"
                }, c))), /* VENC_MAP_V2 competencia */ (e.vencimento_map ? React.createElement("span", {
                    className: e.vencimento_retroativo ? "text-amber-800" : "text-gray-500"
                }, "Vencimento: ", React.createElement("span", {
                    className: e.vencimento_retroativo ? "font-bold text-amber-800" : "font-medium text-gray-700"
                }, String(e.vencimento_map).slice(8,10) + "/" + String(e.vencimento_map).slice(5,7) + "/" + String(e.vencimento_map).slice(0,4)), e.vencimento_retroativo ? " (dom. anterior)" : "") : null))), React.createElement("td", {
                    className: "px-4 py-3"
                }, e.user_name), React.createElement("td", {
                    className: "px-4 py-3"
                }, e.cpf), React.createElement("td", {
                    className: "px-4 py-3 tabular-nums"
                }, e.user_cod), React.createElement("td", {
                    className: "px-4 py-3 text-right"
                }, er(e.requested_amount)), React.createElement("td", {
                    className: "px-4 py-3 text-right font-semibold"
                }, er(e.final_amount)), React.createElement("td", {
                    className: "px-4 py-3 text-center"
                }, s ? window.FinUI.pilula("azul", "Sim") : React.createElement("span", {
                    className: "text-xs text-gray-400"
                }, "—")), React.createElement("td", {
                    className: "px-4 py-3 text-center"
                }, e.stark_status === 'pago' ? window.FinUI.pilula("verde", "Pago via Stark") /* FIN_ABAS_V1 */ : e.stark_status === 'processando' ? window.FinUI.pilula("ambar", "Processando") : e.stark_status === 'erro' ? React.createElement("span", {
                    className: "cursor-help",
                    title: traduzirErroStarkFE(e.stark_erro)
                }, window.FinUI.pilula("vermelho", traduzirErroStarkFE(e.stark_erro).substring(0, 25) + (traduzirErroStarkFE(e.stark_erro).length > 25 ? '...' : ''))) : React.createElement("span", {
                    className: "text-xs text-gray-500"
                }, "Manual")), React.createElement("td", {
                    className: "px-4 py-3 text-center"
                }, React.createElement("input", {
                    type: "checkbox",
                    checked: e.conciliacao_omie,
                    onChange: t => (async (id, field, value) => {
                        try {
                            // Otimista: atualiza na tela imediatamente
                            if (conciliacaoData) {
                                setConciliacaoData(prev => prev.map(w => w.id === id ? {...w, conciliacao_omie: value} : w));
                            }
                            U(prev => prev.map(w => w.id === id ? {...w, conciliacao_omie: value} : w));
                            await fetchAuth(`${API_URL}/withdrawals/${id}/conciliacao`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ [field]: value })
                            });
                        } catch (err) {
                            ja("Erro ao conciliar", "error");
                            Ua();
                        }
                    })(e.id, "conciliacaoOmie", t.target.checked),
                    className: "w-4 h-4 accent-purple-700 cursor-pointer",
                    "aria-label": "Conciliado no OMIE"
                })))
            }))),
            // Controles de paginação da Conciliação
            (() => {
                const fonte = conciliacaoData || q;
                const filtrados = conciliacaoData
                    ? fonte.filter(e => {
                        if (p.concApenasGratuidade && !e.has_gratuity) return false;
                        return true;
                    })
                    : fonte.filter(e => {
                        if (!e.status?.includes("aprovado") && e.status !== "pago_stark") return false;
                        if (p.concDataSolicitacao) {
                            const dataSolic = (() => { const d = new Date(e.created_at); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); })();
                            if (dataSolic !== p.concDataSolicitacao) return false;
                        }
                        if (p.concDataRealizacao) {
                            if (!e.approved_at) return false;
                            const dataReal = (() => { const d = new Date(e.approved_at); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); })();
                            if (dataReal !== p.concDataRealizacao) return false;
                        }
                        if (p.concApenasGratuidade && !e.has_gratuity) return false;
                        return true;
                    }).sort((a, b) => parseFloat(b.requested_amount || 0) - parseFloat(a.requested_amount || 0));
                const totalPaginas = Math.ceil(filtrados.length / conciliacaoPorPagina);
                if (totalPaginas <= 1) return null;
                return React.createElement("div", {
                    className: "flex items-center justify-between bg-white rounded-[14px] p-4 mt-4 border border-gray-200"
                }, 
                    React.createElement("div", { className: "text-sm text-gray-500" },
                        `Mostrando ${Math.min((conciliacaoPagina - 1) * conciliacaoPorPagina + 1, filtrados.length)}-${Math.min(conciliacaoPagina * conciliacaoPorPagina, filtrados.length)} de ${filtrados.length} registros`
                    ),
                    React.createElement("div", { className: "flex items-center gap-2" },
                        React.createElement("button", {
                            onClick: () => setConciliacaoPagina(1),
                            disabled: conciliacaoPagina === 1,
                            className: "px-3 py-1 rounded text-sm font-semibold " + (conciliacaoPagina === 1 ? "bg-white border border-gray-200 text-gray-300" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50")
                        }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-arrowleft" }))),
                        React.createElement("button", {
                            onClick: () => setConciliacaoPagina(pg => Math.max(1, pg - 1)),
                            disabled: conciliacaoPagina === 1,
                            className: "px-3 py-1 rounded text-sm font-semibold " + (conciliacaoPagina === 1 ? "bg-white border border-gray-200 text-gray-300" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50")
                        }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-arrowleft" })), "Anterior")),
                        React.createElement("span", { className: "px-4 py-1 bg-purple-100 text-purple-700 rounded font-bold" },
                            `${conciliacaoPagina} / ${totalPaginas}`
                        ),
                        React.createElement("button", {
                            onClick: () => setConciliacaoPagina(pg => Math.min(totalPaginas, pg + 1)),
                            disabled: conciliacaoPagina === totalPaginas,
                            className: "px-3 py-1 rounded text-sm font-semibold " + (conciliacaoPagina === totalPaginas ? "bg-white border border-gray-200 text-gray-300" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50")
                        }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, "Próxima", React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-arrowright" })))),
                        React.createElement("button", {
                            onClick: () => setConciliacaoPagina(totalPaginas),
                            disabled: conciliacaoPagina === totalPaginas,
                            className: "px-3 py-1 rounded text-sm font-semibold " + (conciliacaoPagina === totalPaginas ? "bg-white border border-gray-200 text-gray-300" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50")
                        }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-arrowright" })))
                    )
                );
            })()
            )), "resumo" === p.finTab && React.createElement(React.Fragment, null,
                /* FIN_ABAS_V1: Resumo — cabeçalho, busca em card, faixa de KPIs (inclui Lucro), chips de status, tabela */
                window.FinUI.cabecalho("Resumo por profissional", p.searchCod && resumoData ? (resumoData.length.toLocaleString("pt-BR") + " saque(s) do código " + p.searchCod) : "Histórico completo de saques de um profissional"),
                React.createElement("div", {
                className: "fin-card p-3 mb-4"
            }, React.createElement("div", {
                className: "flex flex-wrap gap-2 items-center"
            }, React.createElement("label", { style: { flex: "1 1 260px", minWidth: 200, display: "flex", alignItems: "center", gap: 8, height: 38, padding: "0 12px", border: "1px solid #e5e7eb", borderRadius: 10, color: "#9ca3af", background: "#ffffff" } },
                React.createElement("svg", { className: "ico", style: { width: 15, height: 15 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-search" })),
                React.createElement("input", {
                "aria-label": "Código do profissional",
                style: { border: 0, outline: 0, flex: 1, minWidth: 0, font: "inherit", fontSize: 13, color: "#111827", background: "transparent" },
                type: "text",
                placeholder: "Buscar por código do profissional...",
                value: p.searchCod || "",
                onChange: e => x({
                    ...p,
                    searchCod: e.target.value
                }),
                onKeyDown: e => { if (e.key === "Enter" && p.searchCod) carregarResumo(p.searchCod); }
            })), p.searchCod && React.createElement("button", {
                type: "button",
                onClick: () => { x({ ...p, searchCod: "" }); setResumoData(null); },
                className: "fin-btn fin-btn-s"
            }, "Limpar"), React.createElement("button", {
                type: "button",
                onClick: () => { if (p.searchCod) carregarResumo(p.searchCod); },
                disabled: resumoLoading || !p.searchCod,
                className: "fin-btn fin-btn-p"
            }, resumoLoading ? "Buscando..." : "Buscar"))), p.searchCod && resumoData && (() => {
                const e = resumoData;
                // RESUMO_KPI_V2: categoria de cada saque (mesma regra da Conciliacao).
                // Antes os KPIs olhavam so o status literal e os "pago_stark" (a maioria)
                // nao entravam em lugar nenhum — Total 126 vs 0+35+2+2.
                const resumoCat = r => {
                    if (r.status === "aguardando_aprovacao" || r.status === "aguardando_pagamento_stark") return "aguardando";
                    if (r.status === "rejeitado") return "rejeitado";
                    if (r.status === "inativo") return "inativo";
                    if (r.status === "aprovado_gratuidade" || (r.status === "pago_stark" && r.has_gratuity === true)) return "aprovado_gratuidade";
                    if (r.status === "aprovado" || r.status === "pago_stark") return "aprovado";
                    return r.status || "outro";
                };
                const fR = n => "R$ " + Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const nCat = c => e.filter(r => resumoCat(r) === c).length;
                // Lucro = taxa cobrada nos saques pagos SEM gratuidade (solicitado - repassado ao profissional)
                const cobrados = e.filter(r => resumoCat(r) === "aprovado");
                const lucro = cobrados.reduce((s, r) => s + (parseFloat(r.requested_amount || 0) - parseFloat(r.final_amount || 0)), 0);
                const totalSolicitadoPago = e.filter(r => resumoCat(r) === "aprovado" || resumoCat(r) === "aprovado_gratuidade").reduce((s, r) => s + parseFloat(r.requested_amount || 0), 0);
                const totalRepassado = e.filter(r => resumoCat(r) === "aprovado" || resumoCat(r) === "aprovado_gratuidade").reduce((s, r) => s + parseFloat(r.final_amount || 0), 0);
                return React.createElement(React.Fragment, null, window.FinUI.kpis([
                    { rotulo: "Total", valor: e.length.toLocaleString("pt-BR"), sub: fR(totalSolicitadoPago) + " sacados" },
                    { rotulo: "Aguardando", valor: nCat("aguardando"), tom: nCat("aguardando") > 0 ? "ambar" : null },
                    { rotulo: "Aprovadas", valor: nCat("aprovado"), sub: "inclui pagas via Stark" },
                    { rotulo: "Aprov. gratuidade", valor: nCat("aprovado_gratuidade"), sub: "sem taxa" },
                    { rotulo: "Rejeitadas", valor: nCat("rejeitado"), tom: nCat("rejeitado") > 0 ? "vermelho" : null },
                    { rotulo: "Lucro (taxas cobradas)", valor: fR(lucro), tom: "roxo", title: "Soma de (valor solicitado − valor repassado) nos saques pagos sem gratuidade", sub: cobrados.length + " cobrado(s) · repassado " + fR(totalRepassado) }
                ]), React.createElement("div", {
                    className: "bg-white rounded-[14px] overflow-hidden border border-gray-200"
                }, React.createElement("div", { style: { padding: 12, borderBottom: "1px solid #f3f4f6" } }, /* FIN_ABAS_V1: chips de status */
                    window.FinUI.chips([
                        { id: "", label: "Todas", n: e.length },
                        { id: "aguardando", label: "Aguardando", n: nCat("aguardando") },
                        { id: "aprovado", label: "Aprovadas", n: nCat("aprovado") },
                        { id: "aprovado_gratuidade", label: "Aprov. gratuidade", n: nCat("aprovado_gratuidade") },
                        { id: "rejeitado", label: "Rejeitadas", n: nCat("rejeitado") },
                        { id: "inativo", label: "Inativo", n: nCat("inativo") }
                    ], p.resumoFilter || "", v => x({ ...p, resumoFilter: v }), "Filtrar por status")), React.createElement("div", {
                    className: "overflow-x-auto"
                }, React.createElement("table", {
                    className: "w-full text-sm fin-tbl"
                }, React.createElement("thead", {
                    className: "bg-gray-50"
                }, React.createElement("tr", null, React.createElement("th", {
                    className: "px-4 py-3 text-left"
                }, "Datas"), React.createElement("th", {
                    className: "px-4 py-3 text-left"
                }, "Nome"), React.createElement("th", {
                    className: "px-4 py-3 text-left"
                }, "CPF"), React.createElement("th", {
                    className: "px-4 py-3 text-left"
                }, "Código"), React.createElement("th", {
                    className: "px-4 py-3 text-right"
                }, "Solicitado"), React.createElement("th", {
                    className: "px-4 py-3 text-right"
                }, "Valor Profissional"), React.createElement("th", {
                    className: "px-4 py-3 text-left"
                }, "PIX"), React.createElement("th", {
                    className: "px-4 py-3 text-center"
                }, "Gratuidade"), React.createElement("th", {
                    className: "px-4 py-3 text-center"
                }, "Status"))), React.createElement("tbody", null, e.filter(e => !p.resumoFilter || resumoCat(e) === p.resumoFilter || e.status === p.resumoFilter).map(e => {
                    const t = new Date(e.created_at),
                        a = t.toLocaleDateString("pt-BR"),
                        l = t.toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit"
                        }),
                        r = e.approved_at ? new Date(e.approved_at) : null,
                        o = r ? r.toLocaleDateString("pt-BR") : "-",
                        c = r ? r.toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit"
                        }) : "",
                        s = "aprovado" === e.status || "aprovado_gratuidade" === e.status || "pago_stark" === e.status;
                    return React.createElement("tr", {
                        key: e.id,
                        className: "border-t"
                    }, React.createElement("td", {
                        className: "px-4 py-3"
                    }, React.createElement("div", {
                        className: "flex flex-col text-[11.5px] leading-5"
                    }, React.createElement("span", {
                        className: "text-gray-500"
                    }, "Solicitado: ", React.createElement("span", {
                        className: "font-medium text-gray-900"
                    }, a), " às ", React.createElement("span", {
                        className: "font-medium text-gray-900"
                    }, l)), s && React.createElement("span", {
                        className: "text-green-800"
                    }, "Realizado: ", React.createElement("span", {
                        className: "font-medium text-green-800"
                    }, o), c && React.createElement(React.Fragment, null, " às ", React.createElement("span", {
                        className: "font-medium text-green-800"
                    }, c))))), React.createElement("td", {
                        className: "px-4 py-3"
                    }, e.user_name, e.is_restricted ? React.createElement("span", { style: { marginLeft: 6 } }, window.FinUI.pilula("vermelho", "Restrito")) : null), React.createElement("td", {
                        className: "px-4 py-3"
                    }, e.cpf), React.createElement("td", {
                        className: "px-4 py-3 tabular-nums"
                    }, e.user_cod), React.createElement("td", {
                        className: "px-4 py-3 text-right font-semibold"
                    }, er(e.requested_amount)), React.createElement("td", {
                        className: "px-4 py-3 text-right"
                    }, er(e.final_amount)), React.createElement("td", {
                        className: "px-4 py-3"
                    }, React.createElement("span", {
                        className: "text-xs max-w-[120px] truncate"
                    }, e.pix_key)), React.createElement("td", {
                        className: "px-4 py-3 text-center"
                    }, e.has_gratuity ? window.FinUI.pilula("azul", "Sim") : React.createElement("span", {
                        className: "text-xs text-gray-400"
                    }, "—")), React.createElement("td", {
                        className: "px-4 py-3"
                    }, /* FIN_ABAS_V1: status = pílula suave */ ("pago_stark" === e.status ? window.FinUI.pilula("verde", "Pago via Stark") : "aguardando_pagamento_stark" === e.status ? window.FinUI.pilula("ambar", "Aguard. pgto Stark") : "aguardando_aprovacao" === e.status ? window.FinUI.pilula("ambar", "Aguardando") : "aprovado" === e.status ? window.FinUI.pilula("verde", "Aprovado") : "aprovado_gratuidade" === e.status ? window.FinUI.pilula("azul", "c/ Gratuidade") : "rejeitado" === e.status ? window.FinUI.pilula("vermelho", "Rejeitado") : window.FinUI.pilula("cinza", "Inativo")), e.reject_reason && "rejeitado" === e.status && React.createElement("p", {
                        className: "text-xs text-red-800 mt-1"
                    }, "Motivo: ", e.reject_reason), e.admin_name && "aguardando_aprovacao" !== e.status && React.createElement("p", {
                        className: "text-xs text-gray-500 mt-1"
                    }, "por ", e.admin_name)))
                }))))))
            })(), !p.searchCod && React.createElement("div", {
                className: "bg-white rounded-[14px] p-8 text-center border border-gray-200"
            }, React.createElement("p", {
                className: "text-gray-500 text-sm"
            }, "Digite o código do profissional e clique em Buscar.")),
            p.searchCod && !resumoData && !resumoLoading && React.createElement("div", {
                className: "bg-white rounded-[14px] p-8 text-center border border-gray-200"
            }, React.createElement("p", {
                className: "text-gray-500 text-sm"
            }, "Clique em Buscar para pesquisar.")),
            resumoLoading && React.createElement("div", {
                className: "bg-white rounded-[14px] p-8 text-center border border-gray-200"
            }, React.createElement("div", {className: "w-8 h-8 border-4 border-purple-700 border-t-transparent rounded-full animate-spin mx-auto mb-2"}),
            React.createElement("p", {className: "text-gray-500 text-sm"}, "Buscando dados do servidor..."))), "gratuidades" === p.finTab && React.createElement(
                window.ModuloGratuidadesV2Component || (() => React.createElement("div", {
                    className: "bg-white rounded-[14px] p-8 text-center border border-gray-200"
                }, React.createElement("p", { className: "text-amber-800 font-semibold" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#d97706" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-alert" })), "ModuloGratuidadesV2 não carregado")),
                   React.createElement("p", { className: "text-xs text-gray-500 mt-2" }, "Confira se o script está incluído no index.html antes do ModuloFinanceiro.js"))),
                { API_URL: API_URL, fetchAuth: fetchAuth, ja: ja, confirm: typeof confirmar === 'function' ? confirmar : undefined }
            ), "sinistros" === p.finTab && React.createElement(
                window.ModuloSinistrosComponent || (() => React.createElement("div", {
                    className: "bg-white rounded-[14px] p-8 text-center border border-gray-200"
                }, React.createElement("p", { className: "text-amber-800 font-semibold" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#d97706" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-alert" })), "ModuloSinistros nao carregado")),
                   React.createElement("p", { className: "text-xs text-gray-500 mt-2" }, "Confira se modulo-sinistros.js esta incluido no index.html antes do ModuloFinanceiro.js"))),
                { API_URL: API_URL, fetchAuth: fetchAuth, ja: ja }
            ), "comissao" === p.finTab && React.createElement(
                window.ModuloComissaoComponent || (() => React.createElement("div", {
                    className: "bg-white rounded-[14px] p-8 text-center border border-gray-200"
                }, React.createElement("p", { className: "text-amber-800 font-semibold" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#d97706" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-alert" })), "ModuloComissao nao carregado")),
                   React.createElement("p", { className: "text-xs text-gray-500 mt-2" }, "Confira se modulo-comissao.js esta incluido no index.html antes do ModuloFinanceiro.js"))),
                { API_URL: API_URL, fetchAuth: fetchAuth, ja: ja, usuario: l }
            ), "restritos" === p.finTab && React.createElement("div", {
                className: "space-y-4"
            }, /* FIN_ABAS_V1: Restritos — cabeçalho, formulário em card, tabela com pílulas e "Suspender" destrutivo */
            window.FinUI.cabecalho("Restritos", Z.filter(r => "ativo" === r.status).length + " profissional(is) com restrição ativa · bloqueados de saque emergencial"),
            React.createElement("div", {
                className: "fin-card p-5"
            }, React.createElement("h2", {
                className: "fin-sec-t mb-3"
            }, "Adicionar restrição"), React.createElement("div", {
                className: "grid md:grid-cols-4 gap-3"
            }, React.createElement("div", null, React.createElement("label", {
                className: "fin-lbl"
            }, "Código *"), React.createElement("input", {
                type: "text",
                placeholder: "Código",
                value: p.restUserCod || "",
                onChange: async e => {
                    const t = e.target.value;
                    if (x({
                            ...p,
                            restUserCod: t,
                            restUserName: ""
                        }), t.length >= 3) {
                        const e = A.find(e => e.codProfissional?.toLowerCase() === t.toLowerCase());
                        e && x(a => ({
                            ...a,
                            restUserCod: t,
                            restUserName: e.fullName
                        }))
                    }
                },
                className: "w-full fin-inp"
            })), React.createElement("div", null, React.createElement("label", {
                className: "fin-lbl"
            }, "Nome"), React.createElement("input", {
                type: "text",
                placeholder: "Nome do usuário",
                value: p.restUserName || "",
                readOnly: !0,
                className: "w-full bg-gray-50 text-gray-700 fin-inp"
            })), React.createElement("div", null, React.createElement("label", {
                className: "fin-lbl"
            }, "Motivo *"), React.createElement("input", {
                type: "text",
                placeholder: "Motivo",
                value: p.restReason || "",
                onChange: e => x({
                    ...p,
                    restReason: e.target.value
                }),
                className: "w-full fin-inp"
            })), React.createElement("div", {
                className: "flex items-end"
            }, React.createElement("button", {
                onClick: Gl,
                disabled: c || !p.restUserName,
                className: "w-full fin-btn fin-btn-d"
            }, React.createElement("svg", { className: "ico", style: { width: 15, height: 15 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-ban" })), "Adicionar restrição"))), p.restUserCod && !p.restUserName && p.restUserCod.length >= 3 && React.createElement("p", {
                className: "text-red-800 text-xs mt-2"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#d97706" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-alert" })), "Usuário não encontrado com este código")), p.restUserName && React.createElement("p", {
                className: "text-green-800 text-xs mt-2"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), "Usuário encontrado: "), p.restUserName)), React.createElement("div", {
                className: "bg-white rounded-[14px] overflow-x-auto border border-gray-200"
            }, React.createElement("table", {
                className: "w-full text-sm fin-tbl"
            }, React.createElement("thead", {
                className: "bg-gray-50"
            }, React.createElement("tr", null, React.createElement("th", {
                className: "px-4 py-3 text-left"
            }, "Código"), React.createElement("th", {
                className: "px-4 py-3 text-left"
            }, "Nome"), React.createElement("th", {
                className: "px-4 py-3 text-left"
            }, "Motivo"), React.createElement("th", {
                className: "px-4 py-3 text-left"
            }, "Cadastrado por"), React.createElement("th", {
                className: "px-4 py-3 text-left"
            }, "Data"), React.createElement("th", {
                className: "px-4 py-3 text-center"
            }, "Status"), React.createElement("th", {
                className: "px-4 py-3 text-center"
            }, "Ação"))), React.createElement("tbody", null, Z.map(e => React.createElement("tr", {
                key: e.id,
                className: "border-t"
            }, React.createElement("td", {
                className: "px-4 py-3 tabular-nums"
            }, e.user_cod), React.createElement("td", {
                className: "px-4 py-3 font-semibold"
            }, e.user_name || "-"), React.createElement("td", {
                className: "px-4 py-3"
            }, e.reason), React.createElement("td", {
                className: "px-4 py-3 text-xs text-gray-500"
            }, e.created_by || "-"), React.createElement("td", {
                className: "px-4 py-3"
            }, new Date(e.created_at).toLocaleDateString("pt-BR")), React.createElement("td", {
                className: "px-4 py-3 text-center"
            }, window.FinUI.pilula("ativo" === e.status ? "vermelho" : "cinza", "ativo" === e.status ? "Ativa" : (e.status ? e.status.charAt(0).toUpperCase() + e.status.slice(1) : "—"))), React.createElement("td", {
                className: "px-4 py-3 text-center"
            }, "ativo" === e.status && React.createElement("button", {
                onClick: () => (async e => {
                    try {
                        await fetchAuth(`${API_URL}/restricted/${e}/remove`, {
                            method: "PATCH",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                removedReason: "Suspensa pelo admin"
                            })
                        }), ja("Restrição removida!", "success"), Ba()
                    } catch (e) {
                        ja("Erro", "error")
                    }
                })(e.id),
                type: "button",
                className: "fin-btn fin-btn-d fin-btn-sm"
            }, "Suspender")))))))), "indicacoes" === p.finTab && React.createElement(React.Fragment, null, p.modalRejeitar && React.createElement("div", {
                className: "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            }, React.createElement("div", {
                className: "bg-white rounded-[14px] p-6 max-w-md w-full border border-gray-200"
            }, React.createElement("h3", {
                className: "text-base font-semibold text-gray-900 mb-4"
            }, "Rejeitar Indicação"), React.createElement("div", {
                className: "bg-gray-50 rounded-lg p-4 mb-4"
            }, React.createElement("p", {
                className: "text-sm"
            }, React.createElement("strong", null, "Profissional:"), " ", p.modalRejeitar.user_name), React.createElement("p", {
                className: "text-sm"
            }, React.createElement("strong", null, "Indicado:"), " ", p.modalRejeitar.indicado_nome), React.createElement("p", {
                className: "text-sm"
            }, React.createElement("strong", null, "Região:"), " ", p.modalRejeitar.regiao)), React.createElement("div", {
                className: "mb-4"
            }, React.createElement("label", {
                className: "fin-lbl"
            }, "Motivo da Rejeição *"), React.createElement("textarea", {
                value: p.motivoRejeicao || "",
                onChange: e => x({
                    ...p,
                    motivoRejeicao: e.target.value
                }),
                className: "w-full fin-inp",
                rows: "3",
                placeholder: "Informe o motivo..."
            })), React.createElement("div", {
                className: "flex gap-3"
            }, React.createElement("button", {
                onClick: () => x({
                    ...p,
                    modalRejeitar: null,
                    motivoRejeicao: ""
                }),
                className: "flex-1 fin-btn fin-btn-s"
            }, "Cancelar"), React.createElement("button", {
                onClick: () => (async e => {
                    if (p.motivoRejeicao) {
                        s(!0);
                        try {
                            const resp = await fetchAuth(`${API_URL}/indicacoes/${e}/rejeitar`, {
                                    method: "PATCH",
                                    headers: {
                                        "Content-Type": "application/json"
                                    },
                                    body: JSON.stringify({
                                        motivo_rejeicao: p.motivoRejeicao,
                                        resolved_by: l.fullName
                                    })
                                });
                            if (!resp.ok) throw new Error("Erro ao rejeitar");
                            const updated = await resp.json();
                            // Optimistic update: atualizar a indicação no array local
                            le(prev => prev.map(i => i.id === e ? { ...i, ...updated, status: 'rejeitada' } : i));
                            ja("Indicação rejeitada", "success"), x({
                                ...p,
                                modalRejeitar: null,
                                motivoRejeicao: ""
                            });
                            // Reload em background
                            setTimeout(() => wl(), 500);
                        } catch (e) {
                            ja(e.message, "error")
                        }
                        s(!1)
                    } else ja("Informe o motivo da rejeição", "error")
                })(p.modalRejeitar.id),
                disabled: !p.motivoRejeicao || c,
                className: "flex-1 fin-btn fin-btn-d"
            }, c ? "..." : "Rejeitar")))), window.FinUI.cabecalho("Indicações", ae.length + " indicação(ões) recebida(s) · bônus por região definido nas promoções abaixo"), window.FinUI.kpis([ /* FIN_ABAS_V1: faixa única */
                { rotulo: "Pendentes", valor: ae.filter(e => "pendente" === e.status).length, tom: ae.filter(e => "pendente" === e.status).length > 0 ? "ambar" : null, sub: "aguardando análise" },
                { rotulo: "Aprovadas", valor: ae.filter(e => "aprovada" === e.status).length, sub: ae.filter(e => "aprovada" === e.status && !e.credito_lancado).length + " sem crédito lançado" },
                { rotulo: "Rejeitadas", valor: ae.filter(e => "rejeitada" === e.status).length },
                { rotulo: "Expiradas", valor: ae.filter(e => "expirada" === e.status).length }
            ]), React.createElement("div", {
                className: "fin-card p-5 mb-6"
            }, React.createElement("div", {
                className: "flex justify-between items-center mb-3 gap-2 flex-wrap"
            }, React.createElement("h2", {
                className: "fin-sec-t"
            }, "Indicações recebidas"), React.createElement("button", {
                onClick: () => verificarCadastrosIndicados(ae),
                disabled: cadastroIndicadosLoading,
                className: "fin-btn fin-btn-s fin-btn-sm"
            }, cadastroIndicadosLoading ? "Verificando..." : "Verificar cadastros")), 0 === ae.length ? React.createElement("p", {
                className: "text-gray-500 text-center py-8"
            }, "Nenhuma indicação recebida") : React.createElement("div", {
                className: "overflow-x-auto"
            }, React.createElement("table", {
                className: "w-full text-sm fin-tbl"
            }, React.createElement("thead", {
                className: "bg-gray-50"
            }, React.createElement("tr", null, React.createElement("th", {
                className: "px-2 py-2 text-left text-xs"
            }, "Data"), React.createElement("th", {
                className: "px-2 py-2 text-left text-xs"
            }, "Profissional"), React.createElement("th", {
                className: "px-2 py-2 text-left text-xs"
            }, "Indicado"), React.createElement("th", {
                className: "px-2 py-2 text-left text-xs"
            }, "Contato"), React.createElement("th", {
                className: "px-2 py-2 text-center text-xs"
            }, "Cadastro"), React.createElement("th", {
                className: "px-2 py-2 text-left text-xs"
            }, "Região"), React.createElement("th", {
                className: "px-2 py-2 text-center text-xs"
            }, "Bônus"), React.createElement("th", {
                className: "px-2 py-2 text-center text-xs"
            }, "Expira"), React.createElement("th", {
                className: "px-2 py-2 text-center text-xs"
            }, "Status"), React.createElement("th", {
                className: "px-2 py-2 text-center text-xs"
            }, "Crédito"), React.createElement("th", {
                className: "px-2 py-2 text-center text-xs"
            }, "Ações"))), React.createElement("tbody", null, (() => {
                // Ordenar: 1) pendente c/ cadastro, 2) pendente s/ cadastro, 3) aprovada, 4) rejeitada, 5) expirada
                const ordenado = [...ae].sort((a, b) => {
                    const celA = a.indicado_contato ? a.indicado_contato.replace(/\D/g, "") : "";
                    const celB = b.indicado_contato ? b.indicado_contato.replace(/\D/g, "") : "";
                    const cadA = cadastroIndicados[celA];
                    const cadB = cadastroIndicados[celB];
                    const prioStatus = s => s === "pendente" ? 0 : s === "aprovada" ? 2 : s === "rejeitada" ? 3 : 4;
                    const pA = prioStatus(a.status);
                    const pB = prioStatus(b.status);
                    if (pA !== pB) return pA - pB;
                    // Dentro de pendentes: cadastrado primeiro
                    if (a.status === "pendente" && b.status === "pendente") {
                        const cA = cadA && cadA.cadastrado ? 0 : 1;
                        const cB = cadB && cadB.cadastrado ? 0 : 1;
                        if (cA !== cB) return cA - cB;
                    }
                    return new Date(b.created_at) - new Date(a.created_at);
                });
                return ordenado;
            })().map(e => {
                const t = Math.ceil((new Date(e.expires_at) - new Date) / 864e5),
                    a = e.indicado_contato ? e.indicado_contato.replace(/\D/g, "") : "",
                    r = a ? `https://wa.me/55${a}` : "#";
                return React.createElement("tr", {
                    key: e.id,
                    className: "border-t " + ("expirada" === e.status ? "opacity-60" : "")
                }, React.createElement("td", {
                    className: "px-2 py-2 whitespace-nowrap text-xs"
                }, new Date(e.created_at).toLocaleDateString("pt-BR")), React.createElement("td", {
                    className: "px-2 py-2"
                }, React.createElement("p", {
                    className: "font-semibold text-xs"
                }, e.user_name), React.createElement("p", {
                    className: "text-xs text-gray-500"
                }, e.user_cod)), React.createElement("td", {
                    className: "px-2 py-2"
                }, React.createElement("p", {
                    className: "font-semibold text-xs"
                }, e.indicado_nome), e.indicado_cpf && React.createElement("p", {
                    className: "text-xs text-gray-500"
                }, e.indicado_cpf)), React.createElement("td", {
                    className: "px-2 py-2"
                }, React.createElement("a", {
                    href: r,
                    target: "_blank",
                    rel: "noopener noreferrer",
                    className: "text-purple-800 hover:underline font-semibold text-xs flex items-center gap-1 whitespace-nowrap"
                }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-phone" })), e.indicado_contato)), (() => {
                    const celLimpo = a;
                    const info = cadastroIndicados[celLimpo];
                    const loading = cadastroIndicadosLoading && !info;
                    return React.createElement("td", {
                        className: "px-2 py-2 text-center"
                    }, loading 
                        ? React.createElement("div", {className: "w-4 h-4 border-2 border-purple-700 border-t-transparent rounded-full animate-spin mx-auto"})
                        : info 
                            ? info.cadastrado 
                                ? React.createElement("div", {className: "flex flex-col items-center", title: `${info.nome || ''} - Cód: ${info.codigo || 'N/A'}\n${info.status || ''}\nCadastro: ${info.dataCadastro || 'N/A'}`},
                                    React.createElement("svg", { className: "ico", style: { width: 20, height: 20, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })),
                                    info.codigo && React.createElement("span", {className: "text-[9px] text-gray-500"}, info.codigo)
                                )
                                : React.createElement("svg", { className: "ico", style: { width: 20, height: 20 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" }))
                            : React.createElement("span", {className: "text-gray-300 text-xs"}, "-")
                    );
                })(), React.createElement("td", {
                    className: "px-2 py-2 text-xs whitespace-nowrap"
                }, e.regiao), React.createElement("td", {
                    className: "px-2 py-2 text-center font-semibold text-xs whitespace-nowrap tabular-nums"
                }, er(e.valor_bonus)), React.createElement("td", {
                    className: "px-2 py-2 text-center whitespace-nowrap"
                }, e.expires_at ? React.createElement("span", {
                    className: "text-xs font-bold " + (t <= 0 ? "text-red-800" : t <= 5 ? "text-amber-800" : "text-gray-500")
                }, t > 0 ? t + "d" : "Vencida") : React.createElement("span", { className: "text-xs text-gray-400" }, "—")), React.createElement("td", {
                    className: "px-2 py-2 text-center whitespace-nowrap"
                }, React.createElement("span", {
                    className: "fin-pill " + ("pendente" === e.status ? "bg-amber-50 text-amber-800" : "aprovada" === e.status ? "bg-green-50 text-green-800" : "rejeitada" === e.status ? "bg-red-50 text-red-800" : "bg-gray-100 text-gray-700")
                }, "pendente" === e.status ? "Pendente" : "aprovada" === e.status ? "Aprovada" : "rejeitada" === e.status ? "Rejeitada" : "Expirada"), ("aprovada" === e.status || "rejeitada" === e.status) && e.resolved_by && React.createElement("p", {
                    className: "text-[9px] text-gray-500 mt-0.5"
                }, e.resolved_by)), React.createElement("td", {
                    className: "px-2 py-2 text-center"
                }, "aprovada" === e.status && React.createElement("div", {
                    className: "flex flex-col items-center"
                }, React.createElement("input", {
                    type: "checkbox",
                    checked: e.credito_lancado || !1,
                    onChange: async t => {
                        try {
                            await fetchAuth(`${API_URL}/indicacoes/${e.id}/credito`, {
                                method: "PATCH",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({
                                    credito_lancado: t.target.checked,
                                    lancado_por: l.fullName
                                })
                            }), wl()
                        } catch (e) {
                            ja("Erro ao atualizar", "error")
                        }
                    },
                    className: "w-4 h-4 accent-purple-700 cursor-pointer",
                    "aria-label": "Crédito lançado"
                }), e.credito_lancado && e.lancado_por && React.createElement("span", {
                    className: "text-[9px] text-gray-500 mt-0.5"
                }, e.lancado_por))), React.createElement("td", {
                    className: "px-2 py-2 text-center"
                }, React.createElement("div", { className: "inline-flex gap-1 items-center" },
                "pendente" === e.status && React.createElement("button", {
                    onClick: () => (async e => {
                        s(!0);
                        try {
                            const resp = await fetchAuth(`${API_URL}/indicacoes/${e}/aprovar`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ resolved_by: l.fullName })
                                });
                            if (!resp.ok) throw new Error("Erro ao aprovar");
                            const updated = await resp.json();
                            le(prev => prev.map(i => i.id === e ? { ...i, ...updated, status: 'aprovada' } : i));
                            ja("Indicação aprovada!", "success");
                            setTimeout(() => wl(), 500);
                        } catch (e) { ja(e.message, "error") }
                        s(!1)
                    })(e.id),
                    className: "fin-btn fin-btn-p fin-btn-sm"
                }, "Aprovar"),
                "pendente" === e.status && React.createElement("button", {
                    onClick: () => x({ ...p, modalRejeitar: e }),
                    className: "fin-btn fin-btn-d fin-btn-sm"
                }, "Rejeitar"),
                React.createElement("button", {
                    onClick: () => (async id => {
                        if (!confirm("Excluir indicação de " + e.indicado_nome + "?")) return;
                        s(!0);
                        try {
                            const resp = await fetchAuth(`${API_URL}/indicacoes/${id}`, { method: "DELETE" });
                            if (!resp.ok) throw new Error("Erro ao excluir");
                            le(prev => prev.filter(i => i.id !== id));
                            ja("Excluída!", "success");
                        } catch (err) { ja(err.message, "error"); }
                        s(!1);
                    })(e.id),
                    className: "fin-btn fin-btn-s fin-btn-sm", "aria-label": "Excluir indicação",
                    title: "rejeitada" === e.status && e.motivo_rejeicao ? "Motivo: " + e.motivo_rejeicao : "Excluir"
                }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-trash" }))))))
            }))))), React.createElement("div", {
                className: "fin-card p-5 mb-6"
            }, React.createElement("div", {
                className: "flex justify-between items-center mb-3"
            }, React.createElement("h2", {
                className: "fin-sec-t"
            }, p.editPromo ? "Editar promoção" : "Cadastrar nova promoção"), p.editPromo && React.createElement("button", {
                onClick: () => x({
                    ...p,
                    editPromo: null,
                    promoRegiao: "",
                    promoValor: "",
                    promoDetalhes: ""
                }),
                className: "text-sm text-gray-500 hover:text-gray-700"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })), "Cancelar edição"))), React.createElement("div", {
                className: "grid md:grid-cols-2 gap-4 mb-4"
            }, React.createElement("div", null, React.createElement("label", {
                className: "fin-lbl"
            }, "Região *"), React.createElement("select", {
                value: p.promoRegiao || "",
                onChange: e => x({
                    ...p,
                    promoRegiao: e.target.value
                }),
                className: "w-full fin-inp"
            }, 
                React.createElement("option", { value: "" }, "Selecione a região..."),
                (cidadesIndicacao || []).map(cidade => 
                    React.createElement("option", { key: cidade, value: cidade }, cidade)
                )
            )), React.createElement("div", null, React.createElement("label", {
                className: "fin-lbl"
            }, "Valor do Bônus (R$) *"), React.createElement("input", {
                type: "number",
                step: "0.01",
                value: p.promoValor || "",
                onChange: e => x({
                    ...p,
                    promoValor: e.target.value
                }),
                className: "w-full fin-inp",
                placeholder: "Ex: 100.00"
            }))), React.createElement("div", {
                className: "mb-4"
            }, React.createElement("label", {
                className: "fin-lbl"
            }, "Detalhes da Promoção (opcional)"), React.createElement("textarea", {
                value: p.promoDetalhes || "",
                onChange: e => x({
                    ...p,
                    promoDetalhes: e.target.value
                }),
                className: "w-full fin-inp",
                rows: "3",
                placeholder: "Ex: Vaga para instalador com experiência em fibra óptica. Início imediato. Benefícios: vale transporte + alimentação..."
            })), React.createElement("button", {
                onClick: p.editPromo ? Ol : Ml,
                disabled: c,
                className: "w-full md:w-auto fin-btn fin-btn-p"
            }, c ? "..." : p.editPromo ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-save" })), "Salvar alterações") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-plus" })), "Criar promoção"))), React.createElement("div", {
                className: "fin-card p-5 mb-6"
            }, React.createElement("h2", {
                className: "fin-sec-t mb-3"
            }, "Promoções cadastradas"), 0 === (l.role === "user" ? promocoesFiltradas : ee).length ? React.createElement("p", {
                className: "text-gray-500 text-center py-4"
            }, l.role === "user" && cidadeUsuarioLogado 
                ? "Nenhuma promoção disponível para " + cidadeUsuarioLogado 
                : "Nenhuma promoção cadastrada") : React.createElement("div", {
                className: "grid md:grid-cols-4 gap-3"
            }, (l.role === "user" ? promocoesFiltradas : ee).map(e => React.createElement("div", {
                key: e.id,
                className: "border border-gray-200 rounded-[10px] p-3 bg-white " + ("ativa" === e.status ? "" : "opacity-70")
            }, React.createElement("div", {
                className: "flex justify-between items-center mb-1"
            }, React.createElement("span", {
                className: "fin-pill " + ("ativa" === e.status ? "bg-green-50 text-green-800" : "bg-gray-100 text-gray-700")
            }, "ativa" === e.status ? "Ativa" : "Inativa"), React.createElement("div", {
                className: "flex gap-1"
            }, React.createElement("button", {
                onClick: () => x({
                    ...p,
                    editPromo: e,
                    promoRegiao: e.regiao,
                    promoValor: e.valor_bonus,
                    promoDetalhes: e.detalhes || ""
                }),
                className: "text-xs text-gray-500 hover:text-purple-800", "aria-label": "Editar promoção", title: "Editar"
            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-pencil" }))), React.createElement("button", {
                onClick: async () => {
                    await fetchAuth(`${API_URL}/promocoes/${e.id}`, {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            status: "ativa" === e.status ? "inativa" : "ativa"
                        })
                    }), gl()
                },
                className: "text-xs text-gray-500 hover:text-purple-800", "aria-label": "ativa" === e.status ? "Desativar promoção" : "Ativar promoção", title: "ativa" === e.status ? "Desativar" : "Ativar"
            }, "ativa" === e.status ? React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-power" })) : React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-play" }))))), React.createElement("p", {
                className: "font-semibold text-sm"
            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-pin" })), e.regiao), React.createElement("p", {
                className: "text-lg font-bold text-gray-900 tabular-nums"
            }, er(e.valor_bonus)), e.detalhes && React.createElement("p", {
                className: "text-xs text-gray-500 mt-1 whitespace-pre-wrap line-clamp-3",
                title: e.detalhes
            }, e.detalhes)))))), "promo-novatos" === p.finTab && React.createElement(React.Fragment, null, p.modalRejeitarNovatos && React.createElement("div", {
                className: "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            }, React.createElement("div", {
                className: "bg-white rounded-[14px] p-6 w-full max-w-md"
            }, React.createElement("h3", {
                className: "text-base font-semibold text-gray-900 mb-2"
            }, "Rejeitar inscrição"), React.createElement("p", {
                className: "text-sm text-gray-500 mb-3"
            }, "Profissional: ", React.createElement("strong", null, p.modalRejeitarNovatos.user_name), React.createElement("br", null), "Cliente: ", React.createElement("strong", null, p.modalRejeitarNovatos.cliente)), React.createElement("div", {
                className: "mb-4"
            }, React.createElement("label", {
                className: "fin-lbl"
            }, "Motivo da Rejeição *"), React.createElement("textarea", {
                value: p.motivoRejeicaoNovato || "",
                onChange: e => x({
                    ...p,
                    motivoRejeicaoNovato: e.target.value
                }),
                className: "w-full fin-inp",
                rows: "3",
                placeholder: "Informe o motivo..."
            })), React.createElement("div", {
                className: "flex gap-3"
            }, React.createElement("button", {
                onClick: () => x({
                    ...p,
                    modalRejeitarNovatos: null,
                    motivoRejeicaoNovato: ""
                }),
                className: "flex-1 fin-btn fin-btn-s"
            }, "Cancelar"), React.createElement("button", {
                onClick: () => rejeitarInscNovato(p.modalRejeitarNovatos.id),
                disabled: !p.motivoRejeicaoNovato || c,
                className: "flex-1 fin-btn fin-btn-d"
            }, c ? "..." : "Rejeitar")))), window.FinUI.cabecalho("Promo Novatos", "Quiz de procedimentos e promoções por cliente/região para novos entregadores"), React.createElement("div", {
                className: "bg-white rounded-[14px] border border-gray-200 overflow-hidden mb-6"
            },
                /* Header com toggle de ativo */
                React.createElement("div", {
                    className: "p-4 sm:p-5 border-b border-gray-100 cursor-pointer",
                    onClick: () => $e(!Fe)
                },
                    React.createElement("div", { className: "flex items-center justify-between gap-3 flex-wrap" },
                        React.createElement("div", { className: "flex items-center gap-3" },
                            React.createElement("svg", { className: "ico", style: { width: 26, height: 26 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-target" })),
                            React.createElement("div", null,
                                React.createElement("p", { className: "font-semibold text-gray-900 text-base" }, "Quiz de procedimentos"),
                                React.createElement("p", { className: "text-xs text-gray-500" }, "Configure imagens, perguntas e prêmio")
                            )
                        ),
                        React.createElement("div", { className: "flex items-center gap-3", onClick: e => e.stopPropagation() },
                            /* Toggle ativo */
                            React.createElement("span", { className: "text-xs text-gray-500" }, "Status"),
                            React.createElement("button", {
                                onClick: async () => {
                                    const novoFe = { ...fe, ativo: !fe.ativo };
                                    Ne(novoFe);
                                    try {
                                        const resp = await fetchAuth(`${API_URL}/quiz-procedimentos/config`, {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify(novoFe)
                                        });
                                        if (!resp.ok) throw new Error("falha");
                                        ja(novoFe.ativo ? "Quiz ativado!" : "Quiz desativado!", "success");
                                    } catch (err) {
                                        Ne(fe);
                                        ja("Erro ao alterar status do quiz", "error");
                                    }
                                },
                                style: { background: fe.ativo ? "#16a34a" : "#d1d5db" },
                                className: "relative w-9 h-5 rounded-full transition"
                            },
                                React.createElement("span", {
                                    className: "absolute w-4 h-4 bg-white rounded-full transition top-0.5",
                                    style: { left: fe.ativo ? "calc(100% - 18px)" : "2px" }
                                })
                            ),
                            React.createElement("span", {
                                className: "text-xs font-semibold",
                                style: { color: fe.ativo ? "#166534" : "#6b7280" }
                            }, fe.ativo ? "Ativo" : "Inativo"),
                            React.createElement("span", {
                                className: "text-gray-400 ml-2 text-sm transition-transform",
                                style: { transform: Fe ? "rotate(180deg)" : "rotate(0deg)" }
                            }, "▼")
                        )
                    )
                ),
                /* Corpo expandido */
                Fe && React.createElement("div", null,
                    /* KPIs */
                    React.createElement("div", {
                        className: "fin-kpis m-4 sm:m-5",
                        style: { width: "auto" }
                    },
                        React.createElement("div", null,
                            React.createElement("p", { className: "fin-kpi-l" }, "Respostas"),
                            React.createElement("p", { className: "fin-kpi-v" }, ye.length)
                        ),
                        React.createElement("div", null,
                            React.createElement("p", { className: "fin-kpi-l" }, "Aproveitamento"),
                            React.createElement("p", { className: "fin-kpi-v" },
                                ye.length > 0 ? Math.round((ye.filter(e => e.passou).length / ye.length) * 100) + "%" : "0%")
                        ),
                        React.createElement("div", null,
                            React.createElement("p", { className: "fin-kpi-l" }, "Valor distribuído"),
                            React.createElement("p", { className: "fin-kpi-v" },
                                er(ye.filter(e => e.passou).length * (fe.valor_gratuidade || 0)))
                        ),
                        React.createElement("div", null,
                            React.createElement("p", { className: "fin-kpi-l" }, "Contemplados"),
                            React.createElement("p", { className: "fin-kpi-v" }, ye.filter(e => e.passou).length)
                        )
                    ),
                    /* Configurações básicas */
                    React.createElement("div", { className: "px-4 sm:px-5 pb-4" },
                        React.createElement("p", { className: "text-[11px] font-semibold text-gray-500 mb-2" }, "CONFIGURAÇÕES BÁSICAS"),
                        React.createElement("div", { className: "grid md:grid-cols-3 gap-3" },
                            React.createElement("div", { className: "md:col-span-2" },
                                React.createElement("label", { className: "fin-lbl" }, "Título do quiz"),
                                React.createElement("input", {
                                    type: "text",
                                    value: fe.titulo,
                                    onChange: e => Ne({ ...fe, titulo: e.target.value }),
                                    className: "w-full fin-inp",
                                    placeholder: "Acerte os procedimentos..."
                                })
                            ),
                            React.createElement("div", null,
                                React.createElement("label", { className: "fin-lbl" }, "Prêmio (R$)"),
                                React.createElement("input", {
                                    type: "number",
                                    step: "0.01",
                                    value: fe.valor_gratuidade,
                                    onChange: e => Ne({ ...fe, valor_gratuidade: parseFloat(e.target.value) || 0 }),
                                    className: "w-full fin-inp"
                                })
                            )
                        )
                    ),
                    /* Imagens */
                    React.createElement("div", { className: "px-4 sm:px-5 pb-4" },
                        React.createElement("div", { className: "flex items-center justify-between mb-2" },
                            React.createElement("p", { className: "text-[11px] font-semibold text-gray-500" }, "IMAGENS DOS PROCEDIMENTOS"),
                            React.createElement("span", { className: "text-[11px] text-gray-400" }, "4 slots · clique pra subir")
                        ),
                        React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-2" },
                            [0, 1, 2, 3].map(e => React.createElement("div", { key: e, className: "relative aspect-square" },
                                React.createElement("div", {
                                    className: "w-full h-full rounded-lg overflow-hidden flex items-center justify-center " + (fe.imagens[e] ? "bg-gray-100" : "border-2 border-dashed border-gray-300 bg-gray-50")
                                },
                                    fe.imagens[e]
                                        ? React.createElement("img", { src: fe.imagens[e], alt: "Imagem " + (e+1), className: "w-full h-full object-cover" })
                                        : React.createElement("div", { className: "flex flex-col items-center text-gray-400" },
                                            React.createElement("span", { className: "text-2xl" }, "+"),
                                            React.createElement("span", { className: "text-[11px] mt-0.5" }, "Imagem " + (e+1))
                                          )
                                ),
                                /* Badge número */
                                fe.imagens[e] && React.createElement("span", {
                                    className: "absolute top-1 left-1 bg-black/60 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded"
                                }, e + 1),
                                /* Botão remover */
                                fe.imagens[e] && React.createElement("button", {
                                    onClick: () => {
                                        const t = [...fe.imagens]; t[e] = null;
                                        Ne({ ...fe, imagens: t });
                                    },
                                    className: "absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-[10px] hover:bg-red-800"
                                }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" }))),
                                React.createElement("input", {
                                    type: "file",
                                    accept: "image/*",
                                    onChange: t => (async (e, t) => {
                                        if (!t) return;
                                        try {
                                            const dataUrl = window.imageUtils && window.imageUtils.compressImageSafe
                                                ? await window.imageUtils.compressImageSafe(t, { maxWidth: 1280, quality: 0.75 })
                                                : await new Promise((resolve, reject) => {
                                                    const a = new FileReader();
                                                    a.onload = t => resolve(t.target.result);
                                                    a.onerror = reject;
                                                    a.readAsDataURL(t);
                                                });
                                            const a = [...fe.imagens]; a[e] = dataUrl;
                                            Ne({ ...fe, imagens: a });
                                        } catch (err) {
                                            console.error('Erro ao processar imagem:', err);
                                        }
                                    })(e, t.target.files[0]),
                                    className: "absolute inset-0 opacity-0 cursor-pointer"
                                })
                            ))
                        )
                    ),
                    /* Perguntas com dicas embutidas */
                    React.createElement("div", { className: "px-4 sm:px-5 pb-4" },
                        React.createElement("p", { className: "text-[11px] font-semibold text-gray-500 mb-2" }, "PERGUNTAS & DICAS EXPLICATIVAS"),
                        React.createElement("p", { className: "text-[11px] text-gray-400 mb-3" }, "A dica aparece pro motoboy na revisão se ele errar."),
                        React.createElement("div", { className: "space-y-2.5" },
                            [0, 1, 2, 3, 4].map(idx => React.createElement("div", {
                                key: idx,
                                className: "bg-gray-50 rounded-lg p-3"
                            },
                                React.createElement("div", { className: "flex items-center justify-between mb-2" },
                                    React.createElement("span", { className: "text-[11px] font-semibold text-gray-500" }, "PERGUNTA " + (idx + 1)),
                                    React.createElement("div", { className: "flex gap-1.5" },
                                        React.createElement("button", {
                                            onClick: () => {
                                                const a = [...fe.perguntas];
                                                a[idx] = { ...a[idx], resposta: true };
                                                Ne({ ...fe, perguntas: a });
                                            },
                                            style: !0 === fe.perguntas[idx]?.resposta
                                                ? { background: "#f0fdf4", color: "#166534", border: "1px solid #16a34a" }
                                                : { background: "white", color: "#6b7280", border: "1px solid #d1d5db" },
                                            className: "px-2.5 py-1 rounded-md text-[11px] font-semibold"
                                        }, "Certo"),
                                        React.createElement("button", {
                                            onClick: () => {
                                                const a = [...fe.perguntas];
                                                a[idx] = { ...a[idx], resposta: false };
                                                Ne({ ...fe, perguntas: a });
                                            },
                                            style: !1 === fe.perguntas[idx]?.resposta
                                                ? { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }
                                                : { background: "white", color: "#6b7280", border: "1px solid #d1d5db" },
                                            className: "px-2.5 py-1 rounded-md text-[11px] font-semibold"
                                        }, "Errado")
                                    )
                                ),
                                React.createElement("input", {
                                    type: "text",
                                    value: fe.perguntas[idx]?.texto || "",
                                    onChange: e => {
                                        const a = [...fe.perguntas];
                                        a[idx] = { ...a[idx], texto: e.target.value };
                                        Ne({ ...fe, perguntas: a });
                                    },
                                    className: "w-full mb-2 fin-inp",
                                    placeholder: "Pergunta " + (idx + 1) + "..."
                                }),
                                /* Campo de dica embutido */
                                React.createElement("div", {
                                    className: "flex gap-2 items-start px-2 py-2 rounded-md",
                                    style: { background: "#eff6ff", borderLeft: "3px solid #1e40af" }
                                },
                                    React.createElement("span", { style: { color: "#1e40af" }, className: "mt-0.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-bulb" }))),
                                    React.createElement("input", {
                                        type: "text",
                                        value: (fe.dicas && fe.dicas[idx]) || "",
                                        onChange: e => {
                                            const a = Array.isArray(fe.dicas) ? [...fe.dicas] : ["", "", "", "", ""];
                                            while (a.length < 5) a.push("");
                                            a[idx] = e.target.value;
                                            Ne({ ...fe, dicas: a });
                                        },
                                        className: "flex-1 bg-transparent text-xs border-none focus:outline-none p-0",
                                        style: { color: "#1e40af" },
                                        placeholder: "Dica explicativa (opcional)"
                                    })
                                )
                            ))
                        )
                    ),
                    /* Footer */
                    React.createElement("div", {
                        className: "px-4 sm:px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-end"
                    },
                        React.createElement("button", {
                            onClick: Fl,
                            disabled: c,
                            style: { background: c ? "#d1d5db" : "#770fa8" },
                            className: "text-white px-5 py-2 rounded-[10px] text-sm font-semibold disabled:cursor-not-allowed"
                        }, c ? "Salvando..." : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-save" })), "Salvar"))
                    )
                )
            ), React.createElement("div", {
                className: "bg-white rounded-[14px] p-6 mb-6 border border-gray-200"
            }, React.createElement("div", {
                className: "flex justify-between items-center mb-3 gap-2 flex-wrap"
            }, React.createElement("h2", {
                className: "fin-sec-t"
            }, "Histórico do quiz"), React.createElement("span", {
                className: "text-xs text-gray-500"
            }, ye.length, " participantes · ", ye.filter(e => e.passou).length, " contemplados")), window.FinUI.kpis([ /* FIN_ABAS_V1: faixa única de KPIs */
                { rotulo: "Total", valor: ye.length },
                { rotulo: "Contemplados", valor: ye.filter(e => e.passou).length },
                { rotulo: "Não passou", valor: ye.filter(e => !e.passou).length, tom: "vermelho" },
                { rotulo: "Total Gratuidades", valor: er(ye.filter(e => e.passou).length * (fe.valor_gratuidade || 500)) }
            ]), 0 === ye.length ? React.createElement("p", {
                className: "text-gray-500 text-center py-8"
            }, "Nenhum participante ainda") : React.createElement("div", {
                className: "overflow-x-auto max-h-80"
            }, React.createElement("table", {
                className: "w-full text-sm fin-tbl"
            }, React.createElement("thead", {
                className: "sticky top-0"
            }, React.createElement("tr", null, React.createElement("th", {
                className: "px-3 py-2 text-left font-semibold"
            }, "Data/Hora"), React.createElement("th", {
                className: "px-3 py-2 text-left font-semibold"
            }, "Profissional"), React.createElement("th", {
                className: "px-3 py-2 text-left font-semibold"
            }, "COD"), React.createElement("th", {
                className: "px-3 py-2 text-center font-semibold"
            }, "Acertos"), React.createElement("th", {
                className: "px-3 py-2 text-center font-semibold"
            }, "Resultado"), React.createElement("th", {
                className: "px-3 py-2 text-center font-semibold"
            }, "Gratuidade"))), React.createElement("tbody", null, ye.map(e => React.createElement("tr", {
                key: e.id,
                className: ""
            }, React.createElement("td", {
                className: "px-3 py-2 text-xs text-gray-500"
            }, new Date(e.created_at).toLocaleDateString("pt-BR"), " ", new Date(e.created_at).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit"
            })), React.createElement("td", {
                className: "px-3 py-2 font-medium"
            }, e.user_name), React.createElement("td", {
                className: "px-3 py-2 text-gray-500"
            }, e.user_cod), React.createElement("td", {
                className: "px-3 py-2 text-center"
            }, React.createElement("span", {
                className: "font-bold " + (5 === e.acertos ? "text-green-800" : "text-red-800")
            }, e.acertos, "/5")), React.createElement("td", {
                className: "px-3 py-2 text-center"
            }, React.createElement("span", {
                className: "fin-pill " + (e.passou ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800")
            }, e.passou ? "Contemplado" : "Não passou")), React.createElement("td", {
                className: "px-3 py-2 text-center"
            }, e.passou ? React.createElement("span", {
                className: "font-semibold tabular-nums"
            }, er(fe.valor_gratuidade || 500)) : React.createElement("span", {
                className: "text-gray-400"
            }, "-")))))))), React.createElement("h2", {
                className: "fin-sec-t mt-8 mb-3"
            }, "Promoções por cliente/região"), React.createElement("div", {
                className: "bg-white rounded-[14px] p-6 mb-6 border border-gray-200"
            }, React.createElement("div", {
                className: "flex justify-between items-center mb-3"
            }, React.createElement("h2", {
                className: "fin-sec-t"
            }, p.editPromoNovatos ? "Editar promoção" : "Cadastrar nova promoção"), p.editPromoNovatos && React.createElement("button", {
                onClick: () => {
                    x({
                        ...p,
                        editPromoNovatos: null,
                        novatosRegiao: "",
                        novatosApelido: "",
                        novatosValor: "",
                        novatosQtdEntregas: "",
                        novatosDetalhes: ""
                    });
                    setClientesSelecionados([]);
                    setClientesBINovatos([]);
                },
                className: "text-sm text-gray-500 hover:text-gray-700"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })), "Cancelar edição"))), 
            
            // Linha 1: Região e Apelido
            React.createElement("div", {
                className: "grid md:grid-cols-2 gap-4 mb-4"
            }, React.createElement("div", null, React.createElement("label", {
                className: "fin-lbl"
            }, "Região *"), React.createElement("select", {
                value: p.novatosRegiao || "",
                onChange: e => {
                    const novaRegiao = e.target.value;
                    x({
                        ...p,
                        novatosRegiao: novaRegiao
                    });
                    setClientesSelecionados([]);
                    carregarClientesPorRegiao(novaRegiao);
                },
                className: "w-full fin-inp"
            }, React.createElement("option", { value: "" }, "Selecione uma região..."),
               React.createElement("option", { value: "Todas" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-map" })), "Todas as Regiões")),
               regioesNovatos.map(regiao => React.createElement("option", { key: regiao, value: regiao }, regiao))
            )), React.createElement("div", null, React.createElement("label", {
                className: "fin-lbl"
            }, "Apelido da Promoção *"), React.createElement("input", {
                type: "text",
                value: p.novatosApelido || "",
                onChange: e => x({
                    ...p,
                    novatosApelido: e.target.value
                }),
                className: "w-full fin-inp",
                placeholder: "Ex: Porto Seco, Magazine Luiza..."
            }))),
            
            // Linha 2: Multi-select de Clientes
            p.novatosRegiao && React.createElement("div", {
                className: "mb-4"
            }, React.createElement("label", {
                className: "fin-lbl"
            }, "Clientes * ", carregandoClientes && React.createElement("span", { className: "text-gray-400" }, "(carregando...)")),
            
            // Select de clientes disponíveis
            React.createElement("select", {
                onChange: e => {
                    if (!e.target.value) return;
                    const cliente = clientesBINovatos.find(c => String(c.cod_cliente) === e.target.value);
                    if (cliente && !clientesSelecionados.some(c => c.cod_cliente === cliente.cod_cliente)) {
                        setClientesSelecionados([...clientesSelecionados, cliente]);
                    }
                    e.target.value = "";
                },
                className: "w-full mb-2 fin-inp",
                disabled: carregandoClientes || clientesBINovatos.length === 0
            }, React.createElement("option", { value: "" }, carregandoClientes ? "Carregando clientes..." : clientesBINovatos.length === 0 ? "Nenhum cliente encontrado para esta região" : `Selecione um cliente (${clientesBINovatos.length} disponíveis)...`),
               clientesBINovatos.filter(c => !clientesSelecionados.some(s => s.cod_cliente === c.cod_cliente)).map(cliente => 
                   React.createElement("option", { 
                       key: cliente.cod_cliente, 
                       value: cliente.cod_cliente 
                   }, cliente.mascara ? `${cliente.mascara} (${cliente.cod_cliente})` : `${cliente.nome_original} (${cliente.cod_cliente})`)
               )
            ),
            
            // Chips de clientes selecionados
            clientesSelecionados.length > 0 && React.createElement("div", {
                className: "flex flex-wrap gap-2 mt-2"
            }, clientesSelecionados.map(cliente => React.createElement("span", {
                key: cliente.cod_cliente,
                className: "inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-800 rounded-full text-sm"
            }, React.createElement("span", null, cliente.mascara || cliente.nome_display || cliente.nome_original), React.createElement("span", { className: "text-xs text-blue-800" }, "(", cliente.cod_cliente, ")"), React.createElement("button", {
                onClick: () => setClientesSelecionados(clientesSelecionados.filter(c => c.cod_cliente !== cliente.cod_cliente)),
                className: "ml-1 text-blue-800 hover:text-red-800 font-bold"
            }, "×")))),
            
            clientesSelecionados.length > 0 && React.createElement("p", {
                className: "text-xs text-green-800 mt-1"
            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), clientesSelecionados.length, " cliente(s) selecionado(s)")),
            
            // Linha 3: Valor, Meta e Detalhes
            React.createElement("div", {
                className: "grid md:grid-cols-2 gap-4 mb-4"
            }, React.createElement("div", null, React.createElement("label", {
                className: "fin-lbl"
            }, "Valor do Bônus (R$) *"), React.createElement("input", {
                type: "number",
                step: "0.01",
                value: p.novatosValor || "",
                onChange: e => x({
                    ...p,
                    novatosValor: e.target.value
                }),
                className: "w-full fin-inp",
                placeholder: "Ex: 150.00"
            })), React.createElement("div", null, React.createElement("label", {
                className: "fin-lbl"
            }, "Meta de Entregas *"), React.createElement("input", {
                type: "number",
                value: p.novatosQtdEntregas || "",
                onChange: e => x({
                    ...p,
                    novatosQtdEntregas: e.target.value
                }),
                className: "w-full fin-inp",
                placeholder: "Ex: 50"
            }))), React.createElement("div", {
                className: "mb-4"
            }, React.createElement("label", {
                className: "fin-lbl"
            }, "Detalhes da Promoção (opcional)"), React.createElement("textarea", {
                value: p.novatosDetalhes || "",
                onChange: e => x({
                    ...p,
                    novatosDetalhes: e.target.value
                }),
                className: "w-full fin-inp",
                rows: "2",
                placeholder: "Ex: Vaga para motoboy com moto própria..."
            })), React.createElement("div", {
                className: "flex items-center gap-4"
            }, React.createElement("button", {
                onClick: p.editPromoNovatos ? Tl : Pl,
                disabled: c || clientesSelecionados.length === 0,
                className: "fin-btn fin-btn-p"
            }, c ? "..." : p.editPromoNovatos ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-save" })), "Salvar alterações") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-plus" })), "Criar promoção")), React.createElement("p", {
                className: "text-xs text-gray-500"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clock" })), "Inscrições expiram automaticamente em 15 dias")))), React.createElement("div", {
                className: "bg-white rounded-[14px] p-6 mb-6 border border-gray-200"
            }, React.createElement("h3", {
                className: "fin-sec-t mb-3"
            }, "Promoções cadastradas"), 0 === ce.length ? React.createElement("p", {
                className: "text-gray-500 text-center py-4"
            }, "Nenhuma promoção cadastrada") : React.createElement("div", {
                className: "grid md:grid-cols-3 gap-3"
            }, ce.map(e => React.createElement("div", {
                key: e.id,
                className: "border border-gray-200 rounded-[10px] p-3 bg-white " + ("ativa" === e.status ? "" : "opacity-70")
            }, React.createElement("div", {
                className: "flex justify-between items-center mb-1"
            }, React.createElement("span", {
                className: "fin-pill " + ("ativa" === e.status ? "bg-green-50 text-green-800" : "bg-gray-100 text-gray-700")
            }, "ativa" === e.status ? "Ativa" : "Inativa"), React.createElement("div", {
                className: "flex gap-1"
            }, React.createElement("button", {
                onClick: async () => {
                    x({
                        ...p,
                        editPromoNovatos: e,
                        novatosRegiao: e.regiao,
                        novatosApelido: e.apelido || e.cliente,
                        novatosValor: e.valor_bonus,
                        novatosQtdEntregas: e.quantidade_entregas || 50,
                        novatosDetalhes: e.detalhes || ""
                    });
                    // Carregar clientes da região e preencher os selecionados
                    await carregarClientesPorRegiao(e.regiao);
                    if (e.clientes_vinculados && e.clientes_vinculados.length > 0) {
                        setClientesSelecionados(e.clientes_vinculados.map(c => ({
                            cod_cliente: c.cod_cliente,
                            nome_display: c.nome_cliente,
                            nome_original: c.nome_cliente
                        })));
                    }
                },
                className: "text-xs text-blue-800 hover:text-blue-800",
                title: "Editar"
            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-pencil" }))), React.createElement("button", {
                onClick: async () => {
                    await fetchAuth(`${API_URL}/promocoes-novatos/${e.id}`, {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            status: "ativa" === e.status ? "inativa" : "ativa"
                        })
                    }), Cl()
                },
                className: "text-xs text-gray-500 hover:text-gray-700",
                title: "ativa" === e.status ? "Desativar" : "Ativar"
            }, "ativa" === e.status ? React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-power" })) : React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-play" }))), React.createElement("button", {
                onClick: () => (async e => {
                    if (confirm("Tem certeza que deseja excluir esta promoção?")) {
                        s(!0);
                        try {
                            const t = await fetchAuth(`${API_URL}/promocoes-novatos/${e}`, {
                                method: "DELETE"
                            });
                            if (!t.ok) {
                                const e = await t.json();
                                throw new Error(e.error || "Erro ao excluir")
                            }
                            ja("Promoção excluída!", "success"), await Cl()
                        } catch (e) {
                            ja(e.message, "error")
                        } finally {
                            s(!1)
                        }
                    }
                })(e.id),
                className: "text-xs text-red-800 hover:text-red-800",
                title: "Excluir"
            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-trash" }))))), React.createElement("p", {
                className: "font-semibold text-sm"
            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-pin" })), e.regiao), React.createElement("p", {
                className: "text-sm text-gray-700 font-bold"
            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-tag" })), e.apelido || e.cliente), 
            // Mostrar clientes vinculados
            e.clientes_vinculados && e.clientes_vinculados.length > 0 && React.createElement("div", {
                className: "mt-1"
            }, React.createElement("p", {
                className: "text-xs text-gray-500"
            }, "Clientes (", e.clientes_vinculados.length, "):"), React.createElement("div", {
                className: "flex flex-wrap gap-1 mt-1"
            }, e.clientes_vinculados.slice(0, 3).map(c => React.createElement("span", {
                key: c.cod_cliente,
                className: "text-xs bg-blue-50 text-blue-800 px-1 rounded"
            }, c.nome_cliente || c.cod_cliente)), e.clientes_vinculados.length > 3 && React.createElement("span", {
                className: "text-xs text-gray-400"
            }, "+", e.clientes_vinculados.length - 3, " mais"))),
            React.createElement("p", {
                className: "text-lg font-bold text-gray-900 tabular-nums"
            }, er(e.valor_bonus)), React.createElement("p", {
                className: "text-xs text-gray-700 font-semibold"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-target" })), "Meta: "), e.quantidade_entregas || 50, " entregas"), e.detalhes && React.createElement("p", {
                className: "text-xs text-gray-500 mt-1 whitespace-pre-wrap line-clamp-2",
                title: e.detalhes
            }, e.detalhes))))), window.FinUI.kpis([ /* FIN_ABAS_V1: faixa única de KPIs */
                { rotulo: "Pendentes", valor: ne.filter(e => {
                const totalEntregas = e.total_entregas || 0;
                const metaEntregas = e.meta_entregas || 50;
                const metaAtingida = totalEntregas >= metaEntregas;
                const expirado = e.expires_at && new Date() > new Date(e.expires_at);
                return !metaAtingida && !expirado && !e.credito_lancado;
            }).length, tom: "ambar" },
                { rotulo: "Completos", valor: ne.filter(e => {
                const totalEntregas = e.total_entregas || 0;
                const metaEntregas = e.meta_entregas || 50;
                return totalEntregas >= metaEntregas && !e.credito_lancado;
            }).length },
                { rotulo: "Lançados", valor: ne.filter(e => e.credito_lancado).length },
                { rotulo: "Expirados", valor: ne.filter(e => {
                const totalEntregas = e.total_entregas || 0;
                const metaEntregas = e.meta_entregas || 50;
                const metaAtingida = totalEntregas >= metaEntregas;
                const expirado = e.expires_at && new Date() > new Date(e.expires_at);
                return expirado && !metaAtingida && !e.credito_lancado;
            }).length }
            ]), React.createElement("div", {
                className: "bg-white rounded-[14px] p-6 border border-gray-200"
            }, React.createElement("h3", {
                className: "fin-sec-t mb-3"
            }, "Inscrições nas promoções"), 0 === ne.length ? React.createElement("p", {
                className: "text-gray-500 text-center py-8"
            }, "Nenhuma inscrição recebida") : React.createElement("div", {
                className: "overflow-x-auto"
            }, React.createElement("table", {
                className: "w-full text-sm fin-tbl"
            }, React.createElement("thead", {
                className: "bg-gray-50"
            }, React.createElement("tr", null, React.createElement("th", {
                className: "px-2 py-3 text-left text-xs"
            }, "Data"), React.createElement("th", {
                className: "px-2 py-3 text-left text-xs"
            }, "Profissional"), React.createElement("th", {
                className: "px-2 py-3 text-left text-xs"
            }, "COD"), React.createElement("th", {
                className: "px-2 py-3 text-left text-xs"
            }, "Região"), React.createElement("th", {
                className: "px-2 py-3 text-left text-xs"
            }, "Cliente"), React.createElement("th", {
                className: "px-2 py-3 text-center text-xs"
            }, "Bônus"), React.createElement("th", {
                className: "px-2 py-3 text-center text-xs"
            }, "Expira"), React.createElement("th", {
                className: "px-3 py-3 text-center"
            }, "Progresso"), React.createElement("th", {
                className: "px-2 py-3 text-center text-xs"
            }, "Crédito"), React.createElement("th", {
                className: "px-2 py-3 text-center text-xs"
            }, ""))), React.createElement("tbody", null, 
            // Ordenar inscrições: 1) Contempladas sem crédito no topo, 2) Por progresso desc
            [...ne].sort((a, b) => {
                const aTotal = a.total_entregas || 0;
                const bTotal = b.total_entregas || 0;
                const aMeta = a.meta_entregas || 50;
                const bMeta = b.meta_entregas || 50;
                const aAtingida = aTotal >= aMeta;
                const bAtingida = bTotal >= bMeta;
                const aSemCredito = aAtingida && !a.credito_lancado;
                const bSemCredito = bAtingida && !b.credito_lancado;
                
                // Contempladas sem crédito primeiro
                if (aSemCredito && !bSemCredito) return -1;
                if (!aSemCredito && bSemCredito) return 1;
                
                // Depois por percentual de progresso (maior primeiro)
                const aPerc = (aTotal / aMeta) * 100;
                const bPerc = (bTotal / bMeta) * 100;
                return bPerc - aPerc;
            }).map(e => {
                const t = e.expires_at ? new Date(e.expires_at) : null,
                    a = t && new Date > t,
                    totalEntregas = e.total_entregas || 0,
                    metaEntregas = e.meta_entregas || 50,
                    metaAtingida = e.meta_atingida || totalEntregas >= metaEntregas,
                    percentual = Math.min(100, Math.round((totalEntregas / metaEntregas) * 100));
                
                // Determinar status visual - AUTOMÁTICO
                let statusTexto, statusClasse, statusIcone;
                if (e.credito_lancado) {
                    statusTexto = "Lançado";
                    statusClasse = "bg-blue-50 text-blue-800";
                    statusIcone = React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-wallet" }));
                } else if (metaAtingida) {
                    statusTexto = "Completo";
                    statusClasse = "bg-green-50 text-green-800";
                    statusIcone = React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" }));
                } else if (a) {
                    statusTexto = "Expirado";
                    statusClasse = "bg-gray-100 text-gray-700";
                    statusIcone = React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clock" }));
                } else {
                    statusTexto = "Pendente";
                    statusClasse = "bg-amber-50 text-amber-800";
                    statusIcone = React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clock" }));
                }
                
                return React.createElement("tr", {
                    key: e.id,
                    className: a && !e.credito_lancado && !metaAtingida ? "opacity-70" : ""
                }, React.createElement("td", {
                    className: "px-2 py-3 text-xs"
                }, new Date(e.created_at).toLocaleDateString("pt-BR")), React.createElement("td", {
                    className: "px-2 py-3 text-xs font-medium"
                }, e.user_name), React.createElement("td", {
                    className: "px-2 py-3 text-xs"
                }, e.user_cod), React.createElement("td", {
                    className: "px-2 py-3 text-xs"
                }, e.regiao), React.createElement("td", {
                    className: "px-2 py-3 text-xs"
                }, e.cliente), React.createElement("td", {
                    className: "px-2 py-3 text-center text-xs font-semibold tabular-nums"
                }, er(e.valor_bonus)), React.createElement("td", {
                    className: "px-2 py-3 text-center text-xs"
                }, t ? React.createElement("span", {
                    className: a ? "text-red-800" : "text-gray-500"
                }, t.toLocaleDateString("pt-BR")) : "-"), 
                
                // Coluna de Progresso com barra e status
                React.createElement("td", {
                    className: "px-3 py-3"
                }, React.createElement("div", {
                    className: "flex flex-col items-center gap-1"
                }, 
                // Barra de progresso
                React.createElement("div", {
                    className: "w-full bg-gray-200 rounded-full h-2"
                }, React.createElement("div", {
                    className: "h-2 rounded-full transition-all " + (percentual >= 100 ? "bg-green-600" : percentual >= 50 ? "bg-amber-600" : "bg-amber-600"),
                    style: { width: percentual + "%" }
                })),
                // Texto do progresso
                React.createElement("span", {
                    className: "text-xs font-bold " + (percentual >= 100 ? "text-green-800" : "text-gray-500")
                }, totalEntregas, "/", metaEntregas),
                // Badge de status
                React.createElement("span", {
                    className: "fin-pill " + statusClasse
                }, statusTexto))),
                
                // Coluna de Crédito - botão aparece quando meta atingida
                React.createElement("td", {
                    className: "px-2 py-3 text-center"
                }, metaAtingida ? (
                    e.credito_lancado ? React.createElement("div", null, React.createElement("span", {
                        className: "text-xs text-blue-800 font-bold"
                    }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-wallet" })), "Lançado")), e.lancado_por && React.createElement("p", {
                        className: "text-xs text-gray-400"
                    }, e.lancado_por)) : React.createElement("button", {
                        onClick: async () => {
                            s(!0);
                            try {
                                if (!(await fetchAuth(`${API_URL}/inscricoes-novatos/${e.id}/credito`, {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                            credito_lancado: !0,
                                            lancado_por: l.fullName
                                        })
                                    })).ok) throw new Error("Erro ao creditar");
                                ja("Crédito lançado!", "success"), await Sl()
                            } catch (err) {
                                ja("Erro ao creditar", "error")
                            } finally {
                                s(!1)
                            }
                        },
                        className: "fin-btn fin-btn-p fin-btn-sm",
                        disabled: c
                    }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-wallet" })), "Lançar"))
                ) : React.createElement("span", {
                    className: "text-xs text-gray-400"
                }, "-")),
                
                // Coluna de Ações (deletar)
                React.createElement("td", {
                    className: "px-2 py-3 text-center"
                }, React.createElement("button", {
                    onClick: async () => {
                        if (!confirm("Tem certeza que deseja excluir esta inscrição?")) return;
                        s(!0);
                        try {
                            const resp = await fetchAuth(`${API_URL}/inscricoes-novatos/${e.id}`, {
                                method: "DELETE"
                            });
                            if (!resp.ok) throw new Error("Erro ao excluir");
                            ja("Inscrição excluída!", "success");
                            await Sl();
                        } catch (err) {
                            ja("Erro ao excluir inscrição", "error");
                        } finally {
                            s(!1);
                        }
                    },
                    className: "p-1.5 text-red-800 hover:bg-red-50 rounded-[10px] transition-colors",
                    disabled: c,
                    title: "Excluir inscrição"
                }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-trash" })))))
            })))))), "loja" === p.finTab && React.createElement(React.Fragment, null,
            /* FIN_ABAS_V1: Loja — cabeçalho, abas internas sublinhadas, cards/tabelas no padrão */
            window.FinUI.cabecalho("Loja Tutts", "Produtos à venda, estoque, pedidos dos profissionais e sugestões"),
            React.createElement("div", {
                className: "fin-card mb-6"
            }, React.createElement("div", {
                className: "flex gap-2 border-b border-gray-200 px-3 overflow-x-auto"
            }, ["produtos", "estoque", "pedidos", "sugestoes"].map(e => React.createElement("button", {
                key: e,
                onClick: () => {
                    mt(e), "estoque" === e && Ja(), "produtos" === e && (Ha(), Ja()), "pedidos" === e && Wa(), "sugestoes" === e && Ya()
                },
                className: "px-3 py-3 -mb-px text-sm border-b-2 whitespace-nowrap inline-flex items-center gap-1.5 " + (nt === e ? "border-purple-700 text-purple-800 font-semibold" : "border-transparent text-gray-500 hover:text-gray-700")
            }, "produtos" === e && React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-tag" })), "Produtos"), "estoque" === e && React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-package" })), "Estoque"), "pedidos" === e && React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-package" })), "Pedidos"), "sugestoes" === e && React.createElement(React.Fragment, null, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-bulb" })), "Sugestões"), ut.filter(e => "pendente" === e.status).length > 0 && React.createElement("span", {
                className: "ml-1 inline-grid place-items-center text-[11px] font-bold rounded-full",
                style: { minWidth: 20, height: 18, padding: "0 6px", background: "#f3e8fb", color: "#5d0b85" }
            }, ut.filter(e => "pendente" === e.status).length))))), React.createElement("div", {
                className: "p-6"
            }, "estoque" === nt && React.createElement(React.Fragment, null, React.createElement("div", {
                className: "flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6"
            }, React.createElement("div", null, React.createElement("h2", {
                className: "fin-sec-t"
            }, "Controle de Estoque"), React.createElement("p", {
                className: "text-sm text-gray-500"
            }, "Gerencie produtos, entradas e saídas")), React.createElement("div", {
                className: "flex gap-2"
            }, React.createElement("div", {
                className: "flex bg-gray-100 rounded-lg p-1"
            }, React.createElement("button", {
                onClick: () => {
                    xt("lista")
                },
                className: "px-3 py-1.5 rounded-[10px] text-sm font-semibold transition-all " + ("lista" === pt ? "bg-white text-purple-700" : "text-gray-500 hover:text-gray-900")
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clipboard" })), "Produtos")), React.createElement("button", {
                onClick: () => {
                    xt("movimentacoes"), Qa()
                },
                className: "px-3 py-1.5 rounded-[10px] text-sm font-semibold transition-all " + ("movimentacoes" === pt ? "bg-white text-purple-700" : "text-gray-500 hover:text-gray-900")
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-chart" })), "Histórico"))), React.createElement("button", {
                onClick: () => x({
                    ...p,
                    lojaEstoqueModal: !0,
                    lojaEstoqueEdit: null
                }),
                className: "fin-btn fin-btn-p"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-plus" })), "Novo Item")))), window.FinUI.kpis([ /* FIN_ABAS_V1: faixa única */
                { rotulo: "Total de itens", valor: Ze.length },
                { rotulo: "Itens ativos", valor: Ze.filter(e => "ativo" === e.status).length },
                { rotulo: "Qtd. total em estoque", valor: Ze.reduce((e, t) => t.tem_tamanho && t.tamanhos ? e + t.tamanhos.reduce((e, t) => e + (t.quantidade || 0), 0) : e + (t.quantidade || 0), 0) },
                { rotulo: "Valor total", valor: "R$ " + Ze.reduce((e, t) => {
                    const a = t.tem_tamanho && t.tamanhos ? t.tamanhos.reduce((e, t) => e + (t.quantidade || 0), 0) : t.quantidade || 0;
                    return e + parseFloat(t.valor) * a
                }, 0).toFixed(2).replace(".", ",") }
            ], { marginBottom: 24 }), "lista" === pt && React.createElement("div", {
                className: "grid gap-4"
            }, 0 === Ze.length ? React.createElement("p", {
                className: "text-gray-500 text-center py-8"
            }, "Nenhum item no estoque") : Ze.map(e => {
                const t = e.tem_tamanho && e.tamanhos ? e.tamanhos.reduce((e, t) => e + (t.quantidade || 0), 0) : e.quantidade || 0,
                    a = t > 0 && t <= 3,
                    l = 0 === t;
                return React.createElement("div", {
                    key: e.id,
                    className: "border rounded-[14px] p-4 bg-white " + (l ? "border-red-200" : a ? "border-amber-200" : "border-gray-200")
                }, React.createElement("div", {
                    className: "flex gap-4"
                }, e.imagem_url && React.createElement("img", {
                    src: e.imagem_url,
                    alt: e.nome,
                    className: "w-24 h-24 object-contain rounded-lg bg-gray-100"
                }), React.createElement("div", {
                    className: "flex-1"
                }, React.createElement("div", {
                    className: "flex justify-between items-start"
                }, React.createElement("div", null, React.createElement("h3", {
                    className: "font-bold text-gray-900 text-lg"
                }, e.nome), e.marca && React.createElement("p", {
                    className: "text-sm text-gray-500"
                }, "Marca: ", e.marca), React.createElement("p", {
                    className: "text-lg font-bold text-gray-900 tabular-nums"
                }, "R$ ", parseFloat(e.valor).toFixed(2).replace(".", ","))), React.createElement("div", {
                    className: "flex flex-col items-end gap-1"
                }, React.createElement("span", {
                    className: "fin-pill " + ("ativo" === e.status ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800")
                }, "ativo" === e.status ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), "Ativo") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })), "Inativo")), l && React.createElement("span", {
                    className: "fin-pill bg-red-50 text-red-800"
                }, "SEM ESTOQUE"), a && !l && React.createElement("span", {
                    className: "fin-pill bg-amber-50 text-amber-800"
                }, "ESTOQUE BAIXO"))), e.tem_tamanho && e.tamanhos && e.tamanhos.length > 0 ? React.createElement("div", {
                    className: "mt-3"
                }, React.createElement("p", {
                    className: "text-xs text-gray-500 mb-1"
                }, "Tamanhos em estoque:"), React.createElement("div", {
                    className: "flex flex-wrap gap-2"
                }, e.tamanhos.map(e => React.createElement("span", {
                    key: e.id,
                    className: "px-3 py-1 rounded-lg text-sm font-semibold " + (e.quantidade <= 0 ? "bg-red-50 text-red-800" : e.quantidade <= 3 ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-800")
                }, e.tamanho, ": ", React.createElement("strong", null, e.quantidade))))) : React.createElement("div", {
                    className: "mt-3 flex items-center gap-2"
                }, React.createElement("span", {
                    className: "text-sm text-gray-500"
                }, "Quantidade:"), React.createElement("span", {
                    className: "px-3 py-1 rounded-lg text-lg font-bold " + (e.quantidade <= 0 ? "bg-red-50 text-red-800" : e.quantidade <= 3 ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-800")
                }, e.quantidade))), React.createElement("div", {
                    className: "flex flex-col gap-2"
                }, React.createElement("button", {
                    onClick: () => x({
                        ...p,
                        lojaMovModal: !0,
                        lojaMovItem: e,
                        lojaMovTipo: "entrada"
                    }),
                    className: "fin-btn fin-btn-s fin-btn-sm"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-download" })), "Entrada")), React.createElement("button", {
                    onClick: () => x({
                        ...p,
                        lojaMovModal: !0,
                        lojaMovItem: e,
                        lojaMovTipo: "saida"
                    }),
                    className: "fin-btn fin-btn-d fin-btn-sm"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-upload" })), "Saída")), React.createElement("button", {
                    onClick: () => x({
                        ...p,
                        lojaEstoqueModal: !0,
                        lojaEstoqueEdit: e
                    }),
                    className: "fin-btn fin-btn-s fin-btn-sm"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-pencil" })), "Editar")), React.createElement("button", {
                    onClick: async () => {
                        confirm("Excluir este item do estoque?") && (await fetchAuth(`${API_URL}/loja/estoque/${e.id}`, {
                            method: "DELETE"
                        }), Ja(), ja("Item excluído!", "success"))
                    },
                    className: "fin-btn fin-btn-s fin-btn-sm"
                }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-trash" }))))))
            })), "movimentacoes" === pt && React.createElement("div", {
                className: "bg-white rounded-[14px] border border-gray-200"
            }, React.createElement("div", {
                className: "p-4 border-b"
            }, React.createElement("h3", {
                className: "font-bold text-gray-900"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-chart" })), "Histórico de Movimentações")), React.createElement("p", {
                className: "text-sm text-gray-500"
            }, "Todas as entradas e saídas do estoque")), React.createElement("div", {
                className: "overflow-x-auto"
            }, React.createElement("table", {
                className: "w-full text-sm fin-tbl"
            }, React.createElement("thead", {
                className: "bg-gray-50"
            }, React.createElement("tr", null, React.createElement("th", {
                className: "px-4 py-3 text-left"
            }, "Data/Hora"), React.createElement("th", {
                className: "px-4 py-3 text-left"
            }, "Produto"), React.createElement("th", {
                className: "px-4 py-3 text-center"
            }, "Tipo"), React.createElement("th", {
                className: "px-4 py-3 text-center"
            }, "Tam."), React.createElement("th", {
                className: "px-4 py-3 text-center"
            }, "Qtd."), React.createElement("th", {
                className: "px-4 py-3 text-left"
            }, "Motivo"), React.createElement("th", {
                className: "px-4 py-3 text-left"
            }, "Por"))), React.createElement("tbody", null, 0 === it.length ? React.createElement("tr", null, React.createElement("td", {
                colSpan: "7",
                className: "text-center py-8 text-gray-500"
            }, "Nenhuma movimentação registrada")) : it.map(e => React.createElement("tr", {
                key: e.id,
                className: "border-t hover:bg-gray-50"
            }, React.createElement("td", {
                className: "px-4 py-3 text-xs"
            }, new Date(e.created_at).toLocaleDateString("pt-BR"), React.createElement("br", null), React.createElement("span", {
                className: "text-gray-500"
            }, new Date(e.created_at).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit"
            }))), React.createElement("td", {
                className: "px-4 py-3"
            }, React.createElement("p", {
                className: "font-semibold"
            }, e.produto_nome), e.marca && React.createElement("p", {
                className: "text-xs text-gray-500"
            }, e.marca)), React.createElement("td", {
                className: "px-4 py-3 text-center"
            }, React.createElement("span", {
                className: "fin-pill " + ("entrada" === e.tipo ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800")
            }, "entrada" === e.tipo ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-download" })), "Entrada") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-upload" })), "Saída"))), React.createElement("td", {
                className: "px-4 py-3 text-center font-semibold"
            }, e.tamanho || "-"), React.createElement("td", {
                className: "px-4 py-3 text-center"
            }, React.createElement("span", {
                className: "text-lg font-bold " + ("entrada" === e.tipo ? "text-green-800" : "text-red-800")
            }, "entrada" === e.tipo ? "+" : "-", e.quantidade)), React.createElement("td", {
                className: "px-4 py-3 text-sm text-gray-500"
            }, e.motivo || "-"), React.createElement("td", {
                className: "px-4 py-3 text-sm"
            }, e.created_by || "-"))))))), p.lojaEstoqueModal && React.createElement("div", {
                className: "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            }, React.createElement("div", {
                className: "bg-white rounded-[14px] max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200"
            }, React.createElement("div", {
                className: "p-6"
            }, React.createElement("h2", {
                className: "text-base font-semibold text-gray-900 mb-4"
            }, p.lojaEstoqueEdit ? "Editar Item" : "Novo Item no Estoque"), React.createElement("div", {
                className: "space-y-4"
            }, React.createElement("div", null, React.createElement("label", {
                className: "fin-lbl"
            }, "Nome do Produto *"), React.createElement("input", {
                type: "text",
                value: p.lojaEstoqueNome ?? p.lojaEstoqueEdit?.nome ?? "",
                onChange: e => x({
                    ...p,
                    lojaEstoqueNome: e.target.value
                }),
                className: "w-full fin-inp",
                placeholder: "Ex: Camiseta Polo"
            })), React.createElement("div", {
                className: "grid grid-cols-2 gap-4"
            }, React.createElement("div", null, React.createElement("label", {
                className: "fin-lbl"
            }, "Marca"), React.createElement("input", {
                type: "text",
                value: p.lojaEstoqueMarca ?? p.lojaEstoqueEdit?.marca ?? "",
                onChange: e => x({
                    ...p,
                    lojaEstoqueMarca: e.target.value
                }),
                className: "w-full fin-inp",
                placeholder: "Ex: Nike"
            })), React.createElement("div", null, React.createElement("label", {
                className: "fin-lbl"
            }, "Valor (R$) *"), React.createElement("input", {
                type: "number",
                step: "0.01",
                value: p.lojaEstoqueValor ?? p.lojaEstoqueEdit?.valor ?? "",
                onChange: e => x({
                    ...p,
                    lojaEstoqueValor: e.target.value
                }),
                className: "w-full fin-inp",
                placeholder: "99.90"
            }))), React.createElement("div", null, React.createElement("label", {
                className: "fin-lbl"
            }, "Imagem do Produto"), React.createElement("div", {
                className: "space-y-2"
            }, (p.lojaEstoqueImagem || p.lojaEstoqueEdit?.imagem_url) && React.createElement("div", {
                className: "relative inline-block"
            }, React.createElement("img", {
                src: p.lojaEstoqueImagem || p.lojaEstoqueEdit?.imagem_url,
                alt: "Preview",
                className: "w-20 h-20 object-cover rounded-lg border"
            }), React.createElement("button", {
                type: "button",
                onClick: () => x({
                    ...p,
                    lojaEstoqueImagem: ""
                }),
                className: "absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full text-xs hover:bg-red-800"
            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })))), React.createElement("label", {
                className: "block cursor-pointer"
            }, React.createElement("div", {
                className: "px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-center font-semibold hover:bg-purple-200 transition-colors text-sm"
            }, p.uploadingEstoqueImage ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clock" })), "Enviando...") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-camera" })), "Fazer Upload")), React.createElement("input", {
                type: "file",
                accept: "image/*",
                className: "hidden",
                disabled: p.uploadingEstoqueImage,
                onChange: async e => {
                    const t = e.target.files?.[0];
                    if (t)
                        if (t.size > 15728640) ja("Imagem muito grande (máx 15MB)", "error");
                        else {
                            x({
                                ...p,
                                uploadingEstoqueImage: !0
                            });
                            try {
                                // 🛡️ 2026-04: usa imageUtils.compressImageSafe (memory-safe pra mobile)
                                const lerArquivo = window.imageUtils && window.imageUtils.compressImageSafe
                                    ? window.imageUtils.compressImageSafe(t, { maxWidth: 1280, quality: 0.8 })
                                    : new Promise((resolve, reject) => {
                                        const fr = new FileReader();
                                        fr.onload = ev => resolve(ev.target.result);
                                        fr.onerror = () => reject(new Error("Erro ao ler arquivo"));
                                        fr.readAsDataURL(t);
                                    });
                                lerArquivo.then(dataUrl => {
                                    x({
                                        ...p,
                                        lojaEstoqueImagem: dataUrl,
                                        uploadingEstoqueImage: !1
                                    });
                                    ja("Imagem carregada!", "success");
                                }).catch(e => {
                                    console.error("Erro upload:", e); ja("Erro ao carregar imagem", "error"); x({
                                        ...p,
                                        uploadingEstoqueImage: !1
                                    });
                                });
                            } catch (e) {
                                console.error("Erro upload:", e), ja("Erro ao carregar imagem", "error"), x({
                                    ...p,
                                    uploadingEstoqueImage: !1
                                })
                            }
                        }
                }
            })), React.createElement("details", {
                className: "text-xs"
            }, React.createElement("summary", {
                className: "cursor-pointer text-gray-500"
            }, "Ou cole uma URL"), React.createElement("input", {
                type: "text",
                placeholder: "https://...",
                value: p.lojaEstoqueImagem ?? p.lojaEstoqueEdit?.imagem_url ?? "",
                onChange: e => x({
                    ...p,
                    lojaEstoqueImagem: e.target.value
                }),
                className: "w-full mt-1 fin-inp"
            })))), React.createElement("div", {
                className: "flex items-center gap-2"
            }, React.createElement("input", {
                type: "checkbox",
                id: "temTamanho",
                checked: p.lojaEstoqueTemTamanho ?? p.lojaEstoqueEdit?.tem_tamanho ?? !1,
                onChange: e => x({
                    ...p,
                    lojaEstoqueTemTamanho: e.target.checked
                }),
                className: "w-5 h-5"
            }), React.createElement("label", {
                htmlFor: "temTamanho",
                className: "text-sm font-semibold"
            }, "Este produto tem tamanhos")), (p.lojaEstoqueTemTamanho ?? p.lojaEstoqueEdit?.tem_tamanho) && React.createElement("div", null, React.createElement("div", {
                className: "flex gap-2 mb-3"
            }, React.createElement("button", {
                type: "button",
                onClick: () => x({
                    ...p,
                    lojaEstoqueTipoTamanho: "letras"
                }),
                className: "flex-1 px-3 py-2 rounded-[10px] text-sm font-semibold border-2 " + ("letras" === (p.lojaEstoqueTipoTamanho ?? p.lojaEstoqueEdit?.tipo_tamanho ?? "letras") ? "border-purple-700 bg-purple-50 text-purple-800" : "border-gray-200 text-gray-500")
            }, "PP, P, M, G..."), React.createElement("button", {
                type: "button",
                onClick: () => x({
                    ...p,
                    lojaEstoqueTipoTamanho: "numeros"
                }),
                className: "flex-1 px-3 py-2 rounded-[10px] text-sm font-semibold border-2 " + ("numeros" === (p.lojaEstoqueTipoTamanho ?? p.lojaEstoqueEdit?.tipo_tamanho) ? "border-purple-700 bg-purple-50 text-purple-800" : "border-gray-200 text-gray-500")
            }, "Numeração (34, 36...)")), "letras" === (p.lojaEstoqueTipoTamanho ?? p.lojaEstoqueEdit?.tipo_tamanho ?? "letras") ? React.createElement(React.Fragment, null, React.createElement("label", {
                className: "fin-lbl"
            }, "Tamanhos e Quantidades"), React.createElement("div", {
                className: "grid grid-cols-2 gap-2"
            }, ["PP", "P", "M", "G", "GG", "XG", "XXG"].map(e => {
                const t = (p.lojaEstoqueEdit?.tamanhos || []).find(t => t.tamanho === e);
                return React.createElement("div", {
                    key: e,
                    className: "flex items-center gap-2 bg-gray-50 p-2 rounded"
                }, React.createElement("span", {
                    className: "w-10 text-sm font-bold text-purple-700"
                }, e), React.createElement("input", {
                    type: "number",
                    min: "0",
                    value: p[`lojaEstoqueTam_${e}`] ?? t?.quantidade ?? 0,
                    onChange: t => x({
                        ...p,
                        [`lojaEstoqueTam_${e}`]: parseInt(t.target.value) || 0
                    }),
                    className: "flex-1 text-center fin-inp",
                    placeholder: "0"
                }))
            }))) : React.createElement(React.Fragment, null, React.createElement("label", {
                className: "fin-lbl"
            }, "Numerações e Quantidades"), React.createElement("div", {
                className: "space-y-2"
            }, (p.lojaEstoqueNumeracoes ?? p.lojaEstoqueEdit?.tamanhos?.map(e => ({
                num: e.tamanho,
                qtd: e.quantidade
            })) ?? [{
                num: "",
                qtd: 0
            }]).map((e, t) => React.createElement("div", {
                key: t,
                className: "flex items-center gap-2"
            }, React.createElement("input", {
                type: "text",
                placeholder: "Ex: 38",
                value: e.num,
                onChange: e => {
                    const a = [...p.lojaEstoqueNumeracoes ?? p.lojaEstoqueEdit?.tamanhos?.map(e => ({
                        num: e.tamanho,
                        qtd: e.quantidade
                    })) ?? [{
                        num: "",
                        qtd: 0
                    }]];
                    a[t].num = e.target.value, x({
                        ...p,
                        lojaEstoqueNumeracoes: a
                    })
                },
                className: "w-20 text-center font-bold fin-inp"
            }), React.createElement("input", {
                type: "number",
                min: "0",
                placeholder: "Qtd",
                value: e.qtd,
                onChange: e => {
                    const a = [...p.lojaEstoqueNumeracoes ?? p.lojaEstoqueEdit?.tamanhos?.map(e => ({
                        num: e.tamanho,
                        qtd: e.quantidade
                    })) ?? [{
                        num: "",
                        qtd: 0
                    }]];
                    a[t].qtd = parseInt(e.target.value) || 0, x({
                        ...p,
                        lojaEstoqueNumeracoes: a
                    })
                },
                className: "w-20 text-center fin-inp"
            }), React.createElement("button", {
                type: "button",
                onClick: () => {
                    const e = [...p.lojaEstoqueNumeracoes ?? p.lojaEstoqueEdit?.tamanhos?.map(e => ({
                        num: e.tamanho,
                        qtd: e.quantidade
                    })) ?? [{
                        num: "",
                        qtd: 0
                    }]];
                    e.splice(t, 1), x({
                        ...p,
                        lojaEstoqueNumeracoes: e.length ? e : [{
                            num: "",
                            qtd: 0
                        }]
                    })
                },
                className: "fin-btn fin-btn-d fin-btn-sm"
            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-trash" }))))), React.createElement("button", {
                type: "button",
                onClick: () => {
                    const e = [...p.lojaEstoqueNumeracoes ?? p.lojaEstoqueEdit?.tamanhos?.map(e => ({
                        num: e.tamanho,
                        qtd: e.quantidade
                    })) ?? [{
                        num: "",
                        qtd: 0
                    }]];
                    e.push({
                        num: "",
                        qtd: 0
                    }), x({
                        ...p,
                        lojaEstoqueNumeracoes: e
                    })
                },
                className: "fin-btn fin-btn-s w-full"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-plus" })), "Adicionar Numeração"))))), !(p.lojaEstoqueTemTamanho ?? p.lojaEstoqueEdit?.tem_tamanho) && React.createElement("div", null, React.createElement("label", {
                className: "fin-lbl"
            }, "Quantidade em Estoque *"), React.createElement("input", {
                type: "number",
                min: "0",
                value: p.lojaEstoqueQtd ?? p.lojaEstoqueEdit?.quantidade ?? 0,
                onChange: e => x({
                    ...p,
                    lojaEstoqueQtd: parseInt(e.target.value) || 0
                }),
                className: "w-full fin-inp"
            }))), React.createElement("div", {
                className: "flex gap-3 mt-6"
            }, React.createElement("button", {
                onClick: () => x({
                    ...p,
                    lojaEstoqueModal: !1,
                    lojaEstoqueEdit: null,
                    lojaEstoqueNome: "",
                    lojaEstoqueMarca: "",
                    lojaEstoqueValor: "",
                    lojaEstoqueImagem: "",
                    lojaEstoqueTemTamanho: !1,
                    lojaEstoqueQtd: 0,
                    lojaEstoqueTipoTamanho: null,
                    lojaEstoqueNumeracoes: null
                }),
                className: "fin-btn fin-btn-s flex-1"
            }, "Cancelar"), React.createElement("button", {
                onClick: async () => {
                    const e = p.lojaEstoqueNome ?? p.lojaEstoqueEdit?.nome,
                        t = p.lojaEstoqueValor ?? p.lojaEstoqueEdit?.valor;
                    if (!e || !t) return void ja("Preencha nome e valor", "error");
                    const a = p.lojaEstoqueTemTamanho ?? p.lojaEstoqueEdit?.tem_tamanho,
                        r = p.lojaEstoqueTipoTamanho ?? p.lojaEstoqueEdit?.tipo_tamanho ?? "letras";
                    let o = [];
                    if (a)
                        if ("letras" === r)["PP", "P", "M", "G", "GG", "XG", "XXG"].forEach(e => {
                            const t = p[`lojaEstoqueTam_${e}`] ?? (p.lojaEstoqueEdit?.tamanhos || []).find(t => t.tamanho === e)?.quantidade ?? 0;
                            t > 0 && o.push({
                                tamanho: e,
                                quantidade: t
                            })
                        });
                        else {
                            (p.lojaEstoqueNumeracoes ?? p.lojaEstoqueEdit?.tamanhos?.map(e => ({
                                num: e.tamanho,
                                qtd: e.quantidade
                            })) ?? []).forEach(e => {
                                e.num && e.qtd > 0 && o.push({
                                    tamanho: e.num,
                                    quantidade: e.qtd
                                })
                            })
                        } const c = {
                        nome: e,
                        marca: p.lojaEstoqueMarca ?? p.lojaEstoqueEdit?.marca ?? "",
                        valor: parseFloat(t),
                        quantidade: a ? 0 : p.lojaEstoqueQtd ?? p.lojaEstoqueEdit?.quantidade ?? 0,
                        tem_tamanho: a,
                        tipo_tamanho: r,
                        tamanhos: o,
                        imagem_url: p.lojaEstoqueImagem ?? p.lojaEstoqueEdit?.imagem_url ?? "",
                        created_by: l.fullName
                    };
                    if (!!p.lojaEstoqueEdit) await fetchAuth(`${API_URL}/loja/estoque/${p.lojaEstoqueEdit.id}`, {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(c)
                    }), ja("Item atualizado!", "success");
                    else {
                        const e = await fetchAuth(`${API_URL}/loja/estoque`, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify(c)
                            }),
                            t = await e.json(),
                            r = a ? o.reduce((e, t) => e + t.quantidade, 0) : c.quantidade || 0;
                        r > 0 && await fetchAuth(`${API_URL}/loja/estoque/${t.id}/entrada`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                quantidade: r,
                                motivo: "Estoque inicial",
                                created_by: l.fullName
                            })
                        }), ja("Item adicionado!", "success")
                    }
                    x({
                        ...p,
                        lojaEstoqueModal: !1,
                        lojaEstoqueEdit: null,
                        lojaEstoqueNome: "",
                        lojaEstoqueMarca: "",
                        lojaEstoqueValor: "",
                        lojaEstoqueImagem: "",
                        lojaEstoqueTemTamanho: !1,
                        lojaEstoqueQtd: 0
                    }), Ja(), Qa()
                },
                className: "flex-1 fin-btn fin-btn-p"
            }, p.lojaEstoqueEdit ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-save" })), "Salvar") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-plus" })), "Adicionar")))))), p.lojaMovModal && React.createElement("div", {
                className: "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            }, React.createElement("div", {
                className: "bg-white rounded-[14px] max-w-md w-full border border-gray-200"
            }, React.createElement("div", {
                className: "p-4 border-b border-gray-200"
            }, React.createElement("h2", {
                className: "text-base font-semibold text-gray-900"
            }, "entrada" === p.lojaMovTipo ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-download" })), "Registrar Entrada") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-upload" })), "Registrar Saída")), React.createElement("p", {
                className: "text-sm text-gray-500"
            }, p.lojaMovItem?.nome)), React.createElement("div", {
                className: "p-6 space-y-4"
            }, p.lojaMovItem?.tem_tamanho && p.lojaMovItem?.tamanhos?.length > 0 && React.createElement("div", null, React.createElement("label", {
                className: "fin-lbl"
            }, "Tamanho"), React.createElement("select", {
                value: p.lojaMovTamanho || "",
                onChange: e => x({
                    ...p,
                    lojaMovTamanho: e.target.value
                }),
                className: "w-full fin-inp"
            }, React.createElement("option", {
                value: ""
            }, "Selecione o tamanho"), p.lojaMovItem.tamanhos.map(e => React.createElement("option", {
                key: e.tamanho,
                value: e.tamanho
            }, e.tamanho, " (atual: ", e.quantidade, ")")))), React.createElement("div", null, React.createElement("label", {
                className: "fin-lbl"
            }, "Quantidade *"), React.createElement("input", {
                type: "number",
                min: "1",
                value: p.lojaMovQtd || "",
                onChange: e => x({
                    ...p,
                    lojaMovQtd: parseInt(e.target.value) || 0
                }),
                className: "w-full text-2xl font-bold text-center fin-inp",
                placeholder: "0"
            })), React.createElement("div", null, React.createElement("label", {
                className: "fin-lbl"
            }, "Motivo"), React.createElement("input", {
                type: "text",
                value: p.lojaMovMotivo || "",
                onChange: e => x({
                    ...p,
                    lojaMovMotivo: e.target.value
                }),
                className: "w-full fin-inp",
                placeholder: "entrada" === p.lojaMovTipo ? "Ex: Compra de fornecedor" : "Ex: Produto danificado"
            })), React.createElement("div", {
                className: "flex gap-3 mt-6"
            }, React.createElement("button", {
                onClick: () => x({
                    ...p,
                    lojaMovModal: !1,
                    lojaMovItem: null,
                    lojaMovTipo: null,
                    lojaMovQtd: 0,
                    lojaMovMotivo: "",
                    lojaMovTamanho: ""
                }),
                className: "fin-btn fin-btn-s flex-1"
            }, "Cancelar"), React.createElement("button", {
                onClick: async () => {
                    if (!p.lojaMovQtd || p.lojaMovQtd <= 0) return void ja("Informe a quantidade", "error");
                    if (p.lojaMovItem?.tem_tamanho && !p.lojaMovTamanho) return void ja("Selecione o tamanho", "error");
                    const e = "entrada" === p.lojaMovTipo ? "entrada" : "saida";
                    await fetchAuth(`${API_URL}/loja/estoque/${p.lojaMovItem.id}/${e}`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            quantidade: p.lojaMovQtd,
                            tamanho: p.lojaMovTamanho || null,
                            motivo: p.lojaMovMotivo || ("entrada" === p.lojaMovTipo ? "Entrada manual" : "Saída manual"),
                            created_by: l.fullName
                        })
                    }), ja("entrada" === p.lojaMovTipo ? "Entrada registrada!" : "Saída registrada!", "success"), x({
                        ...p,
                        lojaMovModal: !1,
                        lojaMovItem: null,
                        lojaMovTipo: null,
                        lojaMovQtd: 0,
                        lojaMovMotivo: "",
                        lojaMovTamanho: ""
                    }), Ja(), Qa()
                },
                className: "flex-1 fin-btn " + ("entrada" === p.lojaMovTipo ? "fin-btn-p" : "fin-btn-d")
            }, "entrada" === p.lojaMovTipo ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-download" })), "Confirmar Entrada") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-upload" })), "Confirmar Saída"))))))), "produtos" === nt && React.createElement(React.Fragment, null, React.createElement("div", {
                className: "flex justify-between items-center mb-6"
            }, React.createElement("h2", {
                className: "fin-sec-t"
            }, "Produtos à Venda"), React.createElement("button", {
                onClick: () => {
                    Ja(), x({
                        ...p,
                        lojaProdutoModal: !0,
                        lojaProdutoEdit: null
                    })
                },
                className: "fin-btn fin-btn-p"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-plus" })), "Novo Produto"))), React.createElement("div", {
                className: "grid md:grid-cols-2 lg:grid-cols-3 gap-4"
            }, 0 === Ke.length ? React.createElement("p", {
                className: "text-gray-500 text-center py-8 col-span-full"
            }, "Nenhum produto cadastrado") : Ke.map(e => React.createElement("div", {
                key: e.id,
                className: "border border-gray-200 rounded-[14px] overflow-hidden bg-white " + ("ativo" !== e.status ? "opacity-60" : "")
            }, e.imagem_url && React.createElement("img", {
                src: e.imagem_url,
                alt: e.nome,
                className: "w-full h-40 object-cover"
            }), React.createElement("div", {
                className: "p-4"
            }, React.createElement("div", {
                className: "flex justify-between items-start mb-2"
            }, React.createElement("h3", {
                className: "font-bold text-gray-900"
            }, e.nome), React.createElement("span", {
                className: "fin-pill " + ("ativo" === e.status ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800")
            }, "ativo" === e.status ? "Ativo" : "Inativo")), e.marca && React.createElement("p", {
                className: "text-sm text-gray-500"
            }, e.marca), React.createElement("p", {
                className: "text-xl font-bold text-gray-900 mt-2 tabular-nums"
            }, "R$ ", parseFloat(e.valor).toFixed(2).replace(".", ",")), React.createElement("div", {
                className: "mt-3 text-xs text-gray-500"
            }, e.parcelas_config && e.parcelas_config.filter(e => e && parseFloat(e.valor_parcela) > 0).length > 0 ? React.createElement("div", {
                className: "flex flex-wrap gap-1"
            }, e.parcelas_config.filter(e => e && parseFloat(e.valor_parcela) > 0).map((e, t) => React.createElement("span", {
                key: t,
                className: "bg-purple-50 text-purple-800 px-2 py-0.5 rounded-full"
            }, e.parcelas, "x R$ ", parseFloat(e.valor_parcela).toFixed(2).replace(".", ",")))) : React.createElement("p", {
                className: "text-gray-400"
            }, "Sem parcelas configuradas")), React.createElement("div", {
                className: "flex gap-2 mt-3"
            }, React.createElement("button", {
                onClick: () => x({
                    ...p,
                    lojaProdutoModal: !0,
                    lojaProdutoEdit: e
                }),
                className: "fin-btn fin-btn-s fin-btn-sm flex-1"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-pencil" })), "Editar")), React.createElement("button", {
                onClick: async () => {
                    confirm("Excluir este produto?") && (await fetchAuth(`${API_URL}/loja/produtos/${e.id}`, {
                        method: "DELETE"
                    }), Ha(), ja("Produto excluído!", "success"))
                },
                className: "fin-btn fin-btn-d fin-btn-sm"
            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-trash" })))))))), p.lojaProdutoModal && React.createElement("div", {
                className: "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            }, React.createElement("div", {
                className: "bg-white rounded-[14px] max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200"
            }, React.createElement("div", {
                className: "p-6"
            }, React.createElement("h2", {
                className: "text-base font-semibold text-gray-900 mb-4"
            }, p.lojaProdutoEdit ? "Editar Produto" : "Novo Produto à Venda"), React.createElement("div", {
                className: "space-y-4"
            }, React.createElement("div", null, React.createElement("label", {
                className: "fin-lbl"
            }, "Produto do Estoque *"), React.createElement("select", {
                value: p.lojaProdutoEstoqueId ?? p.lojaProdutoEdit?.estoque_id ?? "",
                onChange: e => {
                    const t = Ze.find(t => t.id === parseInt(e.target.value));
                    x({
                        ...p,
                        lojaProdutoEstoqueId: e.target.value,
                        lojaProdutoNome: t?.nome || "",
                        lojaProdutoMarca: t?.marca || "",
                        lojaProdutoValor: t?.valor || "",
                        lojaProdutoImagem: t?.imagem_url || ""
                    })
                },
                className: "w-full fin-inp"
            }, React.createElement("option", {
                value: ""
            }, "Selecione..."), Ze.filter(e => "ativo" === e.status).map(e => React.createElement("option", {
                key: e.id,
                value: e.id
            }, e.nome, " - R$ ", parseFloat(e.valor).toFixed(2))))), React.createElement("div", null, React.createElement("label", {
                className: "fin-lbl"
            }, "Nome do Produto *"), React.createElement("input", {
                type: "text",
                value: p.lojaProdutoNome ?? p.lojaProdutoEdit?.nome ?? "",
                onChange: e => x({
                    ...p,
                    lojaProdutoNome: e.target.value
                }),
                className: "w-full fin-inp"
            })), React.createElement("div", null, React.createElement("label", {
                className: "fin-lbl"
            }, "Descrição"), React.createElement("textarea", {
                value: p.lojaProdutoDesc ?? p.lojaProdutoEdit?.descricao ?? "",
                onChange: e => x({
                    ...p,
                    lojaProdutoDesc: e.target.value
                }),
                className: "w-full fin-inp",
                rows: 3,
                placeholder: "Descreva o produto..."
            })), React.createElement("div", {
                className: "grid grid-cols-2 gap-4"
            }, React.createElement("div", null, React.createElement("label", {
                className: "fin-lbl"
            }, "Marca"), React.createElement("input", {
                type: "text",
                value: p.lojaProdutoMarca ?? p.lojaProdutoEdit?.marca ?? "",
                onChange: e => x({
                    ...p,
                    lojaProdutoMarca: e.target.value
                }),
                className: "w-full fin-inp"
            })), React.createElement("div", null, React.createElement("label", {
                className: "fin-lbl"
            }, "Valor Original (R$)"), React.createElement("input", {
                type: "number",
                step: "0.01",
                value: p.lojaProdutoValor ?? p.lojaProdutoEdit?.valor ?? "",
                onChange: e => x({
                    ...p,
                    lojaProdutoValor: e.target.value
                }),
                className: "w-full fin-inp"
            }))), React.createElement("div", null, React.createElement("label", {
                className: "fin-lbl"
            }, "Imagem do Produto"), React.createElement("div", {
                className: "space-y-2"
            }, (p.lojaProdutoImagem || p.lojaProdutoEdit?.imagem_url) && React.createElement("div", {
                className: "relative inline-block"
            }, React.createElement("img", {
                src: p.lojaProdutoImagem || p.lojaProdutoEdit?.imagem_url,
                alt: "Preview",
                className: "w-24 h-24 object-cover rounded-lg border"
            }), React.createElement("button", {
                type: "button",
                onClick: () => x({
                    ...p,
                    lojaProdutoImagem: ""
                }),
                className: "absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full text-xs hover:bg-red-800"
            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })))), React.createElement("div", {
                className: "flex gap-2"
            }, React.createElement("label", {
                className: "flex-1 cursor-pointer"
            }, React.createElement("div", {
                className: "px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-center font-semibold hover:bg-purple-200 transition-colors"
            }, p.uploadingImage ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clock" })), "Enviando...") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-camera" })), "Fazer Upload")), React.createElement("input", {
                type: "file",
                accept: "image/*",
                className: "hidden",
                disabled: p.uploadingImage,
                onChange: async e => {
                    const t = e.target.files?.[0];
                    if (t)
                        if (t.size > 15728640) ja("Imagem muito grande (máx 15MB)", "error");
                        else {
                            x({
                                ...p,
                                uploadingImage: !0
                            });
                            try {
                                // 🛡️ 2026-04: usa imageUtils.compressImageSafe (memory-safe pra mobile)
                                const lerArquivo = window.imageUtils && window.imageUtils.compressImageSafe
                                    ? window.imageUtils.compressImageSafe(t, { maxWidth: 1280, quality: 0.8 })
                                    : new Promise((resolve, reject) => {
                                        const fr = new FileReader();
                                        fr.onload = ev => resolve(ev.target.result);
                                        fr.onerror = () => reject(new Error("Erro ao ler arquivo"));
                                        fr.readAsDataURL(t);
                                    });
                                lerArquivo.then(dataUrl => {
                                    x({
                                        ...p,
                                        lojaProdutoImagem: dataUrl,
                                        uploadingImage: !1
                                    });
                                    ja("Imagem carregada!", "success");
                                }).catch(e => {
                                    console.error("Erro upload:", e); ja("Erro ao carregar imagem", "error"); x({
                                        ...p,
                                        uploadingImage: !1
                                    });
                                });
                            } catch (e) {
                                console.error("Erro upload:", e), ja("Erro ao carregar imagem", "error"), x({
                                    ...p,
                                    uploadingImage: !1
                                })
                            }
                        }
                }
            }))), React.createElement("details", {
                className: "text-sm"
            }, React.createElement("summary", {
                className: "cursor-pointer text-gray-500 hover:text-gray-700"
            }, "Ou cole uma URL"), React.createElement("input", {
                type: "text",
                placeholder: "https://...",
                value: p.lojaProdutoImagem ?? p.lojaProdutoEdit?.imagem_url ?? "",
                onChange: e => x({
                    ...p,
                    lojaProdutoImagem: e.target.value
                }),
                className: "w-full mt-2 fin-inp"
            })))), React.createElement("div", {
                className: "bg-purple-50 rounded-lg p-4"
            }, React.createElement("div", {
                className: "flex justify-between items-center mb-3"
            }, React.createElement("h3", {
                className: "font-bold text-purple-800"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-wallet" })), "Opções de Parcelamento")), React.createElement("button", {
                type: "button",
                onClick: () => {
                    const e = p.lojaProdutoParcelas ?? (p.lojaProdutoEdit?.parcelas_config ? [...p.lojaProdutoEdit.parcelas_config] : []);
                    x({
                        ...p,
                        lojaProdutoParcelas: [...e, {
                            parcelas: 1,
                            valor_parcela: ""
                        }]
                    })
                },
                className: "fin-btn fin-btn-p fin-btn-sm"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-plus" })), "Adicionar"))), React.createElement("div", {
                className: "space-y-2"
            }, 0 === ((p.lojaProdutoParcelas ?? p.lojaProdutoEdit?.parcelas_config) || []).length ? React.createElement("p", {
                className: "text-sm text-gray-500 text-center py-3 bg-white rounded-lg"
            }, "Nenhuma opção de parcelamento.", React.createElement("br", null), 'Clique em "Adicionar" acima.') : ((p.lojaProdutoParcelas ?? p.lojaProdutoEdit?.parcelas_config) || []).map((e, t) => React.createElement("div", {
                key: t,
                className: "flex gap-2 items-center bg-white p-3 rounded-lg border"
            }, React.createElement("div", {
                className: "w-24"
            }, React.createElement("label", {
                className: "block text-xs text-gray-500 mb-1"
            }, "Parcelas"), React.createElement("select", {
                value: e.parcelas || 1,
                onChange: e => {
                    const a = [...(p.lojaProdutoParcelas ?? p.lojaProdutoEdit?.parcelas_config) || []];
                    a[t] = {
                        ...a[t],
                        parcelas: parseInt(e.target.value)
                    }, x({
                        ...p,
                        lojaProdutoParcelas: a
                    })
                },
                className: "w-full fin-inp"
            }, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(e => React.createElement("option", {
                key: e,
                value: e
            }, e, "x")))), React.createElement("div", {
                className: "flex-1"
            }, React.createElement("label", {
                className: "block text-xs text-gray-500 mb-1"
            }, "Valor da Parcela (R$)"), React.createElement("input", {
                type: "number",
                step: "0.01",
                value: e.valor_parcela ?? "",
                onChange: e => {
                    const a = [...(p.lojaProdutoParcelas ?? p.lojaProdutoEdit?.parcelas_config) || []];
                    a[t] = {
                        ...a[t],
                        valor_parcela: e.target.value
                    }, x({
                        ...p,
                        lojaProdutoParcelas: a
                    })
                },
                className: "w-full fin-inp",
                placeholder: "0.00"
            })), React.createElement("div", {
                className: "w-24 text-right"
            }, React.createElement("label", {
                className: "block text-xs text-gray-500 mb-1"
            }, "Total"), React.createElement("span", {
                className: "text-sm font-bold text-green-800"
            }, "R$ ", ((e.parcelas || 1) * (parseFloat(e.valor_parcela) || 0)).toFixed(2).replace(".", ","))), React.createElement("button", {
                type: "button",
                onClick: () => {
                    const e = [...(p.lojaProdutoParcelas ?? p.lojaProdutoEdit?.parcelas_config) || []];
                    e.splice(t, 1), x({
                        ...p,
                        lojaProdutoParcelas: e
                    })
                },
                className: "p-2 text-red-800 hover:bg-red-50 rounded"
            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-trash" })))))))), React.createElement("div", {
                className: "flex gap-3 mt-6"
            }, React.createElement("button", {
                onClick: () => x({
                    ...p,
                    lojaProdutoModal: !1,
                    lojaProdutoEdit: null,
                    lojaProdutoParcelas: null
                }),
                className: "fin-btn fin-btn-s flex-1"
            }, "Cancelar"), React.createElement("button", {
                onClick: async () => {
                    const e = p.lojaProdutoNome ?? p.lojaProdutoEdit?.nome,
                        t = p.lojaProdutoValor ?? p.lojaProdutoEdit?.valor;
                    if (!e || !t) return void ja("Preencha nome e valor", "error");
                    const a = p.lojaProdutoParcelas ?? p.lojaProdutoEdit?.parcelas_config ?? [];
                    if (0 === a.length) return void ja("Adicione pelo menos uma opção de parcelamento", "error");
                    for (const e of a)
                        if (!e.valor_parcela || parseFloat(e.valor_parcela) <= 0) return void ja("Preencha o valor de todas as parcelas", "error");
                    const r = {
                        estoque_id: p.lojaProdutoEstoqueId ?? p.lojaProdutoEdit?.estoque_id,
                        nome: e,
                        descricao: p.lojaProdutoDesc ?? p.lojaProdutoEdit?.descricao ?? "",
                        marca: p.lojaProdutoMarca ?? p.lojaProdutoEdit?.marca ?? "",
                        valor: parseFloat(t),
                        imagem_url: p.lojaProdutoImagem ?? p.lojaProdutoEdit?.imagem_url ?? "",
                        parcelas_config: a.map(e => ({
                            parcelas: parseInt(e.parcelas) || 1,
                            valor_parcela: parseFloat(e.valor_parcela) || 0
                        })),
                        created_by: l.fullName
                    };
                    p.lojaProdutoEdit ? (await fetchAuth(`${API_URL}/loja/produtos/${p.lojaProdutoEdit.id}`, {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            ...r,
                            status: p.lojaProdutoEdit.status
                        })
                    }), ja("Produto atualizado!", "success")) : (await fetchAuth(`${API_URL}/loja/produtos`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(r)
                    }), ja("Produto adicionado!", "success")), x({
                        ...p,
                        lojaProdutoModal: !1,
                        lojaProdutoEdit: null,
                        lojaProdutoParcelas: null
                    }), Ha()
                },
                className: "fin-btn fin-btn-p flex-1"
            }, p.lojaProdutoEdit ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-save" })), "Salvar") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-plus" })), "Adicionar"))))))), "pedidos" === nt && React.createElement(React.Fragment, null, React.createElement("h2", {
                className: "fin-sec-t mb-4"
            }, "Pedidos"), React.createElement("div", {
                className: "overflow-x-auto"
            }, React.createElement("table", {
                className: "w-full text-sm fin-tbl"
            }, React.createElement("thead", {
                className: "bg-gray-50"
            }, React.createElement("tr", null, React.createElement("th", {
                className: "px-3 py-3 text-left"
            }, "Data"), React.createElement("th", {
                className: "px-3 py-3 text-left"
            }, "Profissional"), React.createElement("th", {
                className: "px-3 py-3 text-left"
            }, "Produto"), React.createElement("th", {
                className: "px-3 py-3 text-center"
            }, "Tam."), React.createElement("th", {
                className: "px-3 py-3 text-right"
            }, "Valor"), React.createElement("th", {
                className: "px-3 py-3 text-center"
            }, "Parcelas"), React.createElement("th", {
                className: "px-3 py-3 text-center"
            }, "Status"), React.createElement("th", {
                className: "px-3 py-3 text-center"
            }, "Débito Lançado"), React.createElement("th", {
                className: "px-3 py-3 text-center"
            }, "Ações"))), React.createElement("tbody", null, 0 === et.length ? React.createElement("tr", null, React.createElement("td", {
                colSpan: "9",
                className: "text-center py-8 text-gray-500"
            }, "Nenhum pedido")) : et.map(e => React.createElement("tr", {
                key: e.id,
                className: "border-t hover:bg-gray-50"
            }, React.createElement("td", {
                className: "px-3 py-3 text-xs"
            }, new Date(e.created_at).toLocaleDateString("pt-BR")), React.createElement("td", {
                className: "px-3 py-3"
            }, React.createElement("p", {
                className: "font-semibold text-sm"
            }, e.user_name), React.createElement("p", {
                className: "text-xs text-gray-500"
            }, "COD: ", e.user_cod)), React.createElement("td", {
                className: "px-3 py-3 text-sm"
            }, e.produto_nome), React.createElement("td", {
                className: "px-3 py-3 text-center font-bold"
            }, e.tamanho || "-"), React.createElement("td", {
                className: "px-3 py-3 text-right"
            }, React.createElement("p", {
                className: "font-bold"
            }, "R$ ", parseFloat(e.valor_final).toFixed(2).replace(".", ",")), e.parcelas > 1 && React.createElement("p", {
                className: "text-xs text-gray-500"
            }, e.parcelas, "x R$ ", parseFloat(e.valor_parcela).toFixed(2).replace(".", ","))), React.createElement("td", {
                className: "px-3 py-3 text-center text-xs"
            }, e.tipo_abatimento), React.createElement("td", {
                className: "px-3 py-3 text-center"
            }, React.createElement("span", {
                className: "fin-pill " + ("pendente" === e.status ? "bg-amber-50 text-amber-800" : "aprovado" === e.status ? "bg-green-50 text-green-800" : "rejeitado" === e.status ? "bg-red-50 text-red-800" : "bg-gray-100 text-gray-700")
            }, "pendente" === e.status ? "Pendente" : "aprovado" === e.status ? "Aprovado" : "rejeitado" === e.status ? "Recusado" : (e.status || "—")), e.observacao && "rejeitado" === e.status && React.createElement("p", {
                className: "text-xs text-red-800 mt-1 max-w-[100px] truncate",
                title: e.observacao
            }, e.observacao)), React.createElement("td", {
                className: "px-3 py-3 text-center"
            }, "aprovado" === e.status && React.createElement("div", {
                className: "flex flex-col items-center"
            }, React.createElement("input", {
                type: "checkbox",
                checked: e.debito_lancado || !1,
                onChange: async t => {
                    await fetchAuth(`${API_URL}/loja/pedidos/${e.id}`, {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            debito_lancado: t.target.checked,
                            debito_lancado_em: t.target.checked ? (new Date).toISOString() : null,
                            debito_lancado_por: t.target.checked ? l.fullName : null
                        })
                    }), Wa(), ja(t.target.checked ? "Débito marcado!" : "Débito desmarcado", "success")
                },
                className: "w-4 h-4 accent-purple-700"
            }), e.debito_lancado && e.debito_lancado_em && React.createElement("p", {
                className: "text-xs text-gray-500 mt-1"
            }, new Date(e.debito_lancado_em).toLocaleDateString("pt-BR"), React.createElement("br", null), new Date(e.debito_lancado_em).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit"
            }))), "aprovado" !== e.status && React.createElement("span", {
                className: "text-gray-400"
            }, "-")), React.createElement("td", {
                className: "px-3 py-3 text-center"
            }, React.createElement("div", {
                className: "flex gap-1 justify-center"
            }, "pendente" === e.status && React.createElement(React.Fragment, null, React.createElement("button", {
                onClick: async () => {
                    await fetchAuth(`${API_URL}/loja/pedidos/${e.id}`, {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            status: "aprovado",
                            admin_id: l.codProfissional,
                            admin_name: l.fullName
                        })
                    }), Wa(), ja("Pedido aprovado!", "success")
                },
                className: "fin-btn fin-btn-p fin-btn-sm",
                title: "Aprovar", "aria-label": "Aprovar pedido"
            }, React.createElement("svg", { className: "ico", style: { width: 15, height: 15 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), "Aprovar"), React.createElement("button", {
                onClick: async () => {
                    const t = prompt("Motivo da rejeição:");
                    t && (await fetchAuth(`${API_URL}/loja/pedidos/${e.id}`, {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            status: "rejeitado",
                            admin_id: l.codProfissional,
                            admin_name: l.fullName,
                            observacao: t
                        })
                    }), Wa(), ja("Pedido rejeitado", "success"))
                },
                className: "fin-btn fin-btn-d fin-btn-sm",
                title: "Rejeitar"
            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })))), React.createElement("button", {
                onClick: () => x({
                    ...p,
                    lojaPedidoDeleteConfirm: e
                }),
                className: "fin-btn fin-btn-s fin-btn-sm",
                title: "Excluir"
            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-trash" })))))))))), p.lojaPedidoDeleteConfirm && React.createElement("div", {
                className: "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            }, React.createElement("div", {
                className: "bg-white rounded-[14px] p-6 max-w-md w-full border border-gray-200"
            }, React.createElement("h3", {
                className: "text-base font-semibold text-gray-900 mb-2"
            }, "Excluir Pedido"), React.createElement("p", {
                className: "text-gray-700 mb-4"
            }, "Tem certeza que deseja excluir este pedido?"), React.createElement("div", {
                className: "bg-gray-50 rounded-lg p-4 mb-4"
            }, React.createElement("p", {
                className: "text-sm"
            }, React.createElement("strong", null, "Profissional:"), " ", p.lojaPedidoDeleteConfirm.user_name), React.createElement("p", {
                className: "text-sm"
            }, React.createElement("strong", null, "Produto:"), " ", p.lojaPedidoDeleteConfirm.produto_nome), React.createElement("p", {
                className: "text-sm"
            }, React.createElement("strong", null, "Valor:"), " R$ ", parseFloat(p.lojaPedidoDeleteConfirm.valor_final).toFixed(2).replace(".", ",")), React.createElement("p", {
                className: "text-sm"
            }, React.createElement("strong", null, "Status:"), " ", p.lojaPedidoDeleteConfirm.status)), React.createElement("p", {
                className: "text-red-800 text-sm mb-4 font-semibold"
            }, "Esta ação não pode ser desfeita!"), React.createElement("div", {
                className: "flex gap-3"
            }, React.createElement("button", {
                onClick: () => x({
                    ...p,
                    lojaPedidoDeleteConfirm: null
                }),
                className: "fin-btn fin-btn-s flex-1"
            }, "Cancelar"), React.createElement("button", {
                onClick: async () => {
                    await fetchAuth(`${API_URL}/loja/pedidos/${p.lojaPedidoDeleteConfirm.id}`, {
                        method: "DELETE"
                    }), x({
                        ...p,
                        lojaPedidoDeleteConfirm: null
                    }), Wa(), ja("Pedido excluído!", "success")
                },
                className: "fin-btn fin-btn-d flex-1"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-trash" })), "Excluir")))))), "sugestoes" === nt && React.createElement(React.Fragment, null, React.createElement("div", {
                className: "flex justify-between items-center mb-6"
            }, React.createElement("div", null, React.createElement("h2", {
                className: "fin-sec-t"
            }, "Sugestões de Produtos"), React.createElement("p", {
                className: "text-sm text-gray-500"
            }, "Veja o que os profissionais gostariam de ter na loja")), React.createElement("div", {
                className: "flex gap-2 text-sm"
            }, React.createElement("span", {
                className: "fin-pill bg-amber-50 text-amber-800"
            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clock" })), ut.filter(e => "pendente" === e.status).length, " Pendentes"), React.createElement("span", {
                className: "fin-pill bg-green-50 text-green-800"
            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), ut.filter(e => "respondido" === e.status).length, " Respondidas"))), React.createElement("div", {
                className: "space-y-4"
            }, 0 === ut.length ? React.createElement("p", {
                className: "text-gray-500 text-center py-8"
            }, "Nenhuma sugestão recebida") : ut.map(e => React.createElement("div", {
                key: e.id,
                className: "border border-gray-200 rounded-[14px] p-4 bg-white"
            }, React.createElement("div", {
                className: "flex justify-between items-start gap-4"
            }, React.createElement("div", {
                className: "flex-1"
            }, React.createElement("div", {
                className: "flex items-center gap-2 mb-2"
            }, React.createElement("span", {
                className: "font-bold text-gray-900"
            }, e.user_name), React.createElement("span", {
                className: "text-xs text-gray-500"
            }, "COD: ", e.user_cod), React.createElement("span", {
                className: "fin-pill " + ("pendente" === e.status ? "bg-amber-50 text-amber-800" : "respondido" === e.status ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800")
            }, "pendente" === e.status ? "Pendente" : "respondido" === e.status ? "Respondido" : "Recusado")), React.createElement("p", {
                className: "text-gray-700 bg-gray-50 p-3 rounded-[10px]"
            }, e.sugestao), React.createElement("p", {
                className: "text-xs text-gray-500 mt-2"
            }, "Enviado em ", new Date(e.created_at).toLocaleDateString("pt-BR"), " às ", new Date(e.created_at).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit"
            })), e.resposta && React.createElement("div", {
                className: "mt-3 p-3 rounded-lg " + ("respondido" === e.status ? "bg-green-50" : "bg-red-50")
            }, React.createElement("p", {
                className: "text-xs font-semibold text-gray-700"
            }, "Resposta de ", e.respondido_por, ":"), React.createElement("p", {
                className: "text-sm text-gray-900 mt-1"
            }, e.resposta))), "pendente" === e.status && React.createElement("div", {
                className: "flex flex-col gap-2"
            }, React.createElement("button", {
                onClick: () => x({
                    ...p,
                    lojaSugestaoResponder: e,
                    lojaSugestaoResposta: ""
                }),
                className: "fin-btn fin-btn-p fin-btn-sm"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), "Responder")), React.createElement("button", {
                onClick: () => x({
                    ...p,
                    lojaSugestaoRecusar: e,
                    lojaSugestaoResposta: ""
                }),
                className: "fin-btn fin-btn-d fin-btn-sm"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })), "Recusar")), React.createElement("button", {
                onClick: async () => {
                    confirm("Excluir esta sugestão?") && (await fetchAuth(`${API_URL}/loja/sugestoes/${e.id}`, {
                        method: "DELETE"
                    }), Ya(), ja("Sugestão excluída!", "success"))
                },
                className: "fin-btn fin-btn-s fin-btn-sm"
            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-trash" })))))))), p.lojaSugestaoResponder && React.createElement("div", {
                className: "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            }, React.createElement("div", {
                className: "bg-white rounded-[14px] max-w-md w-full border border-gray-200"
            }, React.createElement("div", {
                className: "p-4 border-b border-gray-200"
            }, React.createElement("h2", {
                className: "text-base font-semibold text-gray-900"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), "Responder Sugestão"))), React.createElement("div", {
                className: "p-6"
            }, React.createElement("div", {
                className: "bg-gray-50 p-3 rounded-lg mb-4"
            }, React.createElement("p", {
                className: "text-sm text-gray-500"
            }, React.createElement("strong", null, p.lojaSugestaoResponder.user_name, ":")), React.createElement("p", {
                className: "text-gray-900"
            }, p.lojaSugestaoResponder.sugestao)), React.createElement("textarea", {
                value: p.lojaSugestaoResposta || "",
                onChange: e => x({
                    ...p,
                    lojaSugestaoResposta: e.target.value
                }),
                placeholder: "Escreva sua resposta... Ex: Ótima sugestão! Vamos providenciar esse produto.",
                className: "w-full h-24 resize-none fin-inp"
            }), React.createElement("div", {
                className: "flex gap-3 mt-4"
            }, React.createElement("button", {
                onClick: () => x({
                    ...p,
                    lojaSugestaoResponder: null,
                    lojaSugestaoResposta: ""
                }),
                className: "fin-btn fin-btn-s flex-1"
            }, "Cancelar"), React.createElement("button", {
                onClick: async () => {
                    await fetchAuth(`${API_URL}/loja/sugestoes/${p.lojaSugestaoResponder.id}`, {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            status: "respondido",
                            resposta: p.lojaSugestaoResposta || "Obrigado pela sugestão!",
                            respondido_por: l.fullName
                        })
                    }), ja("Sugestão respondida!", "success"), x({
                        ...p,
                        lojaSugestaoResponder: null,
                        lojaSugestaoResposta: ""
                    }), Ya()
                },
                className: "fin-btn fin-btn-p flex-1"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), "Enviar Resposta")))))), p.lojaSugestaoRecusar && React.createElement("div", {
                className: "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            }, React.createElement("div", {
                className: "bg-white rounded-[14px] max-w-md w-full border border-gray-200"
            }, React.createElement("div", {
                className: "p-4 border-b border-gray-200"
            }, React.createElement("h2", {
                className: "text-base font-semibold text-gray-900"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })), "Recusar Sugestão"))), React.createElement("div", {
                className: "p-6"
            }, React.createElement("div", {
                className: "bg-gray-50 p-3 rounded-lg mb-4"
            }, React.createElement("p", {
                className: "text-sm text-gray-500"
            }, React.createElement("strong", null, p.lojaSugestaoRecusar.user_name, ":")), React.createElement("p", {
                className: "text-gray-900"
            }, p.lojaSugestaoRecusar.sugestao)), React.createElement("textarea", {
                value: p.lojaSugestaoResposta || "",
                onChange: e => x({
                    ...p,
                    lojaSugestaoResposta: e.target.value
                }),
                placeholder: "Motivo da recusa... Ex: Infelizmente não conseguimos esse produto no momento.",
                className: "w-full h-24 resize-none fin-inp"
            }), React.createElement("div", {
                className: "flex gap-3 mt-4"
            }, React.createElement("button", {
                onClick: () => x({
                    ...p,
                    lojaSugestaoRecusar: null,
                    lojaSugestaoResposta: ""
                }),
                className: "fin-btn fin-btn-s flex-1"
            }, "Cancelar"), React.createElement("button", {
                onClick: async () => {
                    await fetchAuth(`${API_URL}/loja/sugestoes/${p.lojaSugestaoRecusar.id}`, {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            status: "recusado",
                            resposta: p.lojaSugestaoResposta || "Não foi possível atender esta sugestão.",
                            respondido_por: l.fullName
                        })
                    }), ja("Sugestão recusada", "success"), x({
                        ...p,
                        lojaSugestaoRecusar: null,
                        lojaSugestaoResposta: ""
                    }), Ya()
                },
                className: "fin-btn fin-btn-d flex-1"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })), "Confirmar Recusa")))))))))), "relatorios" === p.finTab && React.createElement(window.__RelatoriosFinanceiroV2 || (() => null), {
                fetchAuth, API_URL, er, ja
            }), "horarios" === p.finTab && React.createElement(React.Fragment, null,
                // 🔧 NOVO 2026-04: Seção de toggles do financeiro (saques habilitados / saques automáticos)
                // Sub-componente isolado com state próprio. Só admin/admin_master pode ver/editar.
                /* FIN_ABAS_V1: cabeçalho de página */
                window.FinUI.cabecalho("Configurações", "Saques, horários de atendimento e datas especiais"),
                React.createElement(FinConfigTogglesSecao, { API_URL: API_URL, fetchAuth: fetchAuth, usuario: l, ja: ja }),
                Me.loading ? React.createElement("div", {
                className: "flex items-center justify-center py-12"
            }, React.createElement("div", {
                className: "animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"
            }), React.createElement("span", {
                className: "ml-3"
            }, "Carregando...")) : React.createElement("div", {
                className: "space-y-6"
            }, React.createElement("div", {
                className: "fin-card p-5"
            }, React.createElement("h3", {
                className: "fin-sec-t mb-1"
            }, "Horários de atendimento"), React.createElement("p", {
                className: "text-sm text-gray-500 mb-4"
            }, "Configure os horários de funcionamento para cada dia da semana."), React.createElement("div", {
                className: "space-y-2"
            }, Me.horarios.map(e => React.createElement("div", {
                key: e.id,
                className: "flex flex-wrap items-center gap-3 py-2.5 border-t border-gray-100"
            }, React.createElement("div", {
                className: "w-32 font-semibold text-sm"
            }, bl[e.dia_semana]), React.createElement("label", {
                className: "flex items-center gap-2"
            }, React.createElement("input", {
                type: "checkbox",
                checked: e.ativo,
                onChange: t => Rl(e.id, {
                    ...e,
                    ativo: t.target.checked
                }),
                className: "w-4 h-4 accent-purple-700"
            }), React.createElement("span", {
                className: "text-sm"
            }, "Aberto")), e.ativo && React.createElement(React.Fragment, null, React.createElement("input", {
                type: "time",
                value: e.hora_inicio || "09:00",
                onChange: t => Rl(e.id, {
                    ...e,
                    hora_inicio: t.target.value
                }),
                className: "fin-inp"
            }), React.createElement("span", {
                className: "text-gray-500"
            }, "às"), React.createElement("input", {
                type: "time",
                value: e.hora_fim || "18:00",
                onChange: t => Rl(e.id, {
                    ...e,
                    hora_fim: t.target.value
                }),
                className: "fin-inp"
            })), !e.ativo && React.createElement("span", {
                className: "fin-pill bg-red-50 text-red-800"
            }, "FECHADO"))))), React.createElement("div", {
                className: "fin-card p-5"
            }, React.createElement("h3", {
                className: "fin-sec-t mb-1"
            }, "Horários especiais (feriados, datas específicas)"), React.createElement("div", {
                className: "bg-gray-50 border border-gray-200 p-3 rounded-[10px] mb-4"
            }, React.createElement("div", {
                className: "grid grid-cols-1 md:grid-cols-5 gap-3"
            }, React.createElement("input", {
                type: "date",
                value: p.novoEspData || "",
                onChange: e => x(t => ({
                    ...t,
                    novoEspData: e.target.value
                })),
                className: "fin-inp"
            }), React.createElement("input", {
                type: "text",
                placeholder: "Descrição (ex: Feriado)",
                value: p.novoEspDesc || "",
                onChange: e => x(t => ({
                    ...t,
                    novoEspDesc: e.target.value
                })),
                className: "fin-inp"
            }), React.createElement("label", {
                className: "flex items-center gap-2"
            }, React.createElement("input", {
                type: "checkbox",
                checked: p.novoEspFechado || !1,
                onChange: e => x(t => ({
                    ...t,
                    novoEspFechado: e.target.checked
                })),
                className: "w-4 h-4 accent-purple-700"
            }), React.createElement("span", {
                className: "text-sm"
            }, "Fechado")), !p.novoEspFechado && React.createElement("div", {
                className: "flex items-center gap-2"
            }, React.createElement("input", {
                type: "time",
                value: p.novoEspInicio || "09:00",
                onChange: e => x(t => ({
                    ...t,
                    novoEspInicio: e.target.value
                })),
                className: "w-24 fin-inp"
            }), React.createElement("span", null, "às"), React.createElement("input", {
                type: "time",
                value: p.novoEspFim || "18:00",
                onChange: e => x(t => ({
                    ...t,
                    novoEspFim: e.target.value
                })),
                className: "w-24 fin-inp"
            })), React.createElement("button", {
                onClick: El,
                className: "fin-btn fin-btn-p"
            }, "+ Adicionar"))), 0 === Me.especiais.length ? React.createElement("p", {
                className: "text-gray-500 text-sm"
            }, "Nenhum horário especial programado.") : React.createElement("div", {
                className: "space-y-2"
            }, Me.especiais.map(e => {
                let t = "Data inválida";
                try {
                    console.log("esp.data original:", e.data, typeof e.data);
                    let a = e.data;
                    if (a && "object" == typeof a && (a = a.toISOString ? a.toISOString() : String(a)), a) {
                        const e = String(a).substring(0, 10).split("-");
                        3 === e.length && 4 === e[0].length && (t = `${e[2]}/${e[1]}/${e[0]}`)
                    }
                } catch (t) {
                    console.error("Erro ao formatar data:", t, e.data)
                }
                return React.createElement("div", {
                    key: e.id,
                    className: "flex items-center justify-between py-2.5 border-t border-gray-100"
                }, React.createElement("div", {
                    className: "flex items-center gap-4"
                }, React.createElement("span", {
                    className: "font-semibold text-gray-900 tabular-nums"
                }, t), React.createElement("span", {
                    className: "text-sm text-gray-700"
                }, e.descricao), e.fechado ? React.createElement("span", {
                    className: "fin-pill bg-red-50 text-red-800"
                }, "FECHADO") : React.createElement("span", {
                    className: "text-sm text-green-800 font-semibold"
                }, e.hora_inicio, " às ", e.hora_fim)), React.createElement("button", {
                    onClick: () => (async e => {
                        if (confirm("Remover este horário especial?")) try {
                            await fetchAuth(`${API_URL}/horarios/especiais/${e}`, {
                                method: "DELETE"
                            }), ja("Removido!", "success");
                            const t = await fetchAuth(`${API_URL}/horarios/especiais`),
                                a = await t.json();
                            Oe(e => ({
                                ...e,
                                especiais: a
                            }))
                        } catch (e) {
                            ja("Erro", "error")
                        }
                    })(e.id),
                    className: "fin-btn fin-btn-d fin-btn-sm"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-trash" })), "Remover")))
            }))))), "avisos" === p.finTab && React.createElement(React.Fragment, null, qe.loading ? React.createElement("div", {
                className: "flex items-center justify-center py-12"
            }, React.createElement("div", {
                className: "animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"
            }), React.createElement("span", {
                className: "ml-3"
            }, "Carregando...")) : React.createElement("div", {
                className: "space-y-6"
            }, /* FIN_ABAS_V1 */ window.FinUI.cabecalho("Avisos", qe.avisos.filter(e => e.ativo).length + " ativo(s) · exibidos na tela de Saque Emergencial dos profissionais"), React.createElement("div", {
                className: "fin-card p-5"
            }, React.createElement("h3", {
                className: "fin-sec-t mb-3"
            }, "Criar novo aviso"), React.createElement("p", {
                className: "text-sm text-gray-500 mb-3 -mt-2"
            }, "Os avisos criados aqui serão exibidos para os usuários na tela de Saque Emergencial."), React.createElement("div", {
                className: ""
            }, React.createElement("div", {
                className: "grid grid-cols-1 md:grid-cols-2 gap-3 mb-3"
            }, React.createElement("input", {
                type: "text",
                placeholder: "Título do aviso",
                value: p.novoAvisoTitulo || "",
                onChange: e => x(t => ({
                    ...t,
                    novoAvisoTitulo: e.target.value
                })),
                className: "fin-inp"
            }), React.createElement("select", {
                value: p.novoAvisoTipo || "info",
                onChange: e => x(t => ({
                    ...t,
                    novoAvisoTipo: e.target.value
                })),
                className: "fin-inp"
            }, React.createElement("option", {
                value: "info"
            }, "Informativo (azul)"), React.createElement("option", {
                value: "warning"
            }, "Atenção (amarelo)"), React.createElement("option", {
                value: "error"
            }, "Urgente (vermelho)"), React.createElement("option", {
                value: "success"
            }, "Positivo (verde)"))), React.createElement("textarea", {
                placeholder: "Mensagem do aviso...",
                value: p.novoAvisoMensagem || "",
                onChange: e => x(t => ({
                    ...t,
                    novoAvisoMensagem: e.target.value
                })),
                className: "w-full mb-3 fin-inp",
                rows: 3
            }), React.createElement("div", {
                className: "flex items-center justify-between flex-wrap gap-3"
            }, React.createElement("label", {
                className: "flex items-center gap-2"
            }, React.createElement("input", {
                type: "checkbox",
                checked: p.novoAvisoExibirFora || !1,
                onChange: e => x(t => ({
                    ...t,
                    novoAvisoExibirFora: e.target.checked
                })),
                className: "w-4 h-4 accent-purple-700"
            }), React.createElement("span", {
                className: "text-sm"
            }, "Exibir apenas fora do horário de atendimento")), React.createElement("button", {
                onClick: hl,
                className: "fin-btn fin-btn-p"
            }, "+ Criar Aviso")))), React.createElement("div", {
                className: "fin-card p-5"
            }, React.createElement("h3", {
                className: "fin-sec-t mb-3"
            }, "Avisos ativos (", qe.avisos.filter(e => e.ativo).length, ")"), 0 === qe.avisos.filter(e => e.ativo).length ? React.createElement("div", {
                className: "text-center py-8 text-gray-500"
            }, React.createElement("p", {
                className: "hidden"
            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-mail" }))), React.createElement("p", null, "Nenhum aviso ativo no momento.")) : React.createElement("div", {
                className: "space-y-3"
            }, qe.avisos.filter(e => e.ativo).map(e => React.createElement("div", {
                key: e.id,
                className: "p-4 rounded-[10px] border " + ("error" === e.tipo ? "border-red-200" : "warning" === e.tipo ? "border-amber-200" : "success" === e.tipo ? "border-green-200" : "border-blue-200")
            }, React.createElement("div", {
                className: "flex items-start justify-between gap-4"
            }, React.createElement("div", {
                className: "flex-1"
            }, React.createElement("div", {
                className: "flex items-center gap-2 mb-2"
            }, React.createElement("span", {
                className: "text-lg"
            }, "error" === e.tipo ? React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#d97706" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-alert" })) : "warning" === e.tipo ? React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#d97706" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-alert" })) : "success" === e.tipo ? React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })) : React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#2563eb" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-info" }))), React.createElement("span", {
                className: "font-bold"
            }, e.titulo), e.exibir_fora_horario && React.createElement("span", {
                className: "fin-pill bg-amber-50 text-amber-800"
            }, "Só fora do horário")), React.createElement("p", {
                className: "text-sm text-gray-700"
            }, e.mensagem), React.createElement("p", {
                className: "text-xs text-gray-400 mt-2"
            }, "Criado em: ", new Date(e.created_at).toLocaleString("pt-BR"))), React.createElement("div", {
                className: "flex flex-col gap-2"
            }, React.createElement("button", {
                onClick: () => fl(e),
                className: "fin-btn fin-btn-s fin-btn-sm"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-power" })), "Desativar")), React.createElement("button", {
                onClick: () => Nl(e.id),
                className: "fin-btn fin-btn-d fin-btn-sm"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-trash" })), "Excluir")))))))), React.createElement("div", {
                className: "fin-card p-5"
            }, React.createElement("h3", {
                className: "fin-sec-t mb-3"
            }, "Histórico de avisos (", qe.avisos.filter(e => !e.ativo).length, ")"), 0 === qe.avisos.filter(e => !e.ativo).length ? React.createElement("div", {
                className: "text-center py-6 text-gray-400"
            }, React.createElement("p", {
                className: "text-sm"
            }, "Nenhum aviso no histórico.")) : React.createElement("div", {
                className: "space-y-2"
            }, qe.avisos.filter(e => !e.ativo).map(e => React.createElement("div", {
                key: e.id,
                className: "p-3 rounded-[10px] border border-gray-200"
            }, React.createElement("div", {
                className: "flex items-start justify-between gap-4"
            }, React.createElement("div", {
                className: "flex-1"
            }, React.createElement("div", {
                className: "flex items-center gap-2 mb-1"
            }, React.createElement("span", {
                className: "text-sm"
            }, "error" === e.tipo ? React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#d97706" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-alert" })) : "warning" === e.tipo ? React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#d97706" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-alert" })) : "success" === e.tipo ? React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })) : React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#2563eb" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-info" }))), React.createElement("span", {
                className: "font-semibold text-sm text-gray-700"
            }, e.titulo), React.createElement("span", {
                className: "fin-pill bg-gray-100 text-gray-700"
            }, "Inativo")), React.createElement("p", {
                className: "text-xs text-gray-500"
            }, e.mensagem), React.createElement("p", {
                className: "text-[10px] text-gray-400 mt-1"
            }, "Criado: ", new Date(e.created_at).toLocaleString("pt-BR"))), React.createElement("div", {
                className: "flex gap-2"
            }, React.createElement("button", {
                onClick: () => fl(e),
                className: "fin-btn fin-btn-p fin-btn-sm"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-play" })), "Ativar")), React.createElement("button", {
                onClick: () => Nl(e.id),
                className: "fin-btn fin-btn-d fin-btn-sm"
            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-trash" }))))))))))), "backup" === p.finTab && React.createElement(React.Fragment, null, (() => {
                const e = (e, t) => {
                        const a = JSON.stringify(e, null, 2),
                            l = new Blob([a], {
                                type: "application/json"
                            }),
                            r = URL.createObjectURL(l),
                            o = document.createElement("a");
                        o.href = r, o.download = t, o.click(), URL.revokeObjectURL(r), ja(`${t} exportado com sucesso!`, "success")
                    },
                    t = (e, t, a) => {
                        const l = [t.map(e => e.label).join(";"), ...e.map(e => t.map(t => {
                                let a = e[t.key] || "";
                                return "string" == typeof a && a.includes(";") && (a = `"${a}"`), a
                            }).join(";"))].join("\n"),
                            r = new Blob(["\ufeff" + l], {
                                type: "text/csv;charset=utf-8"
                            }),
                            o = URL.createObjectURL(r),
                            c = document.createElement("a");
                        c.href = o, c.download = a, c.click(), URL.revokeObjectURL(o), ja(`${a} exportado com sucesso!`, "success")
                    },
                    a = (new Date).toISOString().split("T")[0],
                    l = [{
                        key: "id",
                        label: "ID"
                    }, {
                        key: "user_cod",
                        label: "Código"
                    }, {
                        key: "user_name",
                        label: "Nome"
                    }, {
                        key: "cpf",
                        label: "CPF"
                    }, {
                        key: "pix_key",
                        label: "Chave PIX"
                    }, {
                        key: "requested_amount",
                        label: "Valor Solicitado"
                    }, {
                        key: "final_amount",
                        label: "Valor Final"
                    }, {
                        key: "status",
                        label: "Status"
                    }, {
                        key: "reject_reason",
                        label: "Motivo Rejeição"
                    }, {
                        key: "admin_name",
                        label: "Admin"
                    }, {
                        key: "created_at",
                        label: "Data Criação"
                    }, {
                        key: "updated_at",
                        label: "Data Atualização"
                    }],
                    r = [{
                        key: "id",
                        label: "ID"
                    }, {
                        key: "codProfissional",
                        label: "Código"
                    }, {
                        key: "fullName",
                        label: "Nome"
                    }, {
                        key: "role",
                        label: "Tipo"
                    }, {
                        key: "createdAt",
                        label: "Data Cadastro"
                    }],
                    o = [{
                        key: "id",
                        label: "ID"
                    }, {
                        key: "user_cod",
                        label: "Código"
                    }, {
                        key: "user_name",
                        label: "Nome"
                    }, {
                        key: "reason",
                        label: "Motivo"
                    }, {
                        key: "created_at",
                        label: "Data"
                    }],
                    c = [{
                        key: "id",
                        label: "ID"
                    }, {
                        key: "user_cod",
                        label: "Código"
                    }, {
                        key: "user_name",
                        label: "Nome"
                    }, {
                        key: "reason",
                        label: "Motivo"
                    }, {
                        key: "created_at",
                        label: "Data"
                    }],
                    s = [{
                        key: "id",
                        label: "ID"
                    }, {
                        key: "indicador_cod",
                        label: "Cód Indicador"
                    }, {
                        key: "indicador_nome",
                        label: "Nome Indicador"
                    }, {
                        key: "indicado_nome",
                        label: "Nome Indicado"
                    }, {
                        key: "indicado_contato",
                        label: "Contato"
                    }, {
                        key: "status",
                        label: "Status"
                    }, {
                        key: "created_at",
                        label: "Data"
                    }],
                    n = {
                        data_backup: (new Date).toISOString(),
                        versao: "1.0",
                        dados: {
                            withdrawals: q,
                            users: A,
                            gratuities: Q,
                            restricted: Z,
                            indicacoes: ae
                        },
                        estatisticas: {
                            total_withdrawals: q.length,
                            total_users: A.length,
                            total_gratuities: Q.length,
                            total_restricted: Z.length,
                            total_indicacoes: ae.length
                        }
                    };
                return React.createElement("div", {
                    className: "space-y-6"
                }, /* FIN_ABAS_V1 */ window.FinUI.cabecalho("Backup", "Exporte os dados para manter cópias seguras ou analisar em outras ferramentas"), React.createElement("div", {
                    className: "bg-white rounded-[14px] p-6 border border-gray-200"
                }, React.createElement("div", {
                    className: "flex items-center justify-between flex-wrap gap-3"
                }, React.createElement("div", null, React.createElement("h3", {
                    className: "fin-sec-t"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-save" })), "Backup Completo")), React.createElement("p", {
                    className: "text-sm text-gray-500 mt-1"
                }, "Exporta todos os dados do sistema em um único arquivo JSON."), React.createElement("div", {
                    className: "flex gap-4 mt-2 text-xs text-gray-500"
                }, React.createElement("span", null, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clipboard" })), q.length, " solicitações"), React.createElement("span", null, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-users" })), A.length, " usuários"), React.createElement("span", null, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-gift" })), Q.length, " gratuidades"), React.createElement("span", null, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-ban" })), Z.length, " restritos"), React.createElement("span", null, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-handshake" })), ae.length, " indicações"))), React.createElement("button", {
                    onClick: () => e(n, `backup_completo_${a}.json`),
                    className: "fin-btn fin-btn-p"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-arrowdown" })), "Baixar Backup Completo")))), React.createElement("div", {
                    className: "grid grid-cols-1 md:grid-cols-2 gap-4"
                }, React.createElement("div", {
                    className: "bg-white rounded-[14px] p-5 border border-gray-200"
                }, React.createElement("h3", {
                    className: "fin-sec-t flex items-center gap-2 mb-1"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clipboard" })), "Solicitações de Saque")), React.createElement("p", {
                    className: "text-sm text-gray-500 mb-3"
                }, q.length, " registros"), React.createElement("div", {
                    className: "flex gap-2"
                }, React.createElement("button", {
                    onClick: () => t(q, l, `solicitacoes_${a}.csv`),
                    className: "fin-btn fin-btn-s flex-1"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-chart" })), "CSV")), React.createElement("button", {
                    onClick: () => e(q, `solicitacoes_${a}.json`),
                    className: "fin-btn fin-btn-s flex-1"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-filetext" })), "JSON")))), React.createElement("div", {
                    className: "bg-white rounded-[14px] p-5 border border-gray-200"
                }, React.createElement("h3", {
                    className: "fin-sec-t flex items-center gap-2 mb-1"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-users" })), "Usuários")), React.createElement("p", {
                    className: "text-sm text-gray-500 mb-3"
                }, A.length, " registros"), React.createElement("div", {
                    className: "flex gap-2"
                }, React.createElement("button", {
                    onClick: () => t(A, r, `usuarios_${a}.csv`),
                    className: "fin-btn fin-btn-s flex-1"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-chart" })), "CSV")), React.createElement("button", {
                    onClick: () => e(A, `usuarios_${a}.json`),
                    className: "fin-btn fin-btn-s flex-1"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-filetext" })), "JSON")))), React.createElement("div", {
                    className: "bg-white rounded-[14px] p-5 border border-gray-200"
                }, React.createElement("h3", {
                    className: "fin-sec-t flex items-center gap-2 mb-1"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-gift" })), "Gratuidades")), React.createElement("p", {
                    className: "text-sm text-gray-500 mb-3"
                }, Q.length, " registros"), React.createElement("div", {
                    className: "flex gap-2"
                }, React.createElement("button", {
                    onClick: () => t(Q, o, `gratuidades_${a}.csv`),
                    className: "fin-btn fin-btn-s flex-1"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-chart" })), "CSV")), React.createElement("button", {
                    onClick: () => e(Q, `gratuidades_${a}.json`),
                    className: "fin-btn fin-btn-s flex-1"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-filetext" })), "JSON")))), React.createElement("div", {
                    className: "bg-white rounded-[14px] p-5 border border-gray-200"
                }, React.createElement("h3", {
                    className: "fin-sec-t flex items-center gap-2 mb-1"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-ban" })), "Lista de Restritos")), React.createElement("p", {
                    className: "text-sm text-gray-500 mb-3"
                }, Z.length, " registros"), React.createElement("div", {
                    className: "flex gap-2"
                }, React.createElement("button", {
                    onClick: () => t(Z, c, `restritos_${a}.csv`),
                    className: "fin-btn fin-btn-s flex-1"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-chart" })), "CSV")), React.createElement("button", {
                    onClick: () => e(Z, `restritos_${a}.json`),
                    className: "fin-btn fin-btn-s flex-1"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-filetext" })), "JSON")))), React.createElement("div", {
                    className: "bg-white rounded-[14px] p-5 border border-gray-200"
                }, React.createElement("h3", {
                    className: "fin-sec-t flex items-center gap-2 mb-1"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-handshake" })), "Indicações")), React.createElement("p", {
                    className: "text-sm text-gray-500 mb-3"
                }, ae.length, " registros"), React.createElement("div", {
                    className: "flex gap-2"
                }, React.createElement("button", {
                    onClick: () => t(ae, s, `indicacoes_${a}.csv`),
                    className: "fin-btn fin-btn-s flex-1"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-chart" })), "CSV")), React.createElement("button", {
                    onClick: () => e(ae, `indicacoes_${a}.json`),
                    className: "fin-btn fin-btn-s flex-1"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-filetext" })), "JSON")))), React.createElement("div", {
                    className: "bg-white rounded-[14px] p-5 border border-gray-200"
                }, React.createElement("h3", {
                    className: "fin-sec-t flex items-center gap-2 mb-1"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-search" })), "Solicitações por Status")), React.createElement("div", {
                    className: "space-y-2"
                }, React.createElement("button", {
                    onClick: () => t(q.filter(e => "aprovado" === e.status || "aprovado_gratuidade" === e.status), l, `aprovados_${a}.csv`),
                    className: "w-full px-4 py-2 rounded-[10px] font-semibold text-sm text-left bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), "Aprovados ("), q.filter(e => "aprovado" === e.status || "aprovado_gratuidade" === e.status).length, ")"), React.createElement("button", {
                    onClick: () => t(q.filter(e => "aguardando_aprovacao" === e.status), l, `pendentes_${a}.csv`),
                    className: "w-full px-4 py-2 rounded-[10px] font-semibold text-sm text-left bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clock" })), "Pendentes ("), q.filter(e => "aguardando_aprovacao" === e.status).length, ")"), React.createElement("button", {
                    onClick: () => t(q.filter(e => "rejeitado" === e.status), l, `rejeitados_${a}.csv`),
                    className: "w-full px-4 py-2 rounded-[10px] font-semibold text-sm text-left bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })), "Rejeitados ("), q.filter(e => "rejeitado" === e.status).length, ")")))), React.createElement("div", {
                    className: "fin-card p-5"
                }, React.createElement("h4", {
                    className: "fin-sec-t flex items-center gap-2"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-bulb" })), "Dicas de Backup")), React.createElement("ul", {
                    className: "text-sm text-gray-700 mt-2 space-y-1"
                }, React.createElement("li", null, "• Faça backups regularmente (recomendado: semanalmente)"), React.createElement("li", null, "• O arquivo JSON pode ser usado para restaurar dados"), React.createElement("li", null, "• O arquivo CSV pode ser aberto no Excel ou Google Sheets"), React.createElement("li", null, "• Guarde os backups em local seguro (Google Drive, OneDrive, etc.)"))))
            })())), "stark-bank" === p.finTab && React.createElement("div", { className: "max-w-7xl mx-auto px-4 py-6 sm:px-6" /* FIN_MARGEM_V1 */ },
                window.StarkBankComponent && React.createElement(window.StarkBankComponent, {
                    fetchAuth: fetchAuth,
                    API_URL: API_URL,
                    Toast: Toast,
                    showToast: ja
                })
            ), "acerto-prof" === p.finTab && React.createElement("div", { className: "max-w-7xl mx-auto px-4 py-6 sm:px-6" /* FIN_MARGEM_V1 */ },
                window.AcertoProfComponent && React.createElement(window.AcertoProfComponent, {
                    fetchAuth: fetchAuth,
                    API_URL: API_URL,
                    Toast: Toast
                })
            ), "conciliacao-acerto" === p.finTab && React.createElement("div", { className: "max-w-7xl mx-auto px-4 py-6 sm:px-6" /* FIN_MARGEM_V1 */ },
                window.ConciliacaoAcertoComponent && React.createElement(window.ConciliacaoAcertoComponent, {
                    fetchAuth: fetchAuth,
                    API_URL: API_URL,
                    Toast: Toast
                })
            ), "saldo-plific" === p.finTab && React.createElement("div", {className: "max-w-7xl mx-auto px-4 py-6 sm:px-6 space-y-6" /* FIN_MARGEM_V1 */}, /* FIN_ABAS_V1: Saldo Plific no padrão clean */
    // Header
    window.FinUI.cabecalho("Saldo Plific", "Consulte saldos dos profissionais e lance débitos"),
    
    // Consulta Individual
    React.createElement("div", {className: "fin-card p-5"},
        React.createElement("h2", {className: "fin-sec-t mb-3"}, "Consulta individual"),
        React.createElement("div", {className: "flex gap-3 items-end flex-wrap"},
            React.createElement("div", {className: "flex-1 min-w-[200px]"},
                React.createElement("label", {className: "fin-lbl"}, "ID do Profissional"),
                React.createElement("input", {
                    type: "number",
                    value: plificState.idBusca,
                    onChange: function(e) { setPlificState(Object.assign({}, plificState, {idBusca: e.target.value})); },
                    placeholder: "Digite o ID...",
                    className: "w-full fin-inp"
                })
            ),
            React.createElement("button", {
                onClick: function() { consultarSaldoPlific(plificState.idBusca); },
                disabled: plificState.loading,
                className: "fin-btn fin-btn-p"
            }, plificState.loading ? "Consultando..." : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-search" })), "Consultar"))
        ),
        plificState.consultaIndividual && plificState.consultaIndividual.profissional && React.createElement("div", {className: "mt-4 p-4 rounded-[10px] border border-gray-200 bg-gray-50"},
            React.createElement("div", {className: "grid grid-cols-2 md:grid-cols-5 gap-4"},
                React.createElement("div", null,
                    React.createElement("p", {className: "text-sm text-gray-500"}, "Nome"),
                    React.createElement("p", {className: "font-semibold text-gray-900"}, plificState.consultaIndividual.profissional.nome || "-")
                ),
                React.createElement("div", null,
                    React.createElement("p", {className: "text-sm text-gray-500"}, "CPF"),
                    React.createElement("p", {className: "font-semibold text-gray-900"}, plificState.consultaIndividual.profissional.cpf || "-")
                ),
                React.createElement("div", null,
                    React.createElement("p", {className: "text-sm text-gray-500"}, "Celular"),
                    React.createElement("p", {className: "font-semibold text-gray-900"}, plificState.consultaIndividual.profissional.celular || "-")
                ),
                React.createElement("div", null,
                    React.createElement("p", {className: "text-sm text-gray-500"}, "Saldo"),
                    React.createElement("p", {className: "text-2xl font-bold " + (parseSaldoBR(plificState.consultaIndividual.profissional.saldo) >= 0 ? "text-green-800" : "text-red-800")}, "R$ " + parseSaldoBR(plificState.consultaIndividual.profissional.saldo).toFixed(2).replace(".", ","))
                ),
                React.createElement("div", {className: "flex items-end"},
                    React.createElement("button", {
                        onClick: function() { setModalDebitoPlific(plificState.consultaIndividual.profissional); setDebitoFormPlific({valor: "", descricao: ""}); },
                        className: "fin-btn fin-btn-d"
                    }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-card" })), "Lançar Débito"))
                )
            )
        )
    ),
    
    // Histórico de Saldos
    React.createElement("div", {className: "fin-card p-5"},
        React.createElement("div", {className: "flex items-center justify-between mb-4 flex-wrap gap-2"},
            React.createElement("div", null,
                React.createElement("h2", {className: "fin-sec-t"}, "Saldos de todos os profissionais"),
                plificState.total > 0 && React.createElement("p", {className: "text-sm text-gray-500"}, 
                    plificState.total + " profissionais | Soma total: R$ " + (plificState.somaTotal || 0).toFixed(2).replace(".", ",")
                )
            ),
            React.createElement("div", {className: "flex gap-2"},
                React.createElement("button", {
                    onClick: function() { consultarSaldosLotePlific(1); },
                    disabled: plificState.loadingLote,
                    className: "fin-btn fin-btn-s"
                }, plificState.loadingLote ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clock" })), "Carregando...") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-refresh" })), "Atualizar")),
                plificState.consultaLote.length > 0 && React.createElement("button", {
                    onClick: exportarSaldosCSVPlific,
                    className: "fin-btn fin-btn-s"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-download" })), "CSV"))
            )
        ),
        plificState.loadingLote ? React.createElement("div", {className: "text-center py-12"},
            React.createElement("div", {className: "animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700 mx-auto"}),
            React.createElement("p", {className: "mt-4 text-gray-500"}, "Consultando saldos... isso pode demorar alguns segundos")
        ) : plificState.consultaLote.length > 0 ? React.createElement(React.Fragment, null,
            React.createElement("div", {className: "overflow-x-auto"},
                React.createElement("table", {className: "w-full fin-tbl"},
                    React.createElement("thead", null,
                        React.createElement("tr", null,
                            React.createElement("th", {className: "px-4 py-3 text-left"}, "#"),
                            React.createElement("th", {className: "px-4 py-3 text-left"}, "Código"),
                            React.createElement("th", {className: "px-4 py-3 text-left"}, "Nome"),
                            React.createElement("th", {className: "px-4 py-3 text-left"}, "CPF"),
                            React.createElement("th", {className: "px-4 py-3 text-right"}, "Saldo"),
                            React.createElement("th", {className: "px-4 py-3 text-center"}, "Ações")
                        )
                    ),
                    React.createElement("tbody", null,
                        plificState.consultaLote.map(function(prof, idx) {
                            var saldoNum = typeof prof.saldo === "string" ? parseFloat(prof.saldo.replace(/\./g, "").replace(",", ".")) : parseFloat(prof.saldo || 0);
                            var posicao = ((plificState.pagina - 1) * 15) + idx + 1;
                            return React.createElement("tr", {key: prof.codigo || idx, className: ""},
                                React.createElement("td", {className: "px-4 py-3 text-sm text-gray-400"}, posicao),
                                React.createElement("td", {className: "px-4 py-3 text-sm tabular-nums"}, prof.codigo),
                                React.createElement("td", {className: "px-4 py-3 text-sm font-medium"}, prof.nome || "-"),
                                React.createElement("td", {className: "px-4 py-3 text-sm text-gray-500"}, prof.cpf || "-"),
                                React.createElement("td", {className: "px-4 py-3 text-sm text-right font-semibold tabular-nums " + (saldoNum < 0 ? "text-red-800" : saldoNum > 0 ? "text-gray-900" : "text-gray-400")}, 
                                    "R$ " + saldoNum.toFixed(2).replace(".", ",")
                                ),
                                React.createElement("td", {className: "px-4 py-3 text-center"},
                                    React.createElement("button", {
                                        onClick: function() { setModalDebitoPlific({...prof, id: prof.codigo}); setDebitoFormPlific({valor: "", descricao: ""}); },
                                        className: "fin-btn fin-btn-d fin-btn-sm"
                                    }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-card" })), "Débito"))
                                )
                            );
                        })
                    )
                )
            ),
            // Paginação
            plificState.totalPaginas > 1 && React.createElement("div", {className: "flex items-center justify-between mt-4 pt-4 border-t"},
                React.createElement("p", {className: "text-sm text-gray-500"},
                    "Página " + plificState.pagina + " de " + plificState.totalPaginas
                ),
                React.createElement("div", {className: "flex gap-2"},
                    React.createElement("button", {
                        onClick: function() { consultarSaldosLotePlific(plificState.pagina - 1); },
                        disabled: plificState.pagina <= 1 || plificState.loadingLote,
                        className: "fin-btn fin-btn-s fin-btn-sm"
                    }, "Anterior"),
                    React.createElement("button", {
                        onClick: function() { consultarSaldosLotePlific(plificState.pagina + 1); },
                        disabled: plificState.pagina >= plificState.totalPaginas || plificState.loadingLote,
                        className: "fin-btn fin-btn-s fin-btn-sm"
                    }, "Próxima")
                )
            )
        ) : React.createElement("div", {className: "text-center py-10 text-gray-500"},
            React.createElement("p", {className: "text-sm"}, "Clique em \"Atualizar\" para carregar os saldos de todos os profissionais."),
            React.createElement("p", {className: "text-xs mt-1 text-gray-400"}, "Ordenado do maior para o menor saldo")
        )
    ),
    
    // Modal de Débito
    modalDebitoPlific && React.createElement("div", {className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50", onClick: function() { setModalDebitoPlific(null); }},
        React.createElement("div", {className: "bg-white rounded-[14px] p-6 w-full max-w-md mx-4 border border-gray-200", onClick: function(e) { e.stopPropagation(); }},
            React.createElement("h3", {className: "text-base font-semibold text-gray-900 mb-4"}, "Lançar Débito"),
            React.createElement("div", {className: "bg-gray-50 rounded-lg p-3 mb-4"},
                React.createElement("p", {className: "text-sm text-gray-500"}, "Profissional:"),
                React.createElement("p", {className: "font-semibold text-lg"}, modalDebitoPlific.nome || "ID " + (modalDebitoPlific.idProf || modalDebitoPlific.id || modalDebitoPlific.codigo)),
                React.createElement("p", {className: "text-sm text-gray-500"}, "Saldo atual: R$ " + parseSaldoBR(modalDebitoPlific.saldo).toFixed(2).replace(".", ","))
            ),
            React.createElement("div", {className: "space-y-4"},
                React.createElement("div", null,
                    React.createElement("label", {className: "fin-lbl"}, "Valor do Débito *"),
                    React.createElement("input", {
                        type: "number",
                        step: "0.01",
                        min: "0.01",
                        value: debitoFormPlific.valor,
                        onChange: function(e) { setDebitoFormPlific(Object.assign({}, debitoFormPlific, {valor: e.target.value})); },
                        placeholder: "0,00",
                        className: "w-full fin-inp"
                    })
                ),
                React.createElement("div", null,
                    React.createElement("label", {className: "fin-lbl"}, "Descrição *"),
                    React.createElement("input", {
                        type: "text",
                        value: debitoFormPlific.descricao,
                        onChange: function(e) { setDebitoFormPlific(Object.assign({}, debitoFormPlific, {descricao: e.target.value})); },
                        placeholder: "Ex: Saque emergencial, Taxa de serviço...",
                        className: "w-full fin-inp"
                    })
                )
            ),
            React.createElement("div", {className: "flex gap-3 mt-6"},
                React.createElement("button", {
                    onClick: function() { setModalDebitoPlific(null); },
                    className: "fin-btn fin-btn-s flex-1"
                }, "Cancelar"),
                React.createElement("button", {
                    onClick: async function() {
                        var idProf = modalDebitoPlific.idProf || modalDebitoPlific.id || modalDebitoPlific.codigo;
                        var sucesso = await lancarDebitoPlific(idProf, debitoFormPlific.valor, debitoFormPlific.descricao);
                        if (sucesso) { setModalDebitoPlific(null); }
                    },
                    disabled: !debitoFormPlific.valor || !debitoFormPlific.descricao || plificState.loadingDebito,
                    className: "flex-1 fin-btn fin-btn-d"
                }, plificState.loadingDebito ? "Processando..." : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-card" })), "Confirmar Débito"))
            )
        )
    ),
    
    // Info
    React.createElement("div", {className: "fin-card p-5"},
        React.createElement("h2", {className: "fin-sec-t flex items-center gap-1.5"}, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#2563eb" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-info" })), "Informações"),
        React.createElement("ul", {className: "text-xs text-gray-700 mt-2 space-y-1"},
            React.createElement("li", null, "• Rate limit: máximo 10 requisições por segundo"),
            React.createElement("li", null, "• Cache: saldos são cacheados por 5 minutos"),
            React.createElement("li", null, "• Consulta em lote: máximo 100 profissionais por vez")
        )
    )
))
    };

    // ==================== ABA LIMITES — LIBERAÇÃO DE LIMITES DE SAQUE ====================
    
    window.LimitesComponent = function(limitesProps) {
        var fetchAuth = limitesProps.fetchAuth;
        var API_URL = limitesProps.API_URL;
        var ja = limitesProps.ja;
        var er = limitesProps.er;
        var v = limitesProps.v;
        var y = limitesProps.y;
        var formatarMoeda = window.formatarMoeda;

        var _limitesState = React.useState({ lista: [], loading: true, contadores: null });
        var limitesState = _limitesState[0]; var setLimitesState = _limitesState[1];
        var _limiteFiltro = React.useState('pendente');
        var limiteFiltro = _limiteFiltro[0]; var setLimiteFiltro = _limiteFiltro[1];
        var _liberandoId = React.useState(null);
        var liberandoId = _liberandoId[0]; var setLiberandoId = _liberandoId[1];

        var carregarLimites = React.useCallback(async function() {
            setLimitesState(function(prev) { return Object.assign({}, prev, { loading: true }); });
            try {
                var promessas = [
                    fetchAuth(API_URL + '/withdrawals/solicitacoes-limite' + (limiteFiltro ? '?status=' + limiteFiltro : '')),
                    fetchAuth(API_URL + '/withdrawals/solicitacoes-limite/contadores')
                ];
                var respostas = await Promise.all(promessas);
                var lista = respostas[0].ok ? await respostas[0].json() : [];
                var contadores = respostas[1].ok ? await respostas[1].json() : null;
                setLimitesState({ lista: lista, loading: false, contadores: contadores });
            } catch (err) {
                console.error('Erro ao carregar limites:', err);
                setLimitesState(function(prev) { return Object.assign({}, prev, { loading: false }); });
            }
        }, [limiteFiltro]);

        React.useEffect(function() { carregarLimites(); }, [limiteFiltro]);

        // WebSocket: escutar novas solicitações em tempo real
        React.useEffect(function() {
            var handler = function(event) {
                try {
                    var msg = JSON.parse(event.data);
                    if (msg.event === 'NEW_LIMIT_REQUEST' || msg.event === 'LIMIT_REQUEST_UPDATE') {
                        carregarLimites();
                        if (msg.event === 'NEW_LIMIT_REQUEST') {
                            v(function(prev) { return Object.assign({}, prev, { limites_pendentes: (prev.limites_pendentes || 0) + 1 }); });
                            ja('Nova solicitação de limite: ' + msg.data.user_name, 'info');
                        }
                        if (msg.event === 'LIMIT_REQUEST_UPDATE' && msg.data.status !== 'pendente') {
                            v(function(prev) { return Object.assign({}, prev, { limites_pendentes: Math.max(0, (prev.limites_pendentes || 0) - 1) }); });
                        }
                    }
                } catch (e) {}
            };
            if (window.__wsFinanceiro) {
                window.__wsFinanceiro.addEventListener('message', handler);
                return function() { window.__wsFinanceiro.removeEventListener('message', handler); };
            }
        }, []);

        var liberarLimite = async function(id) {
            setLiberandoId(id);
            try {
                var resp = await fetchAuth(API_URL + '/withdrawals/solicitacoes-limite/' + id + '/liberar', {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' }
                });
                var data = await resp.json();
                if (resp.ok) { ja('Limite liberado com sucesso!', 'success'); carregarLimites(); }
                else { ja('' + (data.error || 'Erro ao liberar'), 'error'); }
            } catch (err) { ja('Erro de conexão', 'error'); }
            setLiberandoId(null);
        };

        var rejeitarLimite = async function(id) {
            if (!confirm('Rejeitar esta solicitação de limite?')) return;
            setLiberandoId(id);
            try {
                var resp = await fetchAuth(API_URL + '/withdrawals/solicitacoes-limite/' + id + '/rejeitar', {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ motivo: 'Rejeitado pelo financeiro' })
                });
                if (resp.ok) { ja('Solicitação rejeitada', 'info'); carregarLimites(); }
            } catch (err) { ja('Erro', 'error'); }
            setLiberandoId(null);
        };

        var cont = limitesState.contadores || {};
        /* FIN_ABAS_V1: Limites no padrão clean — cabeçalho limpo, faixa de KPIs, filtros em pílulas,
           lista com pílulas de status (URGENTE = pílula vermelha) e "Liberar" como ação principal. */
        var UI = window.FinUI;
        var ic = UI.ico;
        var formatarDataISO = function(dateStr) {
            if (!dateStr) return '-';
            // Se for ISO date (YYYY-MM-DD), parse manual para evitar Invalid Date
            var parts = String(dateStr).split('T')[0].split('-');
            if (parts.length === 3) return parts[2] + '/' + parts[1] + '/' + parts[0];
            try { return new Date(dateStr).toLocaleDateString('pt-BR'); } catch(e) { return '-'; }
        };
        var formatarDataHora = function(dateStr) {
            if (!dateStr) return '-';
            try {
                var d = new Date(dateStr);
                if (isNaN(d.getTime())) return '-';
                return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            } catch(e) { return '-'; }
        };
        var rotulosFiltro = { pendente: "Pendentes", liberado: "Liberados", rejeitado: "Rejeitados", expirado: "Expirados", "": "Todos" };

        return React.createElement("div", { style: { color: "#111827", fontSize: 13 } },
            UI.cabecalho("Liberação de limites", "Limite extra de saque dos motoboys · o ciclo reseta toda terça-feira"),
            UI.kpis([
                { rotulo: "Pendentes (ciclo)", valor: cont.pendentes_ciclo_atual || 0, tom: (cont.pendentes_ciclo_atual || 0) > 0 ? "ambar" : null, sub: "aguardando decisão" },
                { rotulo: "Liberados (ciclo)", valor: cont.liberados_ciclo_atual || 0, sub: "neste ciclo" },
                { rotulo: "Rejeitados (total)", valor: cont.rejeitados || 0, sub: "desde o início" },
                { rotulo: "Pendentes (total)", valor: cont.pendentes || 0, tom: (cont.pendentes || 0) > 0 ? "ambar" : null, sub: "inclui ciclos anteriores" }
            ]),
            React.createElement("section", { className: "fin-card", style: { overflow: "hidden", marginBottom: 16 } },
                // Filtros em pílulas
                React.createElement("div", { style: { padding: 12, borderBottom: "1px solid #f3f4f6" } },
                    UI.chips(["pendente", "liberado", "rejeitado", "expirado", ""].map(function(st) {
                        return { id: st, label: rotulosFiltro[st], n: st === "pendente" && cont.pendentes > 0 ? cont.pendentes : null };
                    }), limiteFiltro, function(st) { setLimiteFiltro(st); }, "Filtrar por status")
                ),
                // Lista
                limitesState.loading ? UI.vazio("Carregando...")
                : limitesState.lista.length === 0 ? UI.vazio("Nenhuma solicitação " + (limiteFiltro ? (rotulosFiltro[limiteFiltro] || limiteFiltro).toLowerCase() : "") + ". As novas aparecem aqui em tempo real.")
                : React.createElement("div", null,
                    limitesState.lista.map(function(item, idx) {
                        var isPendente = item.status === 'pendente';
                        var isLiberado = item.status === 'liberado';
                        var horasAguardando = parseFloat(item.horas_aguardando || 0);
                        var urgente = isPendente && horasAguardando > 2;
                        var tipoLimite = item.tipo_limite || 'semanal';
                        var isSemanal = tipoLimite === 'semanal';
                        var tomSt = isPendente ? "ambar" : isLiberado ? "verde" : item.status === 'rejeitado' ? "vermelho" : "cinza";
                        var txtSt = isPendente ? "Pendente" : isLiberado ? "Liberado" : item.status === 'rejeitado' ? "Rejeitado" : "Expirado";
                        var meta = { display: "inline-flex", alignItems: "center", gap: 4 };
                        return React.createElement("div", {
                            key: item.id,
                            style: { padding: "14px 16px", borderTop: idx === 0 ? "none" : "1px solid #f3f4f6", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }
                        },
                            React.createElement("div", { style: { flex: "1 1 320px", minWidth: 0 } },
                                React.createElement("div", { style: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 4 } },
                                    React.createElement("span", { style: { fontWeight: 600, fontSize: 14 } }, item.user_name),
                                    React.createElement("span", { style: { fontSize: 12, color: "#6b7280", fontVariantNumeric: "tabular-nums" } }, "#" + item.user_cod),
                                    UI.pilula(isSemanal ? "roxo" : "azul", isSemanal ? "Limite semanal" : "Limite diário"),
                                    urgente && UI.pilula("vermelho", "Urgente")
                                ),
                                React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 14, fontSize: 12, color: "#6b7280" } },
                                    React.createElement("span", { style: meta }, ic("calendar", 13), "Ciclo " + formatarDataISO(item.ciclo_inicio) + " a " + formatarDataISO(item.ciclo_fim)),
                                    React.createElement("span", { style: meta }, ic("clock", 13), "Solicitado " + formatarDataHora(item.created_at)),
                                    isPendente && horasAguardando >= 1 && React.createElement("span", { style: Object.assign({}, meta, { color: "#991b1b", fontWeight: 600 }) }, "Há " + Math.floor(horasAguardando) + "h aguardando")
                                ),
                                item.motivo && React.createElement("p", { style: { margin: "4px 0 0", fontSize: 12, color: "#6b7280" } }, "Motivo: " + item.motivo)
                            ),
                            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
                                UI.pilula(tomSt, txtSt),
                                item.admin_name && React.createElement("span", { style: { fontSize: 12, color: "#6b7280" } }, "por " + item.admin_name),
                                isPendente && React.createElement("button", {
                                    type: "button",
                                    onClick: function() { rejeitarLimite(item.id); },
                                    disabled: liberandoId === item.id,
                                    className: "fin-btn fin-btn-d",
                                    title: "Rejeitar solicitação"
                                }, "Rejeitar"),
                                isPendente && React.createElement("button", {
                                    type: "button",
                                    onClick: function() { liberarLimite(item.id); },
                                    disabled: liberandoId === item.id,
                                    className: "fin-btn fin-btn-p"
                                }, liberandoId === item.id ? "Liberando..." : React.createElement(React.Fragment, null, ic("check", 15), "Liberar"))
                            )
                        );
                    })
                )
            ),
            // Como funciona
            React.createElement("section", { className: "fin-card", style: { padding: 16 } },
                React.createElement("h2", { className: "fin-sec-t", style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 8 } }, ic("info", 16, "#2563eb"), "Como funciona"),
                React.createElement("ul", { style: { margin: 0, paddingLeft: 18, listStyle: "disc", color: "#374151", fontSize: 12.5, lineHeight: 1.7 } },
                    React.createElement("li", null, "O limite semanal reseta toda terça-feira automaticamente"),
                    React.createElement("li", null, "Quando o motoboy esgota o limite, um botão aparece para solicitar mais"),
                    React.createElement("li", null, "Ao liberar, o ciclo do motoboy é renovado (limite volta ao valor original)"),
                    React.createElement("li", null, "A validação de saldo Plific é mantida — só solicita quem tem saldo"),
                    React.createElement("li", null, "Solicitações pendentes de ciclos anteriores expiram automaticamente")
                )
            )
        );
    };

    // ==================== ABA STARK BANK — PAGAMENTO AUTOMÁTICO VIA PIX ====================
    
    window.StarkBankComponent = function(starkProps) {
        var sp = starkProps;
        var fetchAuth = sp.fetchAuth;
        var API_URL = sp.API_URL;
        var Toast = sp.Toast;
        var showToast = sp.showToast || function(msg, type) { console.log('[Toast]', type, msg); };
        var formatarMoeda = window.formatarMoeda;
        
        // State principal
        var _st = React.useState({
            saldo: null, saldoLoading: false,
            pendentes: [], pendentesLoading: false, pendentesTotal: 0, pendentesValorTotal: 0,
            pendentesPage: 1, pendentesTotalPages: 1,
            historico: [], historicoLoading: false, historicoTotal: 0, historicoPage: 1,
            loteDetalhe: null, loteDetalheLoading: false,
            status: null, executando: false, subTab: 'pendentes'
        });
        var st = _st[0]; var setSt = _st[1];
        
        // State separado para seleção (evita re-render da tabela inteira)
        var _sel = React.useState({}); // { id: true }
        var sel = _sel[0]; var setSel = _sel[1];
        
        // Filtros de data
        var hoje = new Date().toISOString().split('T')[0];
        var _filtros = React.useState({ data_inicio: hoje, data_fim: hoje });
        var filtros = _filtros[0]; var setFiltros = _filtros[1];
        
        // Carregar saldo
        var carregarSaldo = React.useCallback(async function() {
            setSt(function(p) { return Object.assign({}, p, { saldoLoading: true }); });
            try {
                var r = await fetchAuth(API_URL + '/stark/saldo');
                var d = await r.json();
                setSt(function(p) { return Object.assign({}, p, { saldo: d, saldoLoading: false }); });
            } catch (e) { setSt(function(p) { return Object.assign({}, p, { saldoLoading: false }); }); }
        }, []);
        
        // Carregar pendentes com filtros e paginação + validação automática
        var carregarPendentes = React.useCallback(async function(page, filtrosOverride) {
            setSt(function(p) { return Object.assign({}, p, { pendentesLoading: true }); });
            var f = filtrosOverride || filtros;
            var pg = page || 1;
            try {
                var url = API_URL + '/stark/lote/pendente?page=' + pg + '&limit=50';
                if (f.data_inicio) url += '&data_inicio=' + f.data_inicio;
                if (f.data_fim) url += '&data_fim=' + f.data_fim;
                var r = await fetchAuth(url);
                var d = await r.json();
                var saques = d.saques || [];
                setSt(function(p) { return Object.assign({}, p, {
                    pendentes: saques, pendentesLoading: false,
                    pendentesTotal: d.quantidade || 0, pendentesValorTotal: d.valor_total || 0,
                    pendentesPage: d.page || 1, pendentesTotalPages: d.totalPages || 1
                }); });
                setSel({});
                
                // Validação DICT automática em background (se tem pendentes)
                if (saques.length > 0) {
                    try {
                        var ids = saques.map(function(s) { return s.id; });
                        var rv = await fetchAuth(API_URL + '/stark/lote/validar', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ saque_ids: ids })
                        });
                        var dv = await rv.json();
                        var map = {};
                        (dv.validacoes || []).forEach(function(v) { map[v.id] = v; });
                        setValidacoes(map);
                    } catch(e) { console.warn('Validação DICT automática falhou:', e); }
                }
            } catch (e) { setSt(function(p) { return Object.assign({}, p, { pendentesLoading: false }); }); }
        }, [filtros]);
        
        // Carregar histórico
        var carregarHistorico = React.useCallback(async function(page) {
            setSt(function(p) { return Object.assign({}, p, { historicoLoading: true }); });
            try {
                var r = await fetchAuth(API_URL + '/stark/lote/historico?page=' + (page || st.historicoPage) + '&limit=15');
                var d = await r.json();
                setSt(function(p) { return Object.assign({}, p, { historico: d.lotes || [], historicoLoading: false, historicoTotal: d.total || 0 }); });
            } catch (e) { setSt(function(p) { return Object.assign({}, p, { historicoLoading: false }); }); }
        }, [st.historicoPage]);
        
        // Carregar status
        var carregarStatus = React.useCallback(async function() {
            try {
                var r = await fetchAuth(API_URL + '/stark/status');
                var d = await r.json();
                setSt(function(p) { return Object.assign({}, p, { status: d }); });
            } catch (e) {}
        }, []);

        // Sincronizar status das transfers pendentes consultando a Stark Bank
        var sincronizarStatus = async function() {
            try {
                showToast('Sincronizando...', 'info');
                var r = await fetchAuth(API_URL + '/stark/sync', { method: 'POST' });
                if (!r.ok) {
                    var err = await r.json().catch(function() { return {}; });
                    showToast('' + (err.error || 'Erro ' + r.status), 'error');
                    return;
                }
                var d = await r.json();
                if (d.atualizados > 0) {
                    showToast('' + d.atualizados + ' pagamento(s) sincronizado(s)!', 'success');
                    carregarPendentes(st.pendentesPage);
                    carregarHistorico();
                    carregarSaldo();
                } else {
                    showToast('Nenhuma atualização pendente', 'info');
                }
            } catch(e) {
                console.error('Erro sync:', e);
                showToast('Erro ao sincronizar: ' + e.message, 'error');
            }
        };
        
        // State de validações DICT
        var _validacoes = React.useState({}); // { saqueId: { dict_status, alertas, dict_nome, cpf_divergente } }
        var validacoes = _validacoes[0]; var setValidacoes = _validacoes[1];
        var _validando = React.useState(false);
        var validando = _validando[0]; var setValidando = _validando[1];
        // [SAQUE_DIVERG_V1] confirmacao do financeiro p/ pagar chave de titular divergente (igual ao acerto)
        var _divConfirmSaque = React.useState({}); // { saqueId: true }
        var divConfirmSaque = _divConfirmSaque[0]; var setDivConfirmSaque = _divConfirmSaque[1];

        // Validar lote antes de pagar (consulta DICT para cada saque)
        var validarLote = async function() {
            var ids = idsSelecionados.length > 0 ? idsSelecionados : st.pendentes.map(function(s) { return s.id; });
            if (ids.length === 0) { showToast('Nenhum saque para validar', 'warning'); return; }
            
            setValidando(true);
            showToast('Validando ' + ids.length + ' chaves Pix...', 'info');
            
            try {
                var r = await fetchAuth(API_URL + '/stark/lote/validar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ saque_ids: ids })
                });
                var d = await r.json();
                
                // Mapear validações por id do saque
                var map = {};
                (d.validacoes || []).forEach(function(v) { map[v.id] = v; });
                setValidacoes(map);
                
                if (d.com_alerta > 0) {
                    showToast('' + d.com_alerta + ' saque(s) com alertas! Verifique a coluna Validação.', 'warning');
                } else {
                    showToast('Todas as ' + d.total + ' chaves Pix validadas com sucesso!', 'success');
                }
            } catch(e) {
                console.error('Erro validação:', e);
                showToast('Erro ao validar: ' + e.message, 'error');
            }
            setValidando(false);
        };

        // Init
        React.useEffect(function() { carregarSaldo(); carregarPendentes(1); carregarHistorico(); carregarStatus(); }, []);

        // 🔔 Real-time: escutar pagamentos Stark Bank via WebSocket
        React.useEffect(function() {
            var handler = function(e) {
                var d = e.detail;
                console.log('💰 [Pix Stark] Atualização em tempo real:', d.stark_status, '#' + d.id);
                // Atualizar pendentes em memória (sem reload)
                setSt(function(prev) {
                    var novosPendentes = prev.pendentes.map(function(s) {
                        if (s.stark_transfer_id === d.stark_transfer_id || s.id === d.id) {
                            return Object.assign({}, s, { stark_status: d.stark_status, stark_erro: d.stark_erro, status: d.status || s.status });
                        }
                        return s;
                    });
                    return Object.assign({}, prev, { pendentes: novosPendentes });
                });
                // Recarregar listas completas após breve delay (para DB estar consistente)
                setTimeout(function() {
                    carregarPendentes(st.pendentesPage);
                    carregarHistorico();
                    carregarSaldo();
                }, 800);
            };
            window.addEventListener('stark-payment-update', handler);
            return function() { window.removeEventListener('stark-payment-update', handler); };
        }, []);
        
        // Toggle checkbox individual (state separado = rápido)
        var toggleSel = function(id) { setSel(function(p) { var n = Object.assign({}, p); if (n[id]) delete n[id]; else n[id] = true; return n; }); };
        
        // Selecionar/deselecionar todos da página
        var toggleTodos = function() {
            var ids = st.pendentes.map(function(s) { return s.id; });
            var todosSelec = ids.every(function(id) { return sel[id]; });
            if (todosSelec) { setSel({}); }
            else { var n = {}; ids.forEach(function(id) { n[id] = true; }); setSel(n); }
        };
        
        // IDs selecionados
        var idsSelecionados = Object.keys(sel).filter(function(k) { return sel[k]; }).map(Number);
        var valorSelecionado = st.pendentes.filter(function(s) { return sel[s.id]; }).reduce(function(a, s) { return a + parseFloat(s.final_amount || 0); }, 0);
        
        // State do modal 2FA
        var _modal2fa = React.useState({ aberto: false, etapa: 'confirmar', chaveToken: null, emailMascarado: '', tokenDigitado: '', enviando: false, validando: false, erro: '' });
        var modal2fa = _modal2fa[0]; var setModal2fa = _modal2fa[1];
        
        // State do modal de resultado do pagamento
        var _modalResultado = React.useState({ aberto: false, loteId: null, enviados: 0, rejeitados: 0, valorEnviado: 0, detalhesRejeitados: [] });
        var modalResultado = _modalResultado[0]; var setModalResultado = _modalResultado[1];
        
        // Abrir modal de confirmação
        var iniciarPagamento = function() {
            var ids = idsSelecionados.length > 0 ? idsSelecionados : st.pendentes.map(function(s) { return s.id; });
            if (ids.length === 0) return;
            setModal2fa({ aberto: true, etapa: 'confirmar', chaveToken: null, emailMascarado: '', tokenDigitado: '', enviando: false, validando: false, erro: '' });
        };
        
        // Solicitar token por email
        var solicitarToken = async function() {
            var ids = idsSelecionados.length > 0 ? idsSelecionados : st.pendentes.map(function(s) { return s.id; });
            var vlr = idsSelecionados.length > 0 ? valorSelecionado : st.pendentesValorTotal;
            var qtd = idsSelecionados.length > 0 ? idsSelecionados.length : st.pendentes.length;
            
            setModal2fa(function(p) { return Object.assign({}, p, { enviando: true, erro: '' }); });
            try {
                var r = await fetchAuth(API_URL + '/stark/token/solicitar', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ saque_ids: ids, valor_total: vlr, quantidade: qtd })
                });
                var d = await r.json();
                if (d.success) {
                    setModal2fa(function(p) { return Object.assign({}, p, { etapa: 'digitar', chaveToken: d.chave_token, emailMascarado: d.email_mascarado, enviando: false }); });
                } else {
                    setModal2fa(function(p) { return Object.assign({}, p, { erro: d.error || 'Erro ao enviar token', enviando: false }); });
                }
            } catch (e) { setModal2fa(function(p) { return Object.assign({}, p, { erro: 'Erro: ' + e.message, enviando: false }); }); }
        };
        
        // Validar token e executar
        var validarTokenEExecutar = async function() {
            if (modal2fa.tokenDigitado.length !== 6) {
                setModal2fa(function(p) { return Object.assign({}, p, { erro: 'Digite o código de 6 dígitos' }); });
                return;
            }
            
            setModal2fa(function(p) { return Object.assign({}, p, { validando: true, erro: '' }); });
            try {
                // 1. Validar token
                var rv = await fetchAuth(API_URL + '/stark/token/validar', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chave_token: modal2fa.chaveToken, token: modal2fa.tokenDigitado })
                });
                var dv = await rv.json();
                if (!dv.success) {
                    setModal2fa(function(p) { return Object.assign({}, p, { erro: dv.error || 'Token inválido', validando: false }); });
                    return;
                }
                
                // 2. Executar pagamento com o token validado
                var ids = dv.saque_ids && dv.saque_ids.length > 0 ? dv.saque_ids : (idsSelecionados.length > 0 ? idsSelecionados : st.pendentes.map(function(s) { return s.id; }));
                // [SAQUE_DIVERG_V1] ids que o financeiro confirmou pagar mesmo com titular divergente
                var confirmadosDiv = ids.filter(function(id) { return !!divConfirmSaque[id]; });

                setModal2fa(function(p) { return Object.assign({}, p, { etapa: 'executando' }); });

                var re = await fetchAuth(API_URL + '/stark/lote/executar', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ saque_ids: ids, chave_token: modal2fa.chaveToken, confirmados_divergencia: confirmadosDiv })
                });
                var de = await re.json();
                // [SAQUE_DIVERG_V1] saques retidos por titular divergente aguardando confirmacao
                if (de.divergentes && de.divergentes.length > 0) {
                    showToast('' + de.divergentes.length + ' saque(s) com titular diferente ficaram retidos. Clique em "Validar", marque "Confirmo pagar" na linha e pague novamente.', 'warning');
                }

                if (de.success) {
                    setModal2fa({ aberto: false, etapa: 'confirmar', chaveToken: null, emailMascarado: '', tokenDigitado: '', enviando: false, validando: false, erro: '' });
                    
                    // Abrir modal de resultado persistente
                    setModalResultado({
                        aberto: true,
                        loteId: de.lote_id,
                        enviados: de.enviados || 0,
                        rejeitados: de.rejeitados || 0,
                        valorEnviado: de.valor_enviado || 0,
                        detalhesRejeitados: de.detalhes_rejeitados || []
                    });
                    
                    carregarSaldo(); carregarPendentes(1); carregarHistorico(); setSel({});
                } else {
                    setModal2fa(function(p) { return Object.assign({}, p, { erro: de.error || 'Erro ao executar', validando: false, etapa: 'digitar' }); });
                    if (de.saldo_disponivel !== undefined) showToast('Saldo insuficiente: ' + formatarMoeda(de.saldo_disponivel), 'warning');
                }
            } catch (e) { setModal2fa(function(p) { return Object.assign({}, p, { erro: 'Erro: ' + e.message, validando: false, etapa: 'digitar' }); }); }
        };
        
        // Ver detalhe lote
        var verDetalhe = async function(loteId) {
            setSt(function(p) { return Object.assign({}, p, { loteDetalheLoading: true }); });
            try {
                var r = await fetchAuth(API_URL + '/stark/lote/' + loteId);
                var d = await r.json();
                setSt(function(p) { return Object.assign({}, p, { loteDetalhe: d, loteDetalheLoading: false }); });
            } catch (e) { setSt(function(p) { return Object.assign({}, p, { loteDetalheLoading: false }); }); }
        };
        
        // (Retentar removido — saques rejeitados continuam pendentes no lote)
        
        var saldoDisp = st.saldo ? st.saldo.saldo : null;
        var saldoOk = saldoDisp !== null && saldoDisp >= st.pendentesValorTotal;
        var badge = function(s) {
            var c = { processando: 'bg-yellow-100 text-yellow-800', pago: 'bg-green-100 text-green-800', erro: 'bg-red-100 text-red-800', concluido: 'bg-green-100 text-green-800', parcial: 'bg-orange-100 text-orange-800' };
            return React.createElement("span", { className: "px-2 py-1 rounded-full text-xs font-medium " + (c[s] || 'bg-gray-100 text-gray-800') }, s || '—');
        };
        
        return React.createElement("div", { className: "space-y-4 md:space-y-6" /* FIN_ABAS_V1: sem padding duplo */ },
            // Header
            React.createElement("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" },
                React.createElement("div", null,
                    React.createElement("h2", { className: "text-gray-900 font-bold", style: { fontFamily: "Sora, Inter, sans-serif", fontSize: 24, letterSpacing: "-0.01em", margin: 0 } }, "Pagamento automático via Pix") /* FIN_CLEAN_V1 */,
                    React.createElement("p", { className: "text-gray-500 mt-1 text-sm" }, "Stark Bank — Pagamentos em lote para motoboys")
                ),
                React.createElement("div", { className: "flex gap-2" },
                    React.createElement("button", { onClick: sincronizarStatus, className: "px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-xs md:text-sm font-semibold" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-refresh" })), "Sincronizar")),
                    React.createElement("button", { onClick: function() { carregarSaldo(); carregarPendentes(st.pendentesPage); }, className: "px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-xs md:text-sm font-semibold" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-refresh" })), "Atualizar"))
                )
            ),
            
            // Cards resumo
            React.createElement("div", { className: "fin-kpis" /* FIN_ABAS_V1: faixa única */ },
                React.createElement("div", { className: "" },
                    React.createElement("p", { className: "text-xs text-gray-500" }, "Saldo Stark Bank"),
                    React.createElement("p", { className: "text-lg md:text-2xl font-bold " + (saldoDisp > 0 ? "text-green-800" : "text-gray-400") }, st.saldoLoading ? "..." : saldoDisp !== null ? formatarMoeda(saldoDisp) : "N/D"),
                    React.createElement("p", { className: "text-[10px] md:text-xs text-gray-400 mt-1" }, st.status ? "Ambiente: " + (st.status.ambiente || '') : "")
                ),
                React.createElement("div", { className: "" },
                    React.createElement("p", { className: "text-xs text-gray-500" }, "Aguardando Pgto"),
                    React.createElement("p", { className: "text-lg md:text-2xl font-bold text-amber-800" }, st.pendentesTotal),
                    React.createElement("p", { className: "text-[10px] md:text-xs text-gray-400 mt-1" }, formatarMoeda(st.pendentesValorTotal))
                ),
                React.createElement("div", { className: "" },
                    React.createElement("p", { className: "text-xs text-gray-500" }, "Status SDK"),
                    React.createElement("p", { className: "text-lg md:text-2xl font-bold " + (st.status && st.status.sdk_operacional ? "text-green-800" : "text-red-600") }, st.status ? (st.status.sdk_operacional ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), "Online") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })), "Offline")) : "..."),
                    React.createElement("p", { className: "text-[10px] md:text-xs text-gray-400 mt-1" }, st.status && st.status.estatisticas ? "Total pagos: " + (st.status.estatisticas.pagos || 0) : "")
                ),
                React.createElement("div", { className: "" },
                    React.createElement("p", { className: "text-xs text-gray-500" }, "Cobertura do Lote"),
                    React.createElement("p", { className: "text-lg md:text-2xl font-bold " + (st.pendentesTotal === 0 ? "text-gray-400" : saldoOk ? "text-green-800" : "text-red-600") }, st.pendentesTotal === 0 ? "—" : saldoOk ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), "OK") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#d97706" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-alert" })), "Insuf.")),
                    !saldoOk && st.pendentesTotal > 0 && saldoDisp !== null ? React.createElement("p", { className: "text-[10px] md:text-xs text-red-500 mt-1" }, "Faltam " + formatarMoeda(st.pendentesValorTotal - saldoDisp)) : null
                )
            ),
            
            // Sub-tabs
            React.createElement("div", { className: "flex gap-2 border-b border-gray-200 overflow-x-auto" /* FIN_CLEAN_V1: abas internas */ },
                React.createElement("button", { onClick: function() { setSt(function(p) { return Object.assign({}, p, { subTab: 'pendentes', loteDetalhe: null }); }); }, className: "px-3 py-2.5 -mb-px text-sm border-b-2 inline-flex items-center gap-1.5 whitespace-nowrap " + (st.subTab === 'pendentes' ? "border-purple-700 text-purple-800 font-semibold" : "border-transparent text-gray-500 hover:text-gray-700") }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clipboard" })), "Pendentes (" + st.pendentesTotal + ")"),
                React.createElement("button", { onClick: function() { setSt(function(p) { return Object.assign({}, p, { subTab: 'historico', loteDetalhe: null }); }); carregarHistorico(); }, className: "px-3 py-2.5 -mb-px text-sm border-b-2 inline-flex items-center gap-1.5 whitespace-nowrap " + (st.subTab === 'historico' ? "border-purple-700 text-purple-800 font-semibold" : "border-transparent text-gray-500 hover:text-gray-700") }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-filetext" })), "Histórico de Lotes"))
            ),
            
            // ===== TAB PENDENTES =====
            st.subTab === 'pendentes' && React.createElement("div", { className: "space-y-4" },
                // Filtros de data
                React.createElement("div", { className: "flex flex-wrap items-end gap-2 md:gap-3 bg-white rounded-xl p-3 md:p-4 border border-gray-200" },
                    React.createElement("div", { className: "flex-1 min-w-[130px]" },
                        React.createElement("label", { className: "block text-xs text-gray-500 mb-1" }, "Data Início"),
                        React.createElement("input", { type: "date", value: filtros.data_inicio, onChange: function(e) { setFiltros(function(p) { return Object.assign({}, p, { data_inicio: e.target.value }); }); }, className: "border border-gray-300 rounded-lg px-3 py-2 text-sm w-full" })
                    ),
                    React.createElement("div", { className: "flex-1 min-w-[130px]" },
                        React.createElement("label", { className: "block text-xs text-gray-500 mb-1" }, "Data Fim"),
                        React.createElement("input", { type: "date", value: filtros.data_fim, onChange: function(e) { setFiltros(function(p) { return Object.assign({}, p, { data_fim: e.target.value }); }); }, className: "border border-gray-300 rounded-lg px-3 py-2 text-sm w-full" })
                    ),
                    React.createElement("button", { onClick: function() { carregarPendentes(1); }, className: "px-4 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-800 text-sm font-medium" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-search" })), "Filtrar")),
                    React.createElement("button", { onClick: function() { var f = { data_inicio: '', data_fim: '' }; setFiltros(f); carregarPendentes(1, f); }, className: "px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-xs md:text-sm whitespace-nowrap" }, "Limpar filtros (últimos 30 dias)")
                ),
                
                // Barra de ação global
                st.pendentes.length > 0 && React.createElement("div", { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white rounded-xl p-3 md:p-4 border border-gray-200" },
                    React.createElement("div", { className: "flex items-center gap-3" },
                        React.createElement("input", { type: "checkbox", checked: st.pendentes.length > 0 && st.pendentes.every(function(s) { return sel[s.id]; }), onChange: toggleTodos, className: "w-5 h-5 rounded border-gray-300 accent-purple-700" }),
                        React.createElement("span", { className: "text-xs md:text-sm text-gray-600" }, idsSelecionados.length > 0 ? idsSelecionados.length + " selecionado(s) — " + formatarMoeda(valorSelecionado) : "Selecionar todos (" + st.pendentes.length + ")")
                    ),
                    React.createElement("button", { onClick: iniciarPagamento, disabled: st.executando || !(st.status && st.status.sdk_operacional), className: "w-full sm:w-auto px-4 md:px-6 py-3 bg-purple-700 text-white rounded-xl font-bold hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm md:text-base" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-lock" })), "Executar Pagamento"))
                ),
                
                // Lotes em accordion
                st.pendentesLoading ? React.createElement("div", { className: "text-center py-10 text-gray-400" }, "Carregando...")
                : st.pendentes.length === 0 ? React.createElement("div", { className: "text-center py-10 bg-white rounded-xl border border-gray-200" }, React.createElement("svg", { className: "ico", style: { width: 48, height: 48, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), React.createElement("p", { className: "text-gray-500 text-lg" }, "Nenhum saque no período selecionado"))
                : (function() {
                    // Agrupar por stark_lote_id real (do banco) — fallback para lote virtual se não tiver
                    var sortedPendentes = st.pendentes.slice().sort(function(a, b) { return parseFloat(b.final_amount || 0) - parseFloat(a.final_amount || 0); });
                    
                    // Separar: com lote_id real vs sem lote_id
                    var porLote = {};
                    var semLote = [];
                    sortedPendentes.forEach(function(s) {
                        if (s.stark_lote_id) {
                            if (!porLote[s.stark_lote_id]) porLote[s.stark_lote_id] = [];
                            porLote[s.stark_lote_id].push(s);
                        } else {
                            semLote.push(s);
                        }
                    });
                    
                    // Montar array de lotes: primeiro os reais (por ID desc), depois os sem lote
                    var lotes = [];
                    Object.keys(porLote).sort(function(a, b) { return parseInt(b) - parseInt(a); }).forEach(function(loteId) {
                        lotes.push({ id: parseInt(loteId), saques: porLote[loteId] });
                    });
                    if (semLote.length > 0) {
                        lotes.push({ id: null, saques: semLote });
                    }
                    
                    return React.createElement("div", { className: "space-y-3" },
                        lotes.map(function(loteObj, idx) {
                            var loteSaques = loteObj.saques;
                            var loteNum = loteObj.id || ('temp_' + (idx + 1));
                            var loteLabel = loteObj.id ? ('Lote #' + loteObj.id) : ('Lote ' + (idx + 1));
                            var loteValorTotal = loteSaques.reduce(function(a, s) { return a + parseFloat(s.final_amount || 0); }, 0);
                            var loteSelecionados = loteSaques.filter(function(s) { return sel[s.id]; }).length;
                            var loteExpandido = st['loteExp_' + idx];
                            var agora = new Date().toLocaleString('pt-BR');
                            
                            return React.createElement("div", { key: idx, className: "bg-white rounded-xl overflow-hidden border " + (loteSelecionados === loteSaques.length ? "border-purple-200" : "border-gray-200") },
                                // Header do lote (clicável)
                                React.createElement("div", {
                                    onClick: function() { setSt(function(p) { var k = 'loteExp_' + idx; var n = Object.assign({}, p); n[k] = !n[k]; return n; }); },
                                    className: "flex items-center justify-between p-3 md:p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                },
                                    React.createElement("div", { className: "flex items-center gap-2 md:gap-4 flex-1 min-w-0" },
                                        // Checkbox do lote inteiro
                                        React.createElement("input", {
                                            type: "checkbox",
                                            checked: loteSaques.every(function(s) { return sel[s.id]; }),
                                            onChange: function(e) {
                                                e.stopPropagation();
                                                var todosSelec = loteSaques.every(function(s) { return sel[s.id]; });
                                                setSel(function(p) {
                                                    var n = Object.assign({}, p);
                                                    loteSaques.forEach(function(s) { if (todosSelec) delete n[s.id]; else n[s.id] = true; });
                                                    return n;
                                                });
                                            },
                                            onClick: function(e) { e.stopPropagation(); },
                                            className: "w-5 h-5 rounded border-gray-300 accent-purple-700 flex-shrink-0"
                                        }),
                                        // Info do lote
                                        React.createElement("div", { className: "min-w-0" },
                                            React.createElement("div", { className: "flex flex-wrap items-center gap-2" },
                                                React.createElement("span", { className: "bg-purple-50 text-purple-800 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-semibold" }, loteLabel),
                                                React.createElement("span", { className: "text-gray-700 font-medium text-xs md:text-sm" }, loteSaques.length + " solic."),
                                                React.createElement("span", { className: "text-gray-900 font-bold text-sm md:text-lg" }, formatarMoeda(loteValorTotal))
                                            ),
                                            React.createElement("p", { className: "text-xs text-gray-400 mt-1 truncate" }, loteSelecionados > 0 ? loteSelecionados + " selecionado(s)" : "Clique para expandir")
                                        )
                                    ),
                                    // Seta de expandir
                                    React.createElement("span", { className: "text-gray-400 text-xl transition-transform flex-shrink-0 ml-2 " + (loteExpandido ? "rotate-180" : "") }, "▼")
                                ),
                                
                                // Conteúdo expandido
                                loteExpandido && React.createElement("div", { className: "border-t overflow-x-auto" },
                                    React.createElement("table", { className: "w-full text-sm min-w-[700px]" },
                                        React.createElement("thead", null, React.createElement("tr", { className: "bg-gray-50 border-b" },
                                            React.createElement("th", { className: "px-4 py-2 text-left w-10" }, ""),
                                            React.createElement("th", { className: "px-4 py-2 text-left" }, "Profissional"),
                                            React.createElement("th", { className: "px-4 py-2 text-left" }, "Chave Pix"),
                                            React.createElement("th", { className: "px-4 py-2 text-right" }, "Valor"),
                                            React.createElement("th", { className: "px-4 py-2 text-center" }, "Status"),
                                            React.createElement("th", { className: "px-4 py-2 text-left" }, "Aprovado em")
                                        )),
                                        React.createElement("tbody", null, loteSaques.map(function(s, sIdx) {
                                            var v = validacoes[s.id];
                                            return React.createElement("tr", { key: s.id, className: "border-b hover:bg-gray-50 " + (sel[s.id] ? "bg-purple-50" : "") },
                                                React.createElement("td", { className: "px-4 py-2.5" }, React.createElement("input", { type: "checkbox", checked: !!sel[s.id], onChange: function() { toggleSel(s.id); }, className: "w-4 h-4 rounded border-gray-300 accent-purple-700" })),
                                                React.createElement("td", { className: "px-4 py-2.5" },
                                                    React.createElement("div", { className: "font-medium text-gray-800" }, s.user_name),
                                                    React.createElement("div", { className: "text-xs text-gray-400" }, "#" + s.user_cod)
                                                ),
                                                React.createElement("td", { className: "px-4 py-2.5 text-gray-600 text-xs max-w-[180px] truncate" }, s.pix_key),
                                                React.createElement("td", { className: "px-4 py-2.5 text-right font-bold " + (parseFloat(s.final_amount) >= 200 ? "text-green-800 text-base" : "text-gray-700") }, formatarMoeda(s.final_amount)),
                                                React.createElement("td", { className: "px-4 py-2.5 text-center" },
                                                    /* [SAQUE_DIVERG_V1] titular divergente: badge vermelho + "Confirmo pagar" (igual ao acerto) */
                                                    (v && v.dict_status === 'ok' && v.cpf_divergente)
                                                        ? React.createElement("div", { className: "flex flex-col items-center gap-1" },
                                                            React.createElement("span", { className: "px-2 py-1 rounded-full text-xs font-bold bg-red-50 text-red-800", title: v.dict_nome ? ("Chave Pix em nome de: " + v.dict_nome) : "Titular diferente do cadastro" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, Icon("alert"), "Titular diferente")),
                                                            v.dict_nome ? React.createElement("span", { className: "text-[10px] text-gray-500 max-w-[150px] truncate" }, v.dict_nome) : null,
                                                            React.createElement("label", { className: "flex items-center gap-1 text-xs font-medium cursor-pointer " + (divConfirmSaque[s.id] ? "text-green-800" : "text-red-600") },
                                                                React.createElement("input", { type: "checkbox", checked: !!divConfirmSaque[s.id], onChange: function() { setDivConfirmSaque(function(p) { var n = Object.assign({}, p); if (n[s.id]) { delete n[s.id]; } else { n[s.id] = true; } return n; }); }, className: "w-3.5 h-3.5 accent-purple-700" }),
                                                                divConfirmSaque[s.id] ? "Pagamento confirmado" : "Confirmo pagar"
                                                            )
                                                          )
                                                        : (v && v.dict_status === 'ok')
                                                            ? React.createElement("span", { className: "px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-800", title: v.dict_nome || "" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, Icon("check"), "Conferido"))
                                                            : (v && v.dict_status === 'erro')
                                                                ? React.createElement("span", { className: "px-2 py-1 rounded-full text-xs font-bold bg-red-50 text-red-800", title: (v.alertas || []).join(' | ') }, "Rever Pix")
                                                                : (s.stark_status ? badge(s.stark_status) : React.createElement("span", { className: "px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-800" }, "Aguardando"))
                                                ),
                                                React.createElement("td", { className: "px-4 py-2.5 text-xs text-gray-500" }, s.approved_at ? new Date(s.approved_at).toLocaleString('pt-BR') : '—')
                                            );
                                        }))
                                    ),
                                    // Footer do lote
                                    React.createElement("div", { className: "flex items-center justify-between px-4 py-3 bg-gray-50 border-t" },
                                        React.createElement("span", { className: "text-sm text-gray-500" }, loteSaques.length + " saques • Ordenados por valor (maior primeiro)"),
                                        React.createElement("span", { className: "text-sm font-bold text-green-800" }, "Total: " + formatarMoeda(loteValorTotal))
                                    )
                                )
                            );
                        })
                    );
                })(),
                
                // Paginação
                st.pendentesTotalPages > 1 && React.createElement("div", { className: "flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200" },
                    React.createElement("span", { className: "text-sm text-gray-500" }, "Página " + st.pendentesPage + " de " + st.pendentesTotalPages + " (" + st.pendentesTotal + " saques)"),
                    React.createElement("div", { className: "flex gap-2" },
                        React.createElement("button", { disabled: st.pendentesPage <= 1, onClick: function() { carregarPendentes(st.pendentesPage - 1); }, className: "px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm" }, "← Anterior"),
                        React.createElement("button", { disabled: st.pendentesPage >= st.pendentesTotalPages, onClick: function() { carregarPendentes(st.pendentesPage + 1); }, className: "px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm" }, "Próxima →")
                    )
                )
            ),
            
            // ===== TAB HISTÓRICO =====
            st.subTab === 'historico' && !st.loteDetalhe && React.createElement("div", { className: "space-y-4" },
                st.historicoLoading ? React.createElement("div", { className: "text-center py-10 text-gray-400" }, "Carregando...")
                : st.historico.length === 0 ? React.createElement("div", { className: "text-center py-10 bg-white rounded-xl border border-gray-200" }, React.createElement("p", { className: "text-gray-400" }, "Nenhum lote executado ainda"))
                : React.createElement("div", { className: "bg-white rounded-xl overflow-x-auto border border-gray-200" },
                    React.createElement("table", { className: "w-full text-sm" },
                        React.createElement("thead", null, React.createElement("tr", { className: "bg-gray-50 border-b" },
                            React.createElement("th", { className: "px-4 py-3 text-left" }, "Lote"),
                            React.createElement("th", { className: "px-4 py-3 text-center" }, "Qtd"),
                            React.createElement("th", { className: "px-4 py-3 text-right" }, "Valor Total"),
                            React.createElement("th", { className: "px-4 py-3 text-center" }, "Status"),
                            React.createElement("th", { className: "px-4 py-3 text-center" }, "Pagos"),
                            React.createElement("th", { className: "px-4 py-3 text-center" }, "Erros"),
                            React.createElement("th", { className: "px-4 py-3 text-left" }, "Executado por"),
                            React.createElement("th", { className: "px-4 py-3 text-left" }, "Data"),
                            React.createElement("th", { className: "px-4 py-3 text-center" }, "Ações")
                        )),
                        React.createElement("tbody", null, st.historico.map(function(l) {
                            return React.createElement("tr", { key: l.id, className: "border-b hover:bg-gray-50" },
                                React.createElement("td", { className: "px-4 py-3 font-bold text-gray-700" }, "#" + l.id),
                                React.createElement("td", { className: "px-4 py-3 text-center" }, l.quantidade),
                                React.createElement("td", { className: "px-4 py-3 text-right font-medium" }, formatarMoeda(l.valor_total)),
                                React.createElement("td", { className: "px-4 py-3 text-center" }, badge(l.status)),
                                React.createElement("td", { className: "px-4 py-3 text-center text-green-800 font-medium" }, l.itens_pagos || 0),
                                React.createElement("td", { className: "px-4 py-3 text-center text-red-600 font-medium" }, l.itens_erro || 0),
                                React.createElement("td", { className: "px-4 py-3 text-sm text-gray-600" }, l.executado_por_nome || '—'),
                                React.createElement("td", { className: "px-4 py-3 text-xs text-gray-500" }, l.created_at ? new Date(l.created_at).toLocaleString('pt-BR') : '—'),
                                React.createElement("td", { className: "px-4 py-3 text-center" }, React.createElement("div", { className: "flex gap-1 justify-center" },
                                    React.createElement("button", { onClick: function() { verDetalhe(l.id); }, className: "px-3 py-1 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs hover:bg-gray-50" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-eye" })), "Ver"))
                                ))
                            );
                        }))
                    )
                )
            ),
            
            // ===== DETALHE LOTE =====
            st.subTab === 'historico' && st.loteDetalhe && React.createElement("div", { className: "space-y-4" },
                React.createElement("button", { onClick: function() { setSt(function(p) { return Object.assign({}, p, { loteDetalhe: null }); }); }, className: "px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-semibold" }, "← Voltar"),
                st.loteDetalheLoading ? React.createElement("div", { className: "text-center py-10 text-gray-400" }, "Carregando...")
                : React.createElement("div", { className: "space-y-4" },
                    React.createElement("div", { className: "bg-white rounded-xl p-5 border border-gray-200" },
                        React.createElement("h3", { className: "text-lg font-bold text-gray-800 mb-3" }, "Lote #" + st.loteDetalhe.lote.id),
                        React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4 text-sm" },
                            React.createElement("div", null, React.createElement("p", { className: "text-gray-500" }, "Status"), badge(st.loteDetalhe.lote.status)),
                            React.createElement("div", null, React.createElement("p", { className: "text-gray-500" }, "Valor Total"), React.createElement("p", { className: "font-bold" }, formatarMoeda(st.loteDetalhe.lote.valor_total))),
                            React.createElement("div", null, React.createElement("p", { className: "text-gray-500" }, "Saldo Antes"), React.createElement("p", { className: "font-bold" }, formatarMoeda(st.loteDetalhe.lote.saldo_antes))),
                            React.createElement("div", null, React.createElement("p", { className: "text-gray-500" }, "Executado por"), React.createElement("p", { className: "font-medium" }, st.loteDetalhe.lote.executado_por_nome || '—'))
                        )
                    ),
                    React.createElement("div", { className: "bg-white rounded-xl overflow-x-auto border border-gray-200" },
                        React.createElement("table", { className: "w-full text-sm" },
                            React.createElement("thead", null, React.createElement("tr", { className: "bg-gray-50 border-b" },
                                React.createElement("th", { className: "px-4 py-3 text-left" }, "Profissional"),
                                React.createElement("th", { className: "px-4 py-3 text-left" }, "Chave Pix"),
                                React.createElement("th", { className: "px-4 py-3 text-right" }, "Valor"),
                                React.createElement("th", { className: "px-4 py-3 text-center" }, "Status"),
                                React.createElement("th", { className: "px-4 py-3 text-left" }, "Transfer ID"),
                                React.createElement("th", { className: "px-4 py-3 text-left" }, "Erro")
                            )),
                            React.createElement("tbody", null, (st.loteDetalhe.itens || []).map(function(i) {
                                return React.createElement("tr", { key: i.id, className: "border-b hover:bg-gray-50" },
                                    React.createElement("td", { className: "px-4 py-3 font-medium" }, i.user_name || ('Saque #' + i.withdrawal_id)),
                                    React.createElement("td", { className: "px-4 py-3 text-gray-600 text-xs" }, i.pix_key || '—'),
                                    React.createElement("td", { className: "px-4 py-3 text-right font-bold" }, formatarMoeda(i.valor)),
                                    React.createElement("td", { className: "px-4 py-3 text-center" }, badge(i.status)),
                                    React.createElement("td", { className: "px-4 py-3 text-xs text-gray-400 font-mono" }, (i.stark_transfer_id || '—').substring(0, 20)),
                                    React.createElement("td", { className: "px-4 py-3 text-xs text-red-500" }, i.erro || '')
                                );
                            }))
                        )
                    )
                )
            ),
            
            // Info
            React.createElement("div", { className: "bg-white border border-gray-200 rounded-xl p-4" },

            // ===== MODAL RESULTADO DO PAGAMENTO =====
            modalResultado.aberto && React.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" },
                React.createElement("div", { className: "bg-white rounded-2xl max-w-lg w-full overflow-hidden border border-gray-200" },
                    // Header - verde se tudo ok, amarelo se teve rejeitados
                    React.createElement("div", { className: "bg-white border-b border-gray-200 p-6 text-gray-900 text-center" },
                        React.createElement("span", { className: "text-5xl" }, modalResultado.rejeitados > 0 ? React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#d97706" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-alert" })) : React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" }))),
                        React.createElement("h3", { className: "text-xl font-bold mt-3" }, modalResultado.rejeitados > 0 ? "Pagamento Parcial" : "Pagamento Enviado!"),
                        React.createElement("p", { className: "text-sm opacity-90 mt-1" }, "Lote #" + modalResultado.loteId)
                    ),
                    
                    React.createElement("div", { className: "p-6 space-y-4" },
                        // Cards de resumo
                        React.createElement("div", { className: "grid grid-cols-2 gap-3" },
                            React.createElement("div", { className: "bg-green-50 rounded-xl p-4 text-center" },
                                React.createElement("p", { className: "text-3xl font-bold text-green-800" }, modalResultado.enviados),
                                React.createElement("p", { className: "text-xs text-green-800 mt-1" }, "Pagamentos enviados"),
                                React.createElement("p", { className: "text-sm font-medium text-green-800 mt-1" }, formatarMoeda(modalResultado.valorEnviado))
                            ),
                            React.createElement("div", { className: "rounded-xl p-4 text-center " + (modalResultado.rejeitados > 0 ? "bg-red-50" : "bg-gray-50") },
                                React.createElement("p", { className: "text-3xl font-bold " + (modalResultado.rejeitados > 0 ? "text-red-600" : "text-gray-300") }, modalResultado.rejeitados),
                                React.createElement("p", { className: "text-xs mt-1 " + (modalResultado.rejeitados > 0 ? "text-red-800" : "text-gray-400") }, "Rejeitados"),
                                modalResultado.rejeitados > 0 && React.createElement("p", { className: "text-xs text-red-500 mt-1" }, "Continuam pendentes")
                            )
                        ),
                        
                        // Lista de rejeitados (se houver)
                        modalResultado.rejeitados > 0 && modalResultado.detalhesRejeitados.length > 0 && React.createElement("div", { className: "bg-red-50 border border-red-200 rounded-xl p-4" },
                            React.createElement("p", { className: "text-sm font-bold text-red-800 mb-3 flex items-center gap-2" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })), "Solicitações rejeitadas:")),
                            React.createElement("div", { className: "space-y-2 max-h-48 overflow-y-auto" },
                                modalResultado.detalhesRejeitados.map(function(rej, i) {
                                    return React.createElement("div", { key: i, className: "flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-red-100" },
                                        React.createElement("div", null,
                                            React.createElement("p", { className: "text-sm font-medium text-gray-800" }, rej.nome),
                                            React.createElement("p", { className: "text-xs text-red-500 mt-0.5" }, (rej.erro || '').substring(0, 80))
                                        ),
                                        React.createElement("span", { className: "px-2 py-1 bg-red-50 text-red-800 rounded-full text-xs font-medium flex-shrink-0 ml-2" }, "Pendente")
                                    );
                                })
                            ),
                            React.createElement("p", { className: "text-xs text-red-600 mt-3 text-center" }, "Estes saques continuam na lista de pendentes para nova tentativa.")
                        ),
                        
                        // Mensagem de sucesso total
                        modalResultado.rejeitados === 0 && React.createElement("div", { className: "bg-green-50 border border-green-200 rounded-xl p-4 text-center" },
                            React.createElement("p", { className: "text-green-800" }, "Todos os pagamentos foram enviados com sucesso!"),
                            React.createElement("p", { className: "text-xs text-green-800 mt-1" }, "O status será atualizado via webhook quando confirmados.")
                        ),
                        
                        // Botão fechar
                        React.createElement("button", {
                            onClick: function() { setModalResultado(function(p) { return Object.assign({}, p, { aberto: false }); }); },
                            className: "w-full py-3 bg-purple-700 text-white rounded-xl font-bold hover:bg-purple-800"
                        }, "Entendido")
                    )
                )
            ),

            // ===== MODAL 2FA =====
            modal2fa.aberto && React.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center sm:p-4" },
                React.createElement("div", { className: "bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md overflow-hidden max-h-[90vh] overflow-y-auto border border-gray-200" },
                    // Header do modal
                    React.createElement("div", { className: "bg-white border-b border-gray-200 p-6 text-gray-900 text-center" },
                        React.createElement("svg", { className: "ico", style: { fontSize: 28, color: "#770fa8" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-lock" })),
                        React.createElement("h3", { className: "text-xl font-bold mt-2" }, "Confirmação de Segurança"),
                        React.createElement("p", { className: "text-gray-500 text-sm mt-1" }, "Pagamento via Stark Bank")
                    ),
                    
                    React.createElement("div", { className: "p-6 space-y-4" },
                        // Resumo do pagamento
                        React.createElement("div", { className: "bg-gray-50 rounded-xl p-4" },
                            React.createElement("div", { className: "flex justify-between text-sm" },
                                React.createElement("span", { className: "text-gray-500" }, "Quantidade:"),
                                React.createElement("span", { className: "font-bold" }, (idsSelecionados.length > 0 ? idsSelecionados.length : st.pendentes.length) + " saques")
                            ),
                            React.createElement("div", { className: "flex justify-between text-sm mt-2" },
                                React.createElement("span", { className: "text-gray-500" }, "Valor total:"),
                                React.createElement("span", { className: "font-bold text-green-800" }, formatarMoeda(idsSelecionados.length > 0 ? valorSelecionado : st.pendentesValorTotal))
                            )
                        ),
                        
                        // Etapa: Confirmar e solicitar token
                        modal2fa.etapa === 'confirmar' && React.createElement("div", { className: "space-y-4 text-center" },
                            React.createElement("p", { className: "text-gray-600 text-sm" }, "Para prosseguir, um código de verificação será enviado para o email cadastrado."),
                            React.createElement("button", {
                                onClick: solicitarToken,
                                disabled: modal2fa.enviando,
                                className: "w-full py-3 bg-purple-700 text-white rounded-xl font-bold hover:bg-purple-800 disabled:opacity-50"
                            }, modal2fa.enviando ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-mail" })), "Enviando código...") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-mail" })), "Enviar código por email"))
                        ),
                        
                        // Etapa: Digitar token
                        modal2fa.etapa === 'digitar' && React.createElement("div", { className: "space-y-4 text-center" },
                            React.createElement("p", { className: "text-gray-600 text-sm" }, "Código enviado para ", React.createElement("strong", null, modal2fa.emailMascarado)),
                            React.createElement("input", {
                                type: "text",
                                maxLength: 6,
                                placeholder: "000000",
                                value: modal2fa.tokenDigitado,
                                onChange: function(e) { var v = e.target.value.replace(/\D/g, '').substring(0, 6); setModal2fa(function(p) { return Object.assign({}, p, { tokenDigitado: v, erro: '' }); }); },
                                className: "w-full text-center text-3xl font-bold tracking-[12px] border-2 border-gray-300 rounded-xl py-4 focus:border-purple-700 focus:ring-2 focus:ring-purple-200 outline-none",
                                autoFocus: true
                            }),
                            React.createElement("p", { className: "text-xs text-gray-400" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clock" })), "Válido por 5 minutos")),
                            React.createElement("button", {
                                onClick: validarTokenEExecutar,
                                disabled: modal2fa.validando || modal2fa.tokenDigitado.length !== 6,
                                className: "w-full py-3 bg-purple-700 text-white rounded-xl font-bold hover:bg-purple-800 disabled:opacity-50"
                            }, modal2fa.validando ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clock" })), "Validando e executando...") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), "Confirmar e Pagar")),
                            React.createElement("button", {
                                onClick: solicitarToken,
                                disabled: modal2fa.enviando,
                                className: "text-sm text-purple-700 hover:underline"
                            }, "Reenviar código")
                        ),
                        
                        // Etapa: Executando
                        modal2fa.etapa === 'executando' && React.createElement("div", { className: "text-center py-4" },
                            React.createElement("svg", { className: "ico", style: { width: 38, height: 38 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clock" })),
                            React.createElement("p", { className: "text-gray-600 font-medium" }, "Executando pagamentos..."),
                            React.createElement("p", { className: "text-gray-400 text-sm mt-1" }, "Não feche esta janela")
                        ),
                        
                        // Erro
                        modal2fa.erro && React.createElement("div", { className: "bg-red-50 border border-red-200 rounded-lg p-3 text-center" },
                            React.createElement("p", { className: "text-red-600 text-sm" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })), "" + modal2fa.erro)
                        ),
                        
                        // Botão cancelar
                        modal2fa.etapa !== 'executando' && React.createElement("button", {
                            onClick: function() { setModal2fa(function(p) { return Object.assign({}, p, { aberto: false }); }); },
                            className: "w-full py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-semibold"
                        }, "Cancelar")
                    )
                )
            ),
                React.createElement("p", { className: "text-sm text-gray-900 font-semibold" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", "aria-hidden": "true" }, React.createElement("use", { href: "#i-info" })), "Como funciona")),
                React.createElement("ul", { className: "text-xs text-gray-600 mt-2 space-y-1" },
                    React.createElement("li", null, "• Use os filtros de data para selecionar o período de saques aprovados"),
                    React.createElement("li", null, "• Sem filtro, mostra apenas os últimos 30 dias"),
                    React.createElement("li", null, "• Selecione os saques desejados e clique em Executar Pagamento"),
                    React.createElement("li", null, "• Confirmações chegam via webhook — status atualiza automaticamente"),
                    React.createElement("li", null, "• O campo externalId garante que pagamentos nunca são duplicados")
                )
            )
        );
    };


    // ==================== ACERTO PROFISSIONAL COMPONENT ====================
    window.AcertoProfComponent = function(props) {
        var fetchAuth = props.fetchAuth;
        var API_URL = props.API_URL;
        var Toast = props.Toast;
        var formatarMoeda = window.formatarMoeda;

        // ===== State principal (persistente entre sub-tabs) =====
        var _st = React.useState({
            subTab: 'novo', // novo, aprovacao, historico
            // Upload / Preview
            uploading: false,
            dados: null, // resultado do processamento da planilha (persiste entre tabs)
            // Aprovação
            lotesAprovacao: [],
            lotesAprovacaoLoading: false,
            loteDetalhe: null,
            loteDetalheLoading: false,
            // Histórico
            historico: [],
            historicoLoading: false,
            // Saldo Stark
            saldoStark: null,
            saldoLoading: false,
            // Execução
            executando: false
        });
        var st = _st[0]; var setSt = _st[1];

        // ===== State de seleção (checkboxes) =====
        var _sel = React.useState({}); // { "cod_prof": true }
        var sel = _sel[0]; var setSel = _sel[1];

        // ===== State 2FA =====
        var _modal2fa = React.useState({
            aberto: false, etapa: 'confirmar', chaveToken: null, emailMascarado: '',
            tokenDigitado: '', enviando: false, validando: false, erro: '', loteId: null
        });
        var modal2fa = _modal2fa[0]; var setModal2fa = _modal2fa[1];

        // ===== Modal resultado =====
        var _modalRes = React.useState({
            aberto: false, enviados: 0, rejeitados: 0, valorEnviado: 0,
            detalhesRejeitados: [], saldoAntes: null
        });
        var modalRes = _modalRes[0]; var setModalRes = _modalRes[1];

        // ===== State validação DICT =====
        var _dictResults = React.useState({}); // { cod_prof: { loading, success, dict, erro, divergente, titular_nome } }
        var dictResults = _dictResults[0]; var setDictResults = _dictResults[1];
        // 🆕 PIX_UX_V1: confirmação do ADM para pagar chave de titular divergente
        var _divConfirm = React.useState({}); // { cod_prof: true }
        var divConfirm = _divConfirm[0]; var setDivConfirm = _divConfirm[1];

        // 🆕 PIX_UX_V1: linha com titular divergente e ainda NÃO confirmada pelo ADM
        var isDivBloqueado = function(cod) {
            var dr = dictResults[cod];
            return !!(dr && dr.success && dr.divergente && !divConfirm[cod]);
        };

        // 🆕 ACERTO_DEDUP_V1: já pago neste ciclo (mesmo cód + mesmo valor) — intocável
        var isJaPago = function(p) {
            return !!(p && (p.status === 'ja_pago' || p.ja_pago));
        };

        // 🆕 ACERTO_DEDUP_V1: rank p/ agrupar a lista:
        //   0 = precisa de ação (erro/ajuste/titular divergente) -> TOPO
        //   1 = pagável/pronto -> meio
        //   2 = sem pix / restrito -> abaixo
        //   3 = JÁ PAGO -> FUNDO (intocável)
        var rankLinha = function(p) {
            if (isJaPago(p)) return 3;
            var dr = dictResults[p.cod_prof];
            var precisaAcao = (p.status === 'sem_pix') ||
                (dr && dr.success === false) ||
                (dr && dr.success === true && dr.divergente && !divConfirm[p.cod_prof]);
            if (precisaAcao) return 0;
            if (p.status === 'restrito' || p.is_restricted) return 2;
            return 1;
        };

        // ===== Helpers de seleção =====
        var profissionaisProntos = (st.dados && st.dados.profissionais || []).filter(function(p) { return p.status === 'pronto'; });
        var profissionaisSemPix = (st.dados && st.dados.profissionais || []).filter(function(p) { return p.status === 'sem_pix'; });
        var todosProfs = st.dados && st.dados.profissionais || [];

        // Só entra no pagamento quem está pronto E não é divergente-bloqueado
        var selecionados = profissionaisProntos.filter(function(p) { return sel[p.cod_prof] && !isDivBloqueado(p.cod_prof); });
        var valorSelecionado = selecionados.reduce(function(a, p) { return a + p.saldo; }, 0);
        var qtdSelecionados = selecionados.length;

        // 🆕 PIX_UX_V2: linhas que precisam de ação (reverificar chave ou confirmar titular divergente)
        var pendentesVerif = todosProfs.filter(function(p) {
            if (p.status === 'restrito' || p.status === 'sem_pix' || p.status === 'ja_pago' || p.ja_pago || !p.pix_key) return false; /* ACERTO_DEDUP_V1: já pago não precisa de atenção */
            var dr = dictResults[p.cod_prof];
            if (dr && dr.success === false) return true;
            if (dr && dr.success === true && dr.divergente && !divConfirm[p.cod_prof]) return true;
            return false;
        });
        var irParaLinha = function(cod) {
            try {
                var el = document.getElementById('acerto-row-' + cod);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    var old = el.style.boxShadow;
                    el.style.boxShadow = 'inset 0 0 0 2px #d97706';
                    setTimeout(function() { el.style.boxShadow = old || ''; }, 1600);
                }
            } catch (e) {}
        };

        var todosEstaoSelecionados = profissionaisProntos.length > 0 && profissionaisProntos.every(function(p) { return sel[p.cod_prof]; });

        var toggleSel = function(codProf) {
            setSel(function(prev) {
                var n = Object.assign({}, prev);
                if (n[codProf]) { delete n[codProf]; } else { n[codProf] = true; }
                return n;
            });
        };

        var toggleTodos = function() {
            if (todosEstaoSelecionados) {
                setSel({});
            } else {
                var n = {};
                profissionaisProntos.forEach(function(p) { n[p.cod_prof] = true; });
                setSel(n);
            }
        };

        // ===== Carregar saldo Stark Bank =====
        var carregarSaldo = async function() {
            setSt(function(p) { return Object.assign({}, p, { saldoLoading: true }); });
            try {
                var r = await fetchAuth(API_URL + '/stark/saldo');
                var d = await r.json();
                setSt(function(p) { return Object.assign({}, p, { saldoStark: d.saldo, saldoLoading: false }); });
            } catch (e) {
                setSt(function(p) { return Object.assign({}, p, { saldoLoading: false }); });
            }
        };

        // ===== Upload da planilha =====
        var handleUpload = async function(e) {
            var file = e.target.files[0];
            if (!file) return;

            setSt(function(p) { return Object.assign({}, p, { uploading: true }); });

            var reader = new FileReader();
            reader.onload = async function(ev) {
                var base64 = ev.target.result.split(',')[1];
                try {
                    var r = await fetchAuth(API_URL + '/stark/acerto/upload', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ planilha_base64: base64, nome_arquivo: file.name })
                    });
                    var d = await r.json();
                    if (d.success) {
                        setSt(function(p) { return Object.assign({}, p, { dados: d, uploading: false }); });
                        // Selecionar todos os prontos por padrão
                        var selInicial = {};
                        (d.profissionais || []).forEach(function(prof) {
                            if (prof.status === 'pronto') selInicial[prof.cod_prof] = true;
                        });
                        setSel(selInicial);
                        // Pre-popular validações DICT salvas (cache do banco)
                        var dictInicial = {};
                        (d.profissionais || []).forEach(function(prof) {
                            if (prof.dict_validacao) {
                                dictInicial[prof.cod_prof] = {
                                    loading: false,
                                    success: prof.dict_validacao.valido,
                                    dict: prof.dict_validacao.valido ? { nome: prof.dict_validacao.nome, banco: prof.dict_validacao.banco } : null,
                                    erro: prof.dict_validacao.erro || null,
                                    /* [PIX_PREVIEW_V1] leva a divergencia de titular da previa pra UI (badge + checkbox) */
                                    divergente: !!prof.dict_validacao.divergente,
                                    titular_nome: prof.dict_validacao.nome || null,
                                    validado_em: prof.dict_validacao.validado_em
                                };
                            }
                        });
                        setDictResults(dictInicial);
                        // Carregar saldo
                        carregarSaldo();
                        if (d.sem_pix > 0) Toast('' + d.sem_pix + ' profissionais sem chave Pix cadastrada', 'warning');
                        /* ACERTO_RESTR_V1: avisa restritos (não podem ser pagos) */
                        if (d.restritos > 0) Toast('' + d.restritos + ' profissional(is) com RESTRIÇÃO — não serão pagos neste acerto', 'error');
                    } else {
                        Toast('' + (d.error || 'Erro ao processar'), 'error');
                        setSt(function(p) { return Object.assign({}, p, { uploading: false }); });
                    }
                } catch (err) {
                    Toast('Erro: ' + err.message, 'error');
                    setSt(function(p) { return Object.assign({}, p, { uploading: false }); });
                }
            };
            reader.readAsDataURL(file);
        };

        // ===== Criar lote de acerto (apenas marca, não paga) =====
        var criarLote = async function() {
            if (qtdSelecionados === 0) {
                Toast('Selecione ao menos um profissional', 'warning');
                return;
            }

            try {
                var r = await fetchAuth(API_URL + '/stark/acerto/criar-lote', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    /* 🆕 PIX_UX_V1: leva a confirmação de titular divergente feita na tela */
                    body: JSON.stringify({ profissionais: selecionados.map(function(p) { return Object.assign({}, p, { confirmado_divergencia: !!divConfirm[p.cod_prof] }); }) })
                });
                var d = await r.json();
                if (d.success) {
                    /* ACERTO_RESTR_V1 / ACERTO_DEDUP_V1: avisa se algum foi removido (restrição ou já pago) */
                    if (d.bloqueados && d.bloqueados.length > 0) {
                        var _dups = d.bloqueados.filter(function(b) { return b.motivo && b.motivo.indexOf('JÁ PAGO') >= 0; });
                        var _outros = d.bloqueados.filter(function(b) { return !(b.motivo && b.motivo.indexOf('JÁ PAGO') >= 0); });
                        if (_dups.length > 0) Toast('' + _dups.length + ' já pago(s) e bloqueado(s) contra duplicidade: ' + _dups.map(function(b) { return '#' + b.cod_prof; }).join(', '), 'error');
                        if (_outros.length > 0) Toast('' + _outros.length + ' removido(s) do lote por restrição: ' + _outros.map(function(b) { return '#' + b.cod_prof; }).join(', '), 'error');
                    }
                    Toast('Lote #' + d.lote_id + ' criado com ' + d.quantidade + ' profissionais. Vá para "Em Aprovação" para executar.', 'success');
                    // Limpar dados e ir para aprovação
                    setSt(function(p) { return Object.assign({}, p, { dados: null, subTab: 'aprovacao' }); });
                    setSel({});
                    carregarLotesAprovacao();
                } else {
                    Toast('' + (d.error || 'Erro'), 'error');
                }
            } catch (err) {
                Toast('' + err.message, 'error');
            }
        };

        // ===== Carregar lotes em aprovação =====
        var carregarLotesAprovacao = async function() {
            setSt(function(p) { return Object.assign({}, p, { lotesAprovacaoLoading: true }); });
            try {
                var r = await fetchAuth(API_URL + '/stark/acerto/em-aprovacao');
                var d = await r.json();
                setSt(function(p) { return Object.assign({}, p, { lotesAprovacao: d.lotes || [], lotesAprovacaoLoading: false }); });
            } catch (e) {
                setSt(function(p) { return Object.assign({}, p, { lotesAprovacaoLoading: false }); });
            }
        };

        // ===== Carregar detalhe do lote =====
        var carregarDetalheLote = async function(loteId) {
            setSt(function(p) { return Object.assign({}, p, { loteDetalheLoading: true }); });
            try {
                var r = await fetchAuth(API_URL + '/stark/acerto/' + loteId);
                var d = await r.json();
                setSt(function(p) { return Object.assign({}, p, { loteDetalhe: d, loteDetalheLoading: false }); });
                // Carregar saldo junto
                carregarSaldo();
            } catch (e) {
                setSt(function(p) { return Object.assign({}, p, { loteDetalheLoading: false }); });
            }
        };

        // ===== Carregar histórico =====
        var carregarHistorico = async function() {
            setSt(function(p) { return Object.assign({}, p, { historicoLoading: true }); });
            try {
                var r = await fetchAuth(API_URL + '/stark/acerto/historico');
                var d = await r.json();
                setSt(function(p) { return Object.assign({}, p, { historico: d.lotes || [], historicoLoading: false }); });
            } catch (e) {
                setSt(function(p) { return Object.assign({}, p, { historicoLoading: false }); });
            }
        };

        // ===== Sincronizar status dos acertos pendentes =====
        var _sincronizando = React.useState(false);
        var sincronizando = _sincronizando[0]; var setSincronizando = _sincronizando[1];

        var sincronizarAcerto = async function() {
            setSincronizando(true);
            try {
                Toast('Sincronizando status com Stark Bank...', 'info');
                var r = await fetchAuth(API_URL + '/stark/sync', { method: 'POST' });
                if (!r.ok) {
                    var err = await r.json().catch(function() { return {}; });
                    Toast('' + (err.error || 'Erro ' + r.status), 'error');
                    setSincronizando(false);
                    return;
                }
                var d = await r.json();
                if (d.atualizados > 0) {
                    Toast('' + d.atualizados + ' pagamento(s) atualizado(s)!', 'success');
                } else {
                    Toast('Nenhuma atualização pendente', 'info');
                }
                // Recarregar detalhe do lote aberto e listas
                if (st.loteDetalhe && st.loteDetalhe.lote) {
                    carregarDetalheLote(st.loteDetalhe.lote.id);
                }
                carregarHistorico();
                carregarLotesAprovacao();
            } catch (e) {
                Toast('Erro: ' + e.message, 'error');
            } finally {
                setSincronizando(false);
            }
        };

        // ===== Validar Pix via DICT (Stark Bank) =====
        var validarPixDict = async function(prof) {
            if (!prof.pix_key) { Toast('Profissional sem chave Pix', 'error'); return; }
            setDictResults(function(prev) {
                var n = Object.assign({}, prev);
                n[prof.cod_prof] = { loading: true, success: null, dict: null, erro: null };
                return n;
            });
            try {
                var r = await fetchAuth(API_URL + '/stark/acerto/validar-pix', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    /* 🆕 PIX_UX_V3: envia o CPF (planilha/sistema) p/ a validacao bater igual ao pagamento */
                    body: JSON.stringify({ pix_key: prof.pix_key, cod_prof: prof.cod_prof, cpf: (prof.cpf_sistema || prof.cpf_planilha || ''), nome: (prof.nome_sistema || prof.nome_planilha || '') /* PIX_NOME_V1 */ })
                });
                var d = await r.json();
                setDictResults(function(prev) {
                    var n = Object.assign({}, prev);
                    n[prof.cod_prof] = { loading: false, success: d.success, dict: d.dict, erro: d.erro || null, divergente: !!d.divergente, titular_nome: (d.dict && d.dict.nome) || null };
                    return n;
                });
                if (d.success && d.divergente) {
                    Toast('#' + prof.cod_prof + ': chave em nome de OUTRO titular — ' + ((d.dict && d.dict.nome) || '') + '. Confirme antes de pagar.', 'warning');
                } else if (d.success) {
                    Toast('#' + prof.cod_prof + ': Pix conferido — ' + ((d.dict && d.dict.nome) || 'OK'), 'success');
                } else {
                    Toast('#' + prof.cod_prof + ': ' + (d.erro || 'Chave não encontrada no DICT'), 'error');
                }
            } catch (e) {
                setDictResults(function(prev) {
                    var n = Object.assign({}, prev);
                    n[prof.cod_prof] = { loading: false, success: false, dict: null, erro: e.message };
                    return n;
                });
                Toast('Erro: ' + e.message, 'error');
            }
        };

        // ===== Solicitar token 2FA =====
        var solicitarToken = async function(loteId) {
            var lote = st.loteDetalhe && st.loteDetalhe.lote;
            var qtd = lote ? lote.quantidade : 0;
            var vlr = lote ? parseFloat(lote.valor_total) : 0;

            setModal2fa(function(p) { return Object.assign({}, p, { enviando: true, erro: '' }); });
            try {
                var r = await fetchAuth(API_URL + '/stark/token/solicitar', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ saque_ids: [], valor_total: vlr, quantidade: qtd })
                });
                var d = await r.json();
                if (d.success) {
                    setModal2fa(function(p) {
                        return Object.assign({}, p, {
                            etapa: 'digitar', chaveToken: d.chave_token,
                            emailMascarado: d.email_mascarado, enviando: false
                        });
                    });
                } else {
                    setModal2fa(function(p) { return Object.assign({}, p, { erro: d.error || 'Erro', enviando: false }); });
                }
            } catch (e) {
                setModal2fa(function(p) { return Object.assign({}, p, { erro: e.message, enviando: false }); });
            }
        };

        // ===== Validar token e executar acerto =====
        var validarEExecutar = async function() {
            if (modal2fa.tokenDigitado.length !== 6) {
                setModal2fa(function(p) { return Object.assign({}, p, { erro: 'Digite o código de 6 dígitos' }); });
                return;
            }
            setModal2fa(function(p) { return Object.assign({}, p, { validando: true, erro: '' }); });
            try {
                // 1. Validar token
                var rv = await fetchAuth(API_URL + '/stark/token/validar', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chave_token: modal2fa.chaveToken, token: modal2fa.tokenDigitado })
                });
                var dv = await rv.json();
                if (!dv.success) {
                    setModal2fa(function(p) { return Object.assign({}, p, { erro: dv.error, validando: false }); });
                    return;
                }

                // 2. Executar acerto
                setModal2fa(function(p) { return Object.assign({}, p, { etapa: 'executando' }); });
                var re = await fetchAuth(API_URL + '/stark/acerto/' + modal2fa.loteId + '/executar', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    /* [ACERTO_CONFIRMA_V1] leva os confirmados de divergencia tambem no executar */
                    body: JSON.stringify({ chave_token: modal2fa.chaveToken, confirmados_divergencia: Object.keys(divConfirm).filter(function(k){ return divConfirm[k]; }) })
                });
                var de = await re.json();

                if (de.success) {
                    setModal2fa({
                        aberto: false, etapa: 'confirmar', chaveToken: null, emailMascarado: '',
                        tokenDigitado: '', enviando: false, validando: false, erro: '', loteId: null
                    });
                    setModalRes({
                        aberto: true, enviados: de.enviados, rejeitados: de.rejeitados,
                        valorEnviado: de.valor_enviado, detalhesRejeitados: de.detalhes_rejeitados || [],
                        saldoAntes: de.saldo_antes
                    });
                    // Recarregar lista de aprovação
                    carregarLotesAprovacao();
                    setSt(function(p) { return Object.assign({}, p, { loteDetalhe: null }); });
                } else {
                    var erroMsg = de.error || 'Erro ao executar';
                    if (de.saldo_disponivel !== undefined) {
                        erroMsg += ' (Saldo: ' + formatarMoeda(de.saldo_disponivel) + ' | Necessário: ' + formatarMoeda(de.valor_lote) + ')';
                    }
                    setModal2fa(function(p) { return Object.assign({}, p, { erro: erroMsg, validando: false, etapa: 'digitar' }); });
                }
            } catch (e) {
                setModal2fa(function(p) { return Object.assign({}, p, { erro: e.message, validando: false, etapa: 'digitar' }); });
            }
        };

        // ===== Badge helper =====
        var badge = function(s) {
            var c = {
/* FIN_CLEAN_V1: pílulas suaves 50/800 */
                processando: 'bg-amber-50 text-amber-800', pago: 'bg-green-50 text-green-800',
                concluido: 'bg-green-50 text-green-800', rejeitado: 'bg-red-50 text-red-800',
                em_lote: 'bg-purple-50 text-purple-800', erro: 'bg-red-50 text-red-800',
                parcial: 'bg-amber-50 text-amber-800', aguardando: 'bg-amber-50 text-amber-800',
                pronto: 'bg-green-50 text-green-800', sem_pix: 'bg-red-50 text-red-800',
                restrito: 'bg-red-50 text-red-800', /* ACERTO_RESTR_V1 */
                ja_pago: 'bg-gray-100 text-gray-700' /* 🆕 ACERTO_DEDUP_V1 */
            };
            var labels = {
                pronto: 'Pronto', sem_pix: 'Sem Pix', aguardando: 'Aguardando',
                processando: 'Processando', pago: 'Pago', concluido: 'Concluído',
                rejeitado: 'Rejeitado', em_lote: 'Lote Gerado', erro: 'Erro',
                parcial: 'Parcial', restrito: 'Restrito', /* ACERTO_RESTR_V1 */
                ja_pago: 'Já pago' /* 🆕 ACERTO_DEDUP_V1 */
            };
            return React.createElement("span", {
                className: "px-2 py-1 rounded-full text-xs font-medium " + (c[s] || 'bg-gray-100 text-gray-600')
            }, labels[s] || s || '—');
        };

        // ===== Init: carregar saldo =====
        React.useEffect(function() {
            carregarSaldo();
        }, []);

        // 🔔 Real-time: escutar pagamentos Stark Bank via WebSocket
        React.useEffect(function() {
            var handler = function(e) {
                var d = e.detail;
                console.log('💰 [Acerto] Atualização em tempo real:', d.stark_status, '#' + d.id);
                // Se tem lote aberto, atualizar itens em memória
                setSt(function(prev) {
                    if (!prev.loteDetalhe || !prev.loteDetalhe.itens) return prev;
                    var novosItens = prev.loteDetalhe.itens.map(function(item) {
                        if (item.stark_transfer_id === d.stark_transfer_id) {
                            return Object.assign({}, item, { status: d.stark_status, erro: d.stark_erro });
                        }
                        return item;
                    });
                    return Object.assign({}, prev, { loteDetalhe: Object.assign({}, prev.loteDetalhe, { itens: novosItens }) });
                });
                // Recarregar dados completos após breve delay
                setTimeout(function() {
                    if (st.loteDetalhe && st.loteDetalhe.lote) {
                        carregarDetalheLote(st.loteDetalhe.lote.id);
                    }
                    carregarLotesAprovacao();
                    carregarHistorico();
                }, 800);
            };
            window.addEventListener('stark-payment-update', handler);
            return function() { window.removeEventListener('stark-payment-update', handler); };
        }, []);

        // ==================== RENDER ====================
        return React.createElement("div", { className: "space-y-6" /* FIN_ABAS_V1: sem padding duplo */ },

            // ===== Header =====
            React.createElement("div", { className: "flex items-center justify-between flex-wrap gap-4" },
                React.createElement("div", null,
                    React.createElement("h2", { className: "text-gray-900 font-bold", style: { fontFamily: "Sora, Inter, sans-serif", fontSize: 24, letterSpacing: "-0.01em", margin: 0 } }, "Acerto profissional") /* FIN_CLEAN_V1 */,
                    React.createElement("p", { className: "text-gray-500 mt-1 text-sm" }, "Upload de planilha de faturamento + pagamento via Stark Bank")
                ),
                // Indicador de saldo Stark Bank
                React.createElement("div", { className: "bg-white rounded-xl px-5 py-3 border border-gray-200 " + (st.saldoStark !== null && st.saldoStark > 0 ? "" : "") },
                    React.createElement("p", { className: "text-xs text-gray-500" }, "Saldo Stark Bank"),
                    React.createElement("p", {
                        className: "text-lg font-bold " + (st.saldoStark !== null && st.saldoStark > 0 ? "text-green-800" : "text-gray-400")
                    }, st.saldoLoading ? "..." : st.saldoStark !== null ? formatarMoeda(st.saldoStark) : "N/D"),
                    React.createElement("button", {
                        onClick: carregarSaldo, className: "text-xs text-purple-700 hover:underline mt-1"
                    }, "↻ Atualizar")
                )
            ),

            // ===== Sub-tabs =====
            React.createElement("div", { className: "flex gap-2 border-b border-gray-200 overflow-x-auto" /* FIN_CLEAN_V1: abas internas */ },
                React.createElement("button", {
                    onClick: function() { setSt(function(p) { return Object.assign({}, p, { subTab: 'novo', loteDetalhe: null }); }); },
                    className: "px-3 py-2.5 -mb-px text-sm border-b-2 inline-flex items-center gap-1.5 whitespace-nowrap " + (st.subTab === 'novo' ? "border-purple-700 text-purple-800 font-semibold" : "border-transparent text-gray-500 hover:text-gray-700")
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-upload" })), "Novo Acerto")),
                React.createElement("button", {
                    onClick: function() { setSt(function(p) { return Object.assign({}, p, { subTab: 'aprovacao', loteDetalhe: null }); }); carregarLotesAprovacao(); carregarSaldo(); },
                    className: "px-3 py-2.5 -mb-px text-sm border-b-2 inline-flex items-center gap-1.5 whitespace-nowrap " + (st.subTab === 'aprovacao' ? "border-purple-700 text-purple-800 font-semibold" : "border-transparent text-gray-500 hover:text-gray-700")
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clock" })), "Em Aprovação")),
                React.createElement("button", {
                    onClick: function() { setSt(function(p) { return Object.assign({}, p, { subTab: 'historico', loteDetalhe: null }); }); carregarHistorico(); },
                    className: "px-3 py-2.5 -mb-px text-sm border-b-2 inline-flex items-center gap-1.5 whitespace-nowrap " + (st.subTab === 'historico' ? "border-purple-700 text-purple-800 font-semibold" : "border-transparent text-gray-500 hover:text-gray-700")
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-filetext" })), "Histórico"))
            ),

            // ================== SUB-TAB: NOVO ACERTO ==================
            st.subTab === 'novo' && React.createElement("div", { className: "space-y-4" },

                // Upload (se não tem dados carregados)
                !st.dados && React.createElement("div", { className: "bg-white rounded-xl p-8 text-center space-y-4 border border-gray-200" },
                    React.createElement("div", { className: "w-20 h-20 bg-gray-50 text-gray-500 rounded-full flex items-center justify-center mx-auto" },
                        React.createElement("svg", { className: "ico", style: { width: 38, height: 38 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-upload" }))
                    ),
                    React.createElement("h3", { className: "text-lg font-bold text-gray-800" }, "Upload da Planilha de Faturamento"),
                    React.createElement("p", { className: "text-gray-500 text-sm" }, "Envie o arquivo .xlsx com os dados dos profissionais para processar o acerto"),
                    React.createElement("label", {
                        className: "inline-block px-6 py-3 bg-purple-700 text-white rounded-xl font-bold cursor-pointer hover:bg-purple-800 transition-colors"
                    },
                        st.uploading ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clock" })), "Processando...") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-link" })), "Selecionar Planilha (.xlsx)"),
                        React.createElement("input", { type: "file", accept: ".xlsx,.xls", onChange: handleUpload, className: "hidden", disabled: st.uploading })
                    ),
                    React.createElement("p", { className: "text-xs text-gray-400" }, "Coluna F = Código/Nome do profissional | Coluna Q = Saldo a pagar | Coluna M = Pix (fallback)")
                ),

                // Preview (quando tem dados)
                st.dados && React.createElement("div", { className: "space-y-4" },

                    // Cards resumo
                    React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-9 gap-3" }, /* PIX_UX_V2 +1 card (Reverificar) · ACERTO_DEDUP_V1 +1 (Já pago) */
                        React.createElement("div", { className: "bg-white rounded-xl p-4 text-center border border-gray-200" },
                            React.createElement("p", { className: "text-2xl font-bold text-green-800" }, st.dados.pix_mapp || 0),
                            React.createElement("p", { className: "text-xs text-gray-500" }, "Pix Mapp")
                        ),
                        (st.dados.restritos || 0) > 0 && React.createElement("div", { className: "bg-white rounded-xl p-4 text-center border border-gray-200" },
                            React.createElement("p", { className: "text-2xl font-bold text-red-800" }, st.dados.restritos || 0),
                            React.createElement("p", { className: "text-xs text-gray-500" }, "Restritos")
                        ),
                        /* 🆕 ACERTO_DEDUP_V1: KPI de já pagos (bloqueados contra duplicidade) */
                        (st.dados.ja_pagos || 0) > 0 && React.createElement("div", { className: "bg-white rounded-xl p-4 text-center border border-gray-200" },
                            React.createElement("p", { className: "text-2xl font-bold text-gray-700" }, st.dados.ja_pagos || 0),
                            React.createElement("p", { className: "text-xs text-gray-500" }, "Já pagos")
                        ),
                        React.createElement("div", { className: "bg-white rounded-xl p-4 text-center border border-gray-200" },
                            React.createElement("p", { className: "text-2xl font-bold text-blue-800" }, st.dados.pix_sistema || 0),
                            React.createElement("p", { className: "text-xs text-gray-500" }, "Pix Sistema")
                        ),
                        React.createElement("div", { className: "bg-white rounded-xl p-4 text-center border border-gray-200" },
                            React.createElement("p", { className: "text-2xl font-bold text-red-800" }, st.dados.sem_pix || 0),
                            React.createElement("p", { className: "text-xs text-gray-500" }, "Sem Pix")
                        ),
                        /* 🆕 PIX_UX_V2: KPI dos que precisam reverificar/confirmar */
                        React.createElement("div", { className: "bg-white rounded-xl p-4 text-center border border-gray-200 " + (pendentesVerif.length > 0 ? "cursor-pointer hover:bg-amber-50" : ""), onClick: function() { if (pendentesVerif.length) irParaLinha(pendentesVerif[0].cod_prof); }, title: pendentesVerif.length ? "Clique para ir ao primeiro que precisa de atenção" : "Nada pendente" },
                            React.createElement("p", { className: "text-2xl font-bold text-amber-800" }, pendentesVerif.length),
                            React.createElement("p", { className: "text-xs text-gray-500" }, "Reverificar")
                        ),
                        React.createElement("div", { className: "bg-white rounded-xl p-4 text-center border border-gray-200" },
                            React.createElement("p", { className: "text-2xl font-bold text-gray-900" }, st.dados.total || 0),
                            React.createElement("p", { className: "text-xs text-gray-500" }, "Total")
                        ),
                        React.createElement("div", { className: "bg-white rounded-xl p-4 text-center border border-gray-200" },
                            React.createElement("p", { className: "text-2xl font-bold text-purple-800" }, qtdSelecionados),
                            React.createElement("p", { className: "text-xs text-gray-500" }, "Selecionados")
                        ),
                        React.createElement("div", { className: "bg-white rounded-xl p-4 text-center border border-gray-200" },
                            React.createElement("p", { className: "text-xl font-bold text-amber-800" }, formatarMoeda(valorSelecionado)),
                            React.createElement("p", { className: "text-xs text-gray-500" }, "Valor selecionado")
                        )
                    ),

                    /* 🆕 PIX_UX_V2: LEGENDA (gabarito) dos estados */
                    React.createElement("div", { className: "bg-white rounded-xl p-3 flex flex-wrap items-center gap-x-6 gap-y-2 border border-gray-200" },
                        React.createElement("span", { className: "font-bold text-gray-400 uppercase tracking-wide text-[10px]" }, "Legenda"),
                        React.createElement("span", { className: "inline-flex items-center gap-2 text-xs text-gray-600" },
                            React.createElement("span", { className: "w-2.5 h-2.5 rounded-full bg-green-600 inline-block" }),
                            React.createElement("b", { className: "text-green-800" }, "Conferido"), "— chave ok, pode pagar."),
                        React.createElement("span", { className: "inline-flex items-center gap-2 text-xs text-gray-600" },
                            React.createElement("span", { className: "w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" }),
                            React.createElement("b", { className: "text-red-800" }, "Titular diferente"), "— chave no nome de outra pessoa; marque “Confirmo pagar” se for pagar mesmo assim."),
                        React.createElement("span", { className: "inline-flex items-center gap-2 text-xs text-gray-600" },
                            React.createElement("span", { className: "w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" }),
                            React.createElement("b", { className: "text-amber-800" }, "Rever Pix"), "— deu erro; clique em Reverificar (veja o motivo no tooltip)."),
                        React.createElement("span", { className: "inline-flex items-center gap-2 text-xs text-gray-600" },
                            React.createElement("span", { className: "w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" }),
                            React.createElement("b", { className: "text-blue-800" }, "Validar"), "— ainda não conferido; clique em Validar."),
                        /* 🆕 ACERTO_DEDUP_V1 */
                        React.createElement("span", { className: "inline-flex items-center gap-2 text-xs text-gray-600" },
                            React.createElement("span", { className: "w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" }),
                            React.createElement("b", { className: "text-gray-700" }, "Já pago"), "— já recebeu este valor; fica bloqueado (intocável) contra duplicidade.")
                    ),

                    /* 🆕 PIX_UX_V2: MENU LATERAL flutuante — quem precisa de atenção (clique rola até a linha) */
                    pendentesVerif.length > 0 && React.createElement("div", {
                        className: "fixed z-40 bg-white rounded-xl border border-amber-200 hidden lg:block",
                        style: { right: 16, top: 150, width: 236, maxHeight: "62vh", overflowY: "auto" }
                    },
                        React.createElement("div", { className: "px-3 py-2 bg-amber-500 text-white rounded-t-xl font-bold text-xs flex items-center justify-between sticky top-0" },
                            React.createElement("span", null, "Precisam de atenção"),
                            React.createElement("span", { className: "bg-white text-amber-600 rounded-full px-2 py-0.5 text-[11px]" }, pendentesVerif.length)
                        ),
                        React.createElement("div", { className: "p-2 flex flex-col gap-1" },
                            pendentesVerif.map(function(p) {
                                var drp = dictResults[p.cod_prof];
                                var ehDiv = drp && drp.success === true && drp.divergente;
                                return React.createElement("button", {
                                    key: "pv-" + p.cod_prof,
                                    onClick: function() { irParaLinha(p.cod_prof); },
                                    className: "text-left px-2 py-1.5 rounded-lg hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-colors"
                                },
                                    React.createElement("div", { className: "text-xs font-semibold text-gray-800 truncate" }, (p.nome_sistema || p.nome_planilha || ('#' + p.cod_prof))),
                                    React.createElement("div", { className: "text-[10px] font-medium " + (ehDiv ? "text-red-800" : "text-amber-600") }, "#" + p.cod_prof + " · " + (ehDiv ? "Titular diferente" : "Rever Pix"))
                                );
                            })
                        )
                    ),

                    // Barra de saldo vs valor selecionado
                    st.saldoStark !== null && valorSelecionado > 0 && React.createElement("div", {
                        className: "rounded-xl p-4 " + (st.saldoStark >= valorSelecionado ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200")
                    },
                        React.createElement("div", { className: "flex justify-between items-center" },
                            React.createElement("div", null,
                                React.createElement("span", { className: "text-sm text-gray-600" }, "Saldo Stark: "),
                                React.createElement("span", { className: "font-bold " + (st.saldoStark >= valorSelecionado ? "text-green-800" : "text-red-800") }, formatarMoeda(st.saldoStark))
                            ),
                            React.createElement("div", null,
                                React.createElement("span", { className: "text-sm text-gray-600" }, "Valor selecionado: "),
                                React.createElement("span", { className: "font-bold text-gray-800" }, formatarMoeda(valorSelecionado))
                            ),
                            st.saldoStark >= valorSelecionado
                                ? React.createElement("span", { className: "text-green-800 font-bold text-sm" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), "Saldo suficiente"))
                                : React.createElement("span", { className: "text-red-600 font-bold text-sm" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })), "Saldo insuficiente (faltam " + formatarMoeda(valorSelecionado - st.saldoStark) + ")")
                        )
                    ),

                    // Tabela com checkboxes
                    React.createElement("div", { className: "bg-white rounded-xl overflow-x-auto border border-gray-200" },
                        React.createElement("table", { className: "w-full text-sm" },
                            React.createElement("thead", null,
                                React.createElement("tr", { className: "bg-gray-50 border-b" },
                                    React.createElement("th", { className: "px-3 py-3 text-center w-10" },
                                        React.createElement("input", {
                                            type: "checkbox",
                                            checked: todosEstaoSelecionados,
                                            onChange: toggleTodos,
                                            className: "w-4 h-4 accent-purple-700 cursor-pointer",
                                            title: "Selecionar todos"
                                        })
                                    ),
                                    React.createElement("th", { className: "px-3 py-3 text-left" }, "Código"),
                                    React.createElement("th", { className: "px-3 py-3 text-left" }, "Nome (Mapp)"),
                                    React.createElement("th", { className: "px-3 py-3 text-left" }, "Nome (Sistema)"),
                                    React.createElement("th", { className: "px-3 py-3 text-left" }, "Chave Pix"),
                                    React.createElement("th", { className: "px-3 py-3 text-center" }, "Origem"),
                                    React.createElement("th", { className: "px-3 py-3 text-center" }, "DICT"),
                                    React.createElement("th", { className: "px-3 py-3 text-right" }, "Valor"),
                                    React.createElement("th", { className: "px-3 py-3 text-center" }, "Status")
                                )
                            ),
                            React.createElement("tbody", null,
                                /* 🆕 ACERTO_DEDUP_V1: agrupa (precisa de ação no topo, JÁ PAGO no fundo) e, dentro do grupo, por valor desc */
                                todosProfs.slice().sort(function(a, b) {
                                    var ra = rankLinha(a), rb = rankLinha(b);
                                    if (ra !== rb) return ra - rb;
                                    return b.saldo - a.saldo;
                                }).map(function(prof, i) {
                                    var ehSemPix = prof.status === 'sem_pix';
                                    /* ACERTO_RESTR_V1: restrito nao pode ser selecionado/pago */
                                    var ehRestrito = prof.status === 'restrito' || prof.is_restricted;
                                    /* 🆕 ACERTO_DEDUP_V1: já pago -> intocável */
                                    var ehJaPago = isJaPago(prof);
                                    /* 🆕 PIX_UX_V1: titular divergente precisa de confirmacao do ADM */
                                    var _dr = dictResults[prof.cod_prof];
                                    var ehDivergente = !!(_dr && _dr.success && _dr.divergente);
                                    var divConfirmado = !!divConfirm[prof.cod_prof];
                                    var divBloqueado = ehDivergente && !divConfirmado;
                                    var bloqueado = ehSemPix || ehRestrito || divBloqueado || ehJaPago;
                                    var origemBadge = prof.pix_origem === 'mapp'
                                        ? React.createElement("span", { className: "px-2 py-1 rounded-full text-xs font-medium " + (prof.pix_formato_valido ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800") }, prof.pix_formato_valido ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), "Mapp") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#d97706" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-alert" })), "Mapp"))
                                        : prof.pix_origem === 'sistema'
                                            ? React.createElement("span", { className: "px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-800" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-refresh" })), "Sistema"))
                                            : React.createElement("span", { className: "px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-800" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })), "Nenhuma"));

                                    return React.createElement("tr", {
                                        key: prof.cod_prof + '-' + i,
                                        id: "acerto-row-" + prof.cod_prof, /* 🆕 PIX_UX_V2: ancora p/ menu lateral */
                                        className: "border-b hover:bg-gray-50 " + (ehJaPago ? 'bg-slate-100 opacity-60' : ehRestrito ? 'bg-rose-50 opacity-70' : ehSemPix ? 'bg-red-50 opacity-60' : divBloqueado ? 'bg-amber-50' : sel[prof.cod_prof] ? 'bg-purple-50' : '')
                                    },
                                        React.createElement("td", { className: "px-3 py-2.5 text-center" },
                                            ehJaPago
                                                ? React.createElement("span", { title: "Já pago — bloqueado contra duplicidade", className: "inline-flex" }, React.createElement("svg", { className: "ico", style: { width: 15, height: 15, color: "#6b7280" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-lock" })))
                                                : React.createElement("input", {
                                                type: "checkbox",
                                                checked: !bloqueado && !!sel[prof.cod_prof],
                                                onChange: function() { if (!bloqueado) toggleSel(prof.cod_prof); },
                                                disabled: bloqueado,
                                                className: "w-4 h-4 accent-purple-700 " + (bloqueado ? "cursor-not-allowed" : "cursor-pointer"),
                                                title: ehRestrito ? ("Motoboy com RESTRIÇÃO — não pode ser pago" + (prof.restricao_motivo ? ": " + prof.restricao_motivo : "")) : ehSemPix ? "Sem chave Pix — não pode ser selecionado" : divBloqueado ? "Titular diferente — confirme na coluna DICT antes de pagar" : "Selecionar"
                                            })
                                        ),
                                        React.createElement("td", { className: "px-3 py-2.5 font-mono text-gray-700" }, "#" + prof.cod_prof),
                                        React.createElement("td", { className: "px-3 py-2.5" },
                                            prof.nome_planilha,
                                            /* ACERTO_RESTR_V1: etiqueta de restricao */
                                            ehRestrito && React.createElement("span", {
                                                className: "ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-800 align-middle",
                                                title: prof.restricao_motivo || "Restrição ativa"
                                            }, React.createElement("svg", { className: "ico", style: { width: 12, height: 12 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-lock" })), "RESTRITO"),
                                            /* 🆕 ACERTO_DEDUP_V1: etiqueta de já pago */
                                            /* ACERTO_DEDUP_V2: 'processando' = transferência enviada à Stark, ainda sem confirmação */
                                            ehJaPago && (function() {
                                                var _env = !!(prof.pago_info && prof.pago_info.item_status === 'processando');
                                                return React.createElement("span", {
                                                    className: "ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold align-middle " + (_env ? "bg-amber-50 text-amber-800" : "bg-gray-100 text-gray-700"),
                                                    title: (_env ? "Enviado à Stark, aguardando confirmação" : "Já pago") + (prof.pago_info && prof.pago_info.pago_em ? " em " + new Date(prof.pago_info.pago_em).toLocaleString('pt-BR') : "") + (prof.pago_info && prof.pago_info.lote_id ? " · lote #" + prof.pago_info.lote_id : "") + (prof.pago_info && prof.pago_info.transfer_id ? " · transf. " + prof.pago_info.transfer_id : "") + " — bloqueado contra duplicidade"
                                                }, React.createElement("svg", { className: "ico", style: { width: 12, height: 12 }, "aria-hidden": "true" }, React.createElement("use", { href: _env ? "#i-clock" : "#i-check" })), _env ? "ENVIADO" : "JÁ PAGO");
                                            })()
                                        ),
                                        React.createElement("td", { className: "px-3 py-2.5 " + (prof.nome_sistema ? "text-green-800" : "text-gray-400") }, prof.nome_sistema || '—'),
                                        React.createElement("td", { className: "px-3 py-2.5 text-xs text-gray-600 max-w-[160px] truncate" }, prof.pix_key || '—'),
                                        React.createElement("td", { className: "px-3 py-2.5 text-center" }, origemBadge),
                                        React.createElement("td", { className: "px-3 py-2.5 text-center" },
                                            prof.pix_key ? (function() {
                                                var dr = dictResults[prof.cod_prof];
                                                if (dr && dr.loading) return React.createElement("svg", { className: "ico", style: { width: 14, height: 14 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clock" }));
                                                /* 🆕 PIX_UX_V1: titular diferente — mostra o nome e exige confirmacao */
                                                if (dr && dr.success === true && dr.divergente) {
                                                    var titDiv = dr.titular_nome ? dr.titular_nome.split(' ').slice(0, 2).join(' ') : '?';
                                                    return React.createElement("div", { className: "flex flex-col items-center gap-1" },
                                                        React.createElement("span", { className: "inline-flex items-center gap-1 text-[11px] font-bold text-red-800", title: "Chave Pix está no nome de: " + (dr.titular_nome || '?') + " (CPF diferente do cadastro)" },
                                                            React.createElement("svg", { className: "ico", style: { width: 13, height: 13 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-alert" })), "Titular: " + titDiv),
                                                        React.createElement("label", { className: "inline-flex items-center gap-1 text-[10px] font-semibold text-red-800 cursor-pointer" },
                                                            React.createElement("input", { type: "checkbox", checked: !!divConfirm[prof.cod_prof], onChange: function() { setDivConfirm(function(prev) { var n = Object.assign({}, prev); if (n[prof.cod_prof]) { delete n[prof.cod_prof]; } else { n[prof.cod_prof] = true; } return n; }); }, className: "w-3 h-3 accent-rose-600" }),
                                                            "Confirmo pagar")
                                                    );
                                                }
                                                if (dr && dr.success === true) return React.createElement("span", { className: "inline-flex items-center gap-1 text-xs text-green-800 font-semibold cursor-help", title: "Conferido no banco — titular: " + (dr.dict && dr.dict.nome ? dr.dict.nome : 'OK') }, React.createElement("svg", { className: "ico", style: { width: 15, height: 15, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), "" + (dr.dict && dr.dict.nome ? dr.dict.nome.split(' ').slice(0, 2).join(' ') : 'OK'));
                                                if (dr && dr.success === false) return React.createElement("span", { className: "inline-flex items-center gap-1 text-xs text-red-600 font-medium cursor-pointer", title: (dr.erro || 'Chave inválida') + ' — clique para tentar de novo', onClick: function() { validarPixDict(prof); } }, React.createElement("svg", { className: "ico", style: { width: 15, height: 15 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })), "Reverificar");
                                                return React.createElement("button", { onClick: function() { validarPixDict(prof); }, className: "text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium transition-colors" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-search" })), "Validar"));
                                            })() : React.createElement("span", { className: "text-xs text-gray-300" }, "—")
                                        ),
                                        React.createElement("td", { className: "px-3 py-2.5 text-right font-bold text-green-800" }, formatarMoeda(prof.saldo)),
                                        /* 🆕 PIX_UX_V1: status reflete a conferencia do DICT (nao mostra "Pronto" quando falhou/diverge) */
                                        React.createElement("td", { className: "px-3 py-2.5 text-center" }, (function() {
                                            /* 🆕 ACERTO_DEDUP_V1: já pago tem prioridade visual */
                                            if (ehJaPago) {
                                                var _envSt = !!(prof.pago_info && prof.pago_info.item_status === 'processando'); /* ACERTO_DEDUP_V2 */
                                                return React.createElement("span", {
                                                    className: "px-2 py-1 rounded-full text-xs font-semibold cursor-help " + (_envSt ? "bg-amber-50 text-amber-800" : "bg-gray-100 text-gray-700"),
                                                    title: (_envSt ? "Enviado à Stark, aguardando confirmação" : "Já pago") + (prof.pago_info && prof.pago_info.pago_em ? " em " + new Date(prof.pago_info.pago_em).toLocaleString('pt-BR') : "") + (prof.pago_info && prof.pago_info.lote_id ? " · lote #" + prof.pago_info.lote_id : "") + (prof.pago_info && prof.pago_info.transfer_id ? " · transf. " + prof.pago_info.transfer_id : "")
                                                }, _envSt ? "Enviado · aguardando Stark" : "Já pago");
                                            }
                                            if (ehRestrito || ehSemPix) return badge(prof.status);
                                            if (divBloqueado) return React.createElement("span", { className: "px-2 py-1 rounded-full text-xs font-bold bg-red-50 text-red-800" }, "Titular diferente");
                                            if (ehDivergente && divConfirmado) return React.createElement("span", { className: "px-2 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800" }, "Confirmado (outro)");
                                            if (_dr && _dr.success === true) return React.createElement("span", { className: "px-2 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-800" }, "Conferido");
                                            if (_dr && _dr.success === false) return React.createElement("span", { className: "px-2 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800" }, "Rever Pix");
                                            return badge(prof.status);
                                        })())
                                    );
                                })
                            )
                        )
                    ),

                    // Botões de ação
                    React.createElement("div", { className: "flex gap-3 justify-between items-center flex-wrap" },
                        React.createElement("button", {
                            onClick: function() { setSt(function(p) { return Object.assign({}, p, { dados: null }); }); setSel({}); },
                            className: "px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
                        }, "← Nova planilha"),
                        React.createElement("div", { className: "flex items-center gap-3" },
                            React.createElement("span", { className: "text-sm text-gray-500" },
                                qtdSelecionados + " selecionados • " + formatarMoeda(valorSelecionado)
                            ),
                            React.createElement("button", {
                                onClick: criarLote,
                                disabled: qtdSelecionados === 0,
                                className: "px-6 py-3 bg-purple-700 text-white rounded-xl font-bold hover:bg-purple-800 disabled:opacity-50 transition-colors"
                            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-building" })), "Gerar Lote de Acerto (" + qtdSelecionados + ")")
                        )
                    )
                )
            ),

            // ================== SUB-TAB: EM APROVAÇÃO ==================
            st.subTab === 'aprovacao' && React.createElement("div", { className: "space-y-4" },

                // Se tem detalhe aberto
                st.loteDetalhe && React.createElement("div", { className: "space-y-4" },
                    React.createElement("button", {
                        onClick: function() { setSt(function(p) { return Object.assign({}, p, { loteDetalhe: null }); }); },
                        className: "text-sm text-gray-500 hover:text-gray-700 mb-2"
                    }, "← Voltar para lista"),

                    // Info do lote
                    React.createElement("div", { className: "bg-white rounded-xl p-6 border border-gray-200" },
                        React.createElement("div", { className: "flex items-center justify-between flex-wrap gap-4" },
                            React.createElement("div", null,
                                React.createElement("h3", { className: "text-lg font-bold text-gray-800" }, "Lote #" + st.loteDetalhe.lote.id),
                                React.createElement("p", { className: "text-gray-500 text-sm" },
                                    st.loteDetalhe.lote.quantidade + " profissionais • " + formatarMoeda(st.loteDetalhe.lote.valor_total) +
                                    " • Criado por " + (st.loteDetalhe.lote.executado_por_nome || '—')
                                ),
                                React.createElement("p", { className: "text-xs text-gray-400 mt-1" },
                                    st.loteDetalhe.lote.created_at ? new Date(st.loteDetalhe.lote.created_at).toLocaleString('pt-BR') : ''
                                )
                            ),
                            // Comparação saldo vs valor
                            React.createElement("div", { className: "text-right" },
                                st.saldoStark !== null && React.createElement("div", null,
                                    React.createElement("p", { className: "text-xs text-gray-500" }, "Saldo Stark Bank"),
                                    React.createElement("p", {
                                        className: "text-lg font-bold " + (st.saldoStark >= parseFloat(st.loteDetalhe.lote.valor_total) ? "text-green-800" : "text-red-600")
                                    }, formatarMoeda(st.saldoStark)),
                                    st.saldoStark >= parseFloat(st.loteDetalhe.lote.valor_total)
                                        ? React.createElement("p", { className: "text-xs text-green-800" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), "Suficiente"))
                                        : React.createElement("p", { className: "text-xs text-red-600" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })), "Insuficiente"))
                                )
                            )
                        )
                    ),

                    // Tabela de itens do lote
                    React.createElement("div", { className: "bg-white rounded-xl overflow-x-auto border border-gray-200" },
                        React.createElement("table", { className: "w-full text-sm" },
                            React.createElement("thead", null,
                                React.createElement("tr", { className: "bg-gray-50 border-b" },
                                    React.createElement("th", { className: "px-4 py-3 text-left" }, "Código"),
                                    React.createElement("th", { className: "px-4 py-3 text-left" }, "Nome"),
                                    React.createElement("th", { className: "px-4 py-3 text-left" }, "Chave Pix"),
                                    React.createElement("th", { className: "px-4 py-3 text-left" }, "CPF"),
                                    React.createElement("th", { className: "px-4 py-3 text-right" }, "Valor"),
                                    React.createElement("th", { className: "px-4 py-3 text-center" }, "Status")
                                )
                            ),
                            React.createElement("tbody", null,
                                (st.loteDetalhe.itens || []).map(function(item) {
                                    return React.createElement("tr", { key: item.id, className: "border-b hover:bg-gray-50" },
                                        React.createElement("td", { className: "px-4 py-2.5 font-mono text-gray-700" }, "#" + item.cod_prof),
                                        React.createElement("td", { className: "px-4 py-2.5" }, item.nome_prof),
                                        React.createElement("td", { className: "px-4 py-2.5 text-xs text-gray-600 max-w-[160px] truncate" }, item.pix_key || '—'),
                                        React.createElement("td", { className: "px-4 py-2.5 text-xs text-gray-600" }, item.cpf || '—'),
                                        React.createElement("td", { className: "px-4 py-2.5 text-right font-bold text-green-800" }, formatarMoeda(item.valor)),
                                        React.createElement("td", { className: "px-4 py-2.5 text-center" }, badge(item.status))
                                    );
                                })
                            )
                        )
                    ),

                    // Botão executar pagamento
                    st.loteDetalhe.lote.status === 'aguardando' && React.createElement("div", { className: "flex justify-end" },
                        React.createElement("button", {
                            onClick: function() {
                                setModal2fa({
                                    aberto: true, etapa: 'confirmar', chaveToken: null, emailMascarado: '',
                                    tokenDigitado: '', enviando: false, validando: false, erro: '',
                                    loteId: st.loteDetalhe.lote.id
                                });
                            },
                            disabled: st.saldoStark !== null && st.saldoStark < parseFloat(st.loteDetalhe.lote.valor_total),
                            className: "px-8 py-4 bg-purple-700 text-white rounded-xl font-bold hover:bg-purple-800 text-lg disabled:opacity-50 transition-colors"
                        }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-lock" })), "Executar Pagamento (" + formatarMoeda(st.loteDetalhe.lote.valor_total) + ")")
                    )
                ),

                // Lista de lotes em aprovação (quando não tem detalhe aberto)
                !st.loteDetalhe && React.createElement("div", null,
                    st.lotesAprovacaoLoading
                        ? React.createElement("div", { className: "text-center py-10 text-gray-400" }, "Carregando...")
                        : st.lotesAprovacao.length === 0
                            ? React.createElement("div", { className: "bg-white rounded-xl p-10 text-center border border-gray-200" },
                                React.createElement("svg", { className: "ico", style: { width: 48, height: 48 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-mail" })),
                                React.createElement("p", { className: "text-gray-400 text-lg" }, "Nenhum lote aguardando aprovação"),
                                React.createElement("p", { className: "text-gray-400 text-sm mt-2" }, "Faça upload de uma planilha na aba \"Novo Acerto\" para começar")
                            )
                            : React.createElement("div", { className: "space-y-3" },
                                st.lotesAprovacao.map(function(lote) {
                                    return React.createElement("div", {
                                        key: lote.id,
                                        className: "bg-white rounded-xl p-5 cursor-pointer border border-gray-200 hover:bg-gray-50",
                                        onClick: function() { carregarDetalheLote(lote.id); }
                                    },
                                        React.createElement("div", { className: "flex items-center justify-between" },
                                            React.createElement("div", null,
                                                React.createElement("h4", { className: "font-bold text-gray-800 text-lg" }, "Lote #" + lote.id),
                                                React.createElement("p", { className: "text-sm text-gray-500" },
                                                    lote.quantidade + " profissionais • " + formatarMoeda(lote.valor_total)
                                                ),
                                                React.createElement("p", { className: "text-xs text-gray-400 mt-1" },
                                                    "Criado por " + (lote.executado_por_nome || '—') + " em " +
                                                    (lote.created_at ? new Date(lote.created_at).toLocaleString('pt-BR') : '—')
                                                )
                                            ),
                                            React.createElement("div", { className: "flex items-center gap-3" },
                                                badge('aguardando'),
                                                React.createElement("span", { className: "text-gray-400 text-xl" }, "→")
                                            )
                                        )
                                    );
                                })
                            )
                )
            ),

            // ================== SUB-TAB: HISTÓRICO ==================
            st.subTab === 'historico' && React.createElement("div", { className: "space-y-4" },

                // Detalhe do lote (histórico)
                st.loteDetalhe && React.createElement("div", { className: "space-y-4" },
                    React.createElement("button", {
                        onClick: function() { setSt(function(p) { return Object.assign({}, p, { loteDetalhe: null }); }); },
                        className: "text-sm text-gray-500 hover:text-gray-700"
                    }, "← Voltar"),

                    React.createElement("div", { className: "bg-white rounded-xl p-6 border border-gray-200" },
                        React.createElement("div", { className: "flex items-center justify-between flex-wrap gap-4" },
                            React.createElement("div", null,
                                React.createElement("h3", { className: "text-lg font-bold text-gray-800" }, "Lote #" + st.loteDetalhe.lote.id, " ", badge(st.loteDetalhe.lote.status)),
                                React.createElement("p", { className: "text-gray-500 text-sm mt-1" },
                                    st.loteDetalhe.lote.quantidade + " profissionais • " + formatarMoeda(st.loteDetalhe.lote.valor_total) +
                                    " • " + (st.loteDetalhe.lote.executado_por_nome || '—')
                                ),
                                React.createElement("p", { className: "text-xs text-gray-400 mt-1" },
                                    "Criado: " + (st.loteDetalhe.lote.created_at ? new Date(st.loteDetalhe.lote.created_at).toLocaleString('pt-BR') : '—') +
                                    (st.loteDetalhe.lote.finalizado_em ? " | Finalizado: " + new Date(st.loteDetalhe.lote.finalizado_em).toLocaleString('pt-BR') : '')
                                )
                            ),
                            React.createElement("div", { className: "flex items-center gap-3" },
                                // Botão Sincronizar (só aparece se tem itens processando)
                                (st.loteDetalhe.itens || []).some(function(i) { return i.status === 'processando'; }) &&
                                    React.createElement("button", {
                                        onClick: sincronizarAcerto,
                                        disabled: sincronizando,
                                        className: "px-3 py-2 bg-blue-50 text-blue-800 rounded-lg hover:bg-blue-100 text-xs font-medium disabled:opacity-50"
                                    }, sincronizando ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clock" })), "Sincronizando...") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-refresh" })), "Sincronizar")),
                                st.loteDetalhe.lote.saldo_antes && React.createElement("div", { className: "text-right text-sm" },
                                    React.createElement("p", { className: "text-gray-400" }, "Saldo antes: " + formatarMoeda(st.loteDetalhe.lote.saldo_antes))
                                )
                            )
                        )
                    ),

                    React.createElement("div", { className: "bg-white rounded-xl overflow-x-auto border border-gray-200" },
                        React.createElement("table", { className: "w-full text-sm" },
                            React.createElement("thead", null,
                                React.createElement("tr", { className: "bg-gray-50 border-b" },
                                    React.createElement("th", { className: "px-4 py-3 text-left" }, "Código"),
                                    React.createElement("th", { className: "px-4 py-3 text-left" }, "Nome"),
                                    React.createElement("th", { className: "px-4 py-3 text-left" }, "Chave Pix"),
                                    React.createElement("th", { className: "px-4 py-3 text-right" }, "Valor"),
                                    React.createElement("th", { className: "px-4 py-3 text-center" }, "Status"),
                                    React.createElement("th", { className: "px-4 py-3 text-left" }, "Erro")
                                )
                            ),
                            React.createElement("tbody", null,
                                (st.loteDetalhe.itens || []).map(function(item) {
                                    return React.createElement("tr", {
                                        key: item.id,
                                        className: "border-b hover:bg-gray-50 " + (item.status === 'rejeitado' || item.status === 'erro' ? 'bg-red-50' : item.status === 'pago' ? 'bg-green-50' : '')
                                    },
                                        React.createElement("td", { className: "px-4 py-2.5 font-mono text-gray-700" }, "#" + item.cod_prof),
                                        React.createElement("td", { className: "px-4 py-2.5" }, item.nome_prof),
                                        React.createElement("td", { className: "px-4 py-2.5 text-xs text-gray-600 max-w-[140px] truncate" }, item.pix_key || '—'),
                                        React.createElement("td", { className: "px-4 py-2.5 text-right font-bold text-green-800" }, formatarMoeda(item.valor)),
                                        React.createElement("td", { className: "px-4 py-2.5 text-center" }, badge(item.status)),
                                        React.createElement("td", { className: "px-4 py-2.5 text-xs text-red-500 max-w-[250px]", title: item.erro || '' }, window.traduzirErroStarkFE(item.erro) || '—')
                                    );
                                })
                            )
                        )
                    )
                ),

                // Lista do histórico
                !st.loteDetalhe && React.createElement("div", null,
                    st.historicoLoading
                        ? React.createElement("div", { className: "text-center py-10 text-gray-400" }, "Carregando...")
                        : st.historico.length === 0
                            ? React.createElement("div", { className: "text-center py-10 bg-white rounded-xl border border-gray-200" },
                                React.createElement("p", { className: "text-gray-400" }, "Nenhum acerto realizado")
                            )
                            : React.createElement("div", { className: "bg-white rounded-xl overflow-x-auto border border-gray-200" },
                                React.createElement("table", { className: "w-full text-sm" },
                                    React.createElement("thead", null,
                                        React.createElement("tr", { className: "bg-gray-50 border-b" },
                                            React.createElement("th", { className: "px-4 py-3 text-left" }, "Lote"),
                                            React.createElement("th", { className: "px-4 py-3 text-center" }, "Qtd"),
                                            React.createElement("th", { className: "px-4 py-3 text-right" }, "Valor"),
                                            React.createElement("th", { className: "px-4 py-3 text-center" }, "Status"),
                                            React.createElement("th", { className: "px-4 py-3 text-center" }, "Pagos"),
                                            React.createElement("th", { className: "px-4 py-3 text-center" }, "Rejeitados"),
                                            React.createElement("th", { className: "px-4 py-3 text-left" }, "Executado por"),
                                            React.createElement("th", { className: "px-4 py-3 text-left" }, "Data")
                                        )
                                    ),
                                    React.createElement("tbody", null,
                                        st.historico.map(function(l) {
                                            return React.createElement("tr", {
                                                key: l.id,
                                                className: "border-b hover:bg-gray-50 cursor-pointer",
                                                onClick: function() { carregarDetalheLote(l.id); }
                                            },
                                                React.createElement("td", { className: "px-4 py-3 font-bold" }, "#" + l.id),
                                                React.createElement("td", { className: "px-4 py-3 text-center" }, l.quantidade),
                                                React.createElement("td", { className: "px-4 py-3 text-right font-medium" }, formatarMoeda(l.valor_total)),
                                                React.createElement("td", { className: "px-4 py-3 text-center" }, badge(l.status)),
                                                React.createElement("td", { className: "px-4 py-3 text-center text-green-800" }, l.itens_pagos || 0),
                                                React.createElement("td", { className: "px-4 py-3 text-center text-red-600" }, l.itens_rejeitados || 0),
                                                React.createElement("td", { className: "px-4 py-3 text-gray-600" }, l.executado_por_nome || '—'),
                                                React.createElement("td", { className: "px-4 py-3 text-xs text-gray-500" }, l.created_at ? new Date(l.created_at).toLocaleString('pt-BR') : '—')
                                            );
                                        })
                                    )
                                )
                            )
                )
            ),

            // ================== MODAL 2FA ==================
            modal2fa.aberto && React.createElement("div", {
                className: "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            },
                React.createElement("div", { className: "bg-white rounded-2xl max-w-md w-full overflow-hidden border border-gray-200" },
                    React.createElement("div", {
                        className: "bg-white border-b border-gray-200 p-6 text-gray-900 text-center"
                    },
                        React.createElement("svg", { className: "ico", style: { fontSize: 28, color: "#770fa8" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-lock" })),
                        React.createElement("h3", { className: "text-xl font-bold mt-2" }, "Confirmação — Acerto Profissional"),
                        modal2fa.loteId && React.createElement("p", { className: "text-gray-500 text-sm mt-1" }, "Lote #" + modal2fa.loteId)
                    ),
                    React.createElement("div", { className: "p-6 space-y-4" },

                        // Etapa: confirmar (enviar código)
                        modal2fa.etapa === 'confirmar' && React.createElement("div", { className: "space-y-4 text-center" },
                            React.createElement("p", { className: "text-gray-600 text-sm" }, "Um código de segurança será enviado para o email cadastrado para confirmar o pagamento."),
                            React.createElement("button", {
                                onClick: function() { solicitarToken(modal2fa.loteId); },
                                disabled: modal2fa.enviando,
                                className: "w-full py-3 bg-purple-700 text-white rounded-xl font-bold hover:bg-purple-800 disabled:opacity-50 transition-colors"
                            }, modal2fa.enviando ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-mail" })), "Enviando...") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-mail" })), "Enviar código por email"))
                        ),

                        // Etapa: digitar código
                        modal2fa.etapa === 'digitar' && React.createElement("div", { className: "space-y-4 text-center" },
                            React.createElement("p", { className: "text-gray-600 text-sm" }, "Código enviado para ", React.createElement("strong", null, modal2fa.emailMascarado)),
                            React.createElement("input", {
                                type: "text", maxLength: 6, placeholder: "000000",
                                value: modal2fa.tokenDigitado,
                                onChange: function(e) {
                                    var v = e.target.value.replace(/\D/g, '').substring(0, 6);
                                    setModal2fa(function(p) { return Object.assign({}, p, { tokenDigitado: v, erro: '' }); });
                                },
                                className: "w-full text-center text-3xl font-bold tracking-[12px] border-2 border-gray-300 rounded-xl py-4 focus:border-purple-700 outline-none",
                                autoFocus: true
                            }),
                            React.createElement("button", {
                                onClick: validarEExecutar,
                                disabled: modal2fa.validando || modal2fa.tokenDigitado.length !== 6,
                                className: "w-full py-3 bg-purple-700 text-white rounded-xl font-bold disabled:opacity-50 transition-colors"
                            }, modal2fa.validando ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clock" })), "Executando pagamentos...") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), "Confirmar e Pagar"))
                        ),

                        // Etapa: executando
                        modal2fa.etapa === 'executando' && React.createElement("div", { className: "text-center py-6" },
                            React.createElement("div", { className: "animate-spin w-10 h-10 border-4 border-purple-200 border-t-purple-700 rounded-full mx-auto mb-4" }),
                            React.createElement("p", { className: "text-gray-600" }, "Executando pagamentos via Stark Bank..."),
                            React.createElement("p", { className: "text-gray-400 text-sm mt-2" }, "Não feche esta janela")
                        ),

                        // Erro
                        modal2fa.erro && React.createElement("div", { className: "bg-red-50 border border-red-200 rounded-lg p-3 text-center" },
                            React.createElement("p", { className: "text-red-600 text-sm" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })), "" + modal2fa.erro)
                        ),

                        // Botão cancelar
                        modal2fa.etapa !== 'executando' && React.createElement("button", {
                            onClick: function() {
                                setModal2fa({
                                    aberto: false, etapa: 'confirmar', chaveToken: null, emailMascarado: '',
                                    tokenDigitado: '', enviando: false, validando: false, erro: '', loteId: null
                                });
                            },
                            className: "w-full py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
                        }, "Cancelar")
                    )
                )
            ),

            // ================== MODAL RESULTADO ==================
            modalRes.aberto && React.createElement("div", {
                className: "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            },
                React.createElement("div", { className: "bg-white rounded-2xl max-w-lg w-full overflow-hidden border border-gray-200" },
                    // Header - verde se tudo ok, amarelo se teve rejeitados, vermelho se todos falharam
                    React.createElement("div", {
                        className: "bg-white border-b border-gray-200 p-6 text-gray-900 text-center"
                    },
                        React.createElement("span", { className: "text-5xl" }, modalRes.enviados === 0 && modalRes.rejeitados > 0 ? React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })) : modalRes.rejeitados > 0 ? React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#d97706" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-alert" })) : React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" }))),
                        React.createElement("h3", { className: "text-xl font-bold mt-3" },
                            modalRes.enviados === 0 && modalRes.rejeitados > 0 ? "Acerto Falhou"
                            : modalRes.rejeitados > 0 ? "Acerto Parcial"
                            : "Acerto Enviado!"
                        ),
                        React.createElement("p", { className: "text-sm opacity-90 mt-1" }, "Pagamento via Stark Bank")
                    ),

                    React.createElement("div", { className: "p-6 space-y-4" },
                        // Cards de resumo
                        React.createElement("div", { className: "grid grid-cols-2 gap-3" },
                            React.createElement("div", { className: "bg-green-50 rounded-xl p-4 text-center" },
                                React.createElement("p", { className: "text-3xl font-bold text-green-800" }, modalRes.enviados),
                                React.createElement("p", { className: "text-xs text-green-800 mt-1" }, "Pagamentos enviados"),
                                React.createElement("p", { className: "text-sm font-medium text-green-800 mt-1" }, formatarMoeda(modalRes.valorEnviado))
                            ),
                            React.createElement("div", { className: "rounded-xl p-4 text-center " + (modalRes.rejeitados > 0 ? "bg-red-50" : "bg-gray-50") },
                                React.createElement("p", { className: "text-3xl font-bold " + (modalRes.rejeitados > 0 ? "text-red-600" : "text-gray-300") }, modalRes.rejeitados),
                                React.createElement("p", { className: "text-xs mt-1 " + (modalRes.rejeitados > 0 ? "text-red-800" : "text-gray-400") }, "Rejeitados"),
                                modalRes.rejeitados > 0 && React.createElement("p", { className: "text-xs text-red-500 mt-1" }, "Verificar detalhes abaixo")
                            )
                        ),

                        // Saldo antes
                        modalRes.saldoAntes && React.createElement("div", { className: "bg-gray-50 rounded-xl p-3 text-center" },
                            React.createElement("p", { className: "text-xs text-gray-400" }, "Saldo antes do pagamento: " + formatarMoeda(modalRes.saldoAntes))
                        ),

                        // Lista de rejeitados (se houver)
                        modalRes.rejeitados > 0 && modalRes.detalhesRejeitados.length > 0 && React.createElement("div", {
                            className: "bg-red-50 border border-red-200 rounded-xl p-4"
                        },
                            React.createElement("p", { className: "text-sm font-bold text-red-800 mb-3 flex items-center gap-2" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })), "Profissionais rejeitados:")),
                            React.createElement("div", { className: "space-y-2 max-h-48 overflow-y-auto" },
                                modalRes.detalhesRejeitados.map(function(r, i) {
                                    return React.createElement("div", {
                                        key: i,
                                        className: "flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-red-100"
                                    },
                                        React.createElement("div", null,
                                            React.createElement("p", { className: "text-sm font-medium text-gray-800" }, "#" + (r.cod_prof || '') + " " + (r.nome || '')),
                                            React.createElement("p", { className: "text-xs text-red-500 mt-0.5" }, (r.erro || 'Erro desconhecido').substring(0, 100))
                                        ),
                                        React.createElement("div", { className: "text-right flex-shrink-0 ml-2" },
                                            React.createElement("p", { className: "text-sm font-bold text-red-600" }, formatarMoeda(r.valor || 0)),
                                            React.createElement("span", { className: "px-2 py-1 bg-red-50 text-red-800 rounded-full text-xs font-medium" }, "Falhou")
                                        )
                                    );
                                })
                            ),
                            React.createElement("p", { className: "text-xs text-red-600 mt-3 text-center" }, "Verifique os dados (CPF, chave Pix) e tente novamente com um novo lote.")
                        ),

                        // Mensagem de sucesso total
                        modalRes.rejeitados === 0 && modalRes.enviados > 0 && React.createElement("div", {
                            className: "bg-green-50 border border-green-200 rounded-xl p-4 text-center"
                        },
                            React.createElement("p", { className: "text-green-800" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), "Todos os pagamentos foram enviados com sucesso!")),
                            React.createElement("p", { className: "text-xs text-green-800 mt-1" }, "O status será atualizado via webhook quando confirmados pelo banco.")
                        ),

                        // Mensagem de falha total
                        modalRes.enviados === 0 && modalRes.rejeitados > 0 && React.createElement("div", {
                            className: "bg-red-50 border border-red-200 rounded-xl p-4 text-center"
                        },
                            React.createElement("p", { className: "text-red-800 font-medium" }, "Nenhum pagamento foi enviado."),
                            React.createElement("p", { className: "text-xs text-red-500 mt-1" }, "Verifique os dados dos profissionais (CPF válido, chave Pix correta) e tente novamente.")
                        ),

                        // Botão fechar
                        React.createElement("button", {
                            onClick: function() {
                                setModalRes(function(p) { return Object.assign({}, p, { aberto: false }); });
                                // Recarregar dados
                                carregarLotesAprovacao();
                                carregarSaldo();
                            },
                            className: "w-full py-3 bg-purple-700 text-white rounded-xl font-bold hover:bg-purple-800 transition-colors"
                        }, "Entendido")
                    )
                )
            )
        );
    };

    // ==================== CONCILIAÇÃO ACERTO COMPONENT ====================
    window.ConciliacaoAcertoComponent = function(props) {
        var fetchAuth = props.fetchAuth;
        var API_URL = props.API_URL;
        var Toast = props.Toast;
        var formatarMoeda = window.formatarMoeda;

        var _st = React.useState({
            itens: [],
            estatisticas: null,
            lotes: [],
            loading: false,
            filtroLote: '',
            filtroStatus: '',
            filtroDataInicio: '',
            filtroDataFim: '',
            busca: ''
        });
        var st = _st[0]; var setSt = _st[1];

        // Carregar dados
        var carregarDados = async function(filtrosOverride) {
            setSt(function(p) { return Object.assign({}, p, { loading: true }); });
            try {
                var f = filtrosOverride || st;
                var url = API_URL + '/stark/acerto/conciliacao/listar?';
                if (f.filtroDataInicio) url += 'data_inicio=' + f.filtroDataInicio + '&';
                if (f.filtroDataFim) url += 'data_fim=' + f.filtroDataFim + '&';
                if (f.filtroLote) url += 'lote_id=' + f.filtroLote + '&';
                if (f.filtroStatus) url += 'status=' + f.filtroStatus + '&';

                var r = await fetchAuth(url);
                var d = await r.json();
                setSt(function(p) {
                    return Object.assign({}, p, {
                        itens: d.itens || [],
                        estatisticas: d.estatisticas || null,
                        lotes: d.lotes || [],
                        loading: false
                    });
                });
            } catch (e) {
                Toast('Erro: ' + e.message, 'error');
                setSt(function(p) { return Object.assign({}, p, { loading: false }); });
            }
        };

        // Init
        React.useEffect(function() { carregarDados(); }, []);

        // 🔔 Real-time: escutar pagamentos Stark Bank via WebSocket
        React.useEffect(function() {
            var handler = function(e) {
                console.log('💰 [Conciliação] Atualização em tempo real:', e.detail.stark_status);
                setTimeout(function() { carregarDados(); }, 800);
            };
            window.addEventListener('stark-payment-update', handler);
            return function() { window.removeEventListener('stark-payment-update', handler); };
        }, []);

        // Filtrar por busca local (nome ou código)
        var itensFiltrados = st.itens.filter(function(item) {
            if (!st.busca) return true;
            var termo = st.busca.toLowerCase();
            return (item.cod_prof || '').toLowerCase().includes(termo) ||
                   (item.nome_prof || '').toLowerCase().includes(termo) ||
                   (item.pix_key || '').toLowerCase().includes(termo);
        });

        // Badge helper
        var badge = function(s) {
            var c = {
                pago: 'bg-green-50 text-green-800', processando: 'bg-amber-50 text-amber-800',
                rejeitado: 'bg-red-50 text-red-800', erro: 'bg-red-50 text-red-800',
                em_lote: 'bg-blue-50 text-blue-800', parcial: 'bg-amber-50 text-amber-800',
                concluido: 'bg-green-50 text-green-800'
            };
            var labels = {
                pago: 'Pago', processando: 'Processando', rejeitado: 'Rejeitado',
                erro: 'Erro', em_lote: 'No Lote', parcial: 'Parcial', concluido: 'Concluído'
            };
            /* FIN_ABAS_V1: pílula suave com ponto */
            var tons = { pago: 'verde', concluido: 'verde', processando: 'ambar', parcial: 'ambar', rejeitado: 'vermelho', erro: 'vermelho', em_lote: 'azul' };
            void c;
            return window.FinUI.pilula(tons[s] || 'cinza', labels[s] || s || '—');
        };

        // Exportar CSV
        var exportarCSV = function() {
            if (itensFiltrados.length === 0) { Toast('Nenhum dado para exportar', 'warning'); return; }
            var linhas = ['Lote;Código;Nome;Chave Pix;CPF;Valor;Status;Data'];
            itensFiltrados.forEach(function(item) {
                linhas.push([
                    item.lote_id,
                    item.cod_prof,
                    '"' + (item.nome_prof || '') + '"',
                    '"' + (item.pix_key || '') + '"',
                    '"' + (item.cpf || '') + '"',
                    (item.valor || 0).toString().replace('.', ','),
                    item.item_status,
                    item.lote_criado_em ? new Date(item.lote_criado_em).toLocaleDateString('pt-BR') : ''
                ].join(';'));
            });
            var blob = new Blob([linhas.join('\n')], { type: 'text/csv;charset=utf-8;' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'conciliacao-acerto-' + new Date().toISOString().split('T')[0] + '.csv';
            a.click();
            URL.revokeObjectURL(url);
            Toast('CSV exportado!', 'success');
        };

        // Sincronizar status acerto
        var _sincConciliacao = React.useState(false);
        var sincConciliacao = _sincConciliacao[0]; var setSincConciliacao = _sincConciliacao[1];

        var sincronizarConciliacao = async function() {
            setSincConciliacao(true);
            try {
                Toast('Sincronizando status com Stark Bank...', 'info');
                var r = await fetchAuth(API_URL + '/stark/sync', { method: 'POST' });
                var d = await r.json();
                if (d.atualizados > 0) {
                    Toast('' + d.atualizados + ' pagamento(s) atualizado(s)!', 'success');
                    carregarDados();
                } else {
                    Toast('Nenhuma atualização pendente', 'info');
                }
            } catch (e) {
                Toast('Erro: ' + e.message, 'error');
            } finally {
                setSincConciliacao(false);
            }
        };

        /* FIN_ABAS_V1: Conc. Acerto — cabeçalho limpo, faixa de KPIs, filtros num card, tabela com pílulas */
        return React.createElement("div", { className: "space-y-4", style: { color: "#111827", fontSize: 13 } },

            // Header
            React.createElement("div", { className: "flex items-end justify-between flex-wrap gap-3" },
                React.createElement("div", null,
                    React.createElement("h1", { className: "fin-page-t" }, "Conciliação do acerto"),
                    React.createElement("p", { className: "fin-page-s" }, "Pagamentos de acerto profissional realizados via Stark Bank" + (st.itens.length ? " · " + st.itens.length + " item(ns)" : ""))
                ),
                React.createElement("div", { className: "flex gap-2 flex-wrap" },
                    React.createElement("button", {
                        onClick: sincronizarConciliacao,
                        disabled: sincConciliacao,
                        className: "fin-btn fin-btn-s"
                    }, sincConciliacao ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clock" })), "Sincronizando...") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-refresh" })), "Sincronizar Stark")),
                    React.createElement("button", {
                        onClick: function() { carregarDados(); },
                        className: "fin-btn fin-btn-s"
                    }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-refresh" })), "Atualizar")),
                    React.createElement("button", {
                        onClick: exportarCSV,
                        disabled: itensFiltrados.length === 0,
                        className: "fin-btn fin-btn-p"
                    }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-download" })), "Exportar CSV"))
                )
            ),

            // Cards de estatísticas
            st.estatisticas && window.FinUI.kpis([
                { rotulo: "Pagos", valor: st.estatisticas.pagos || 0, sub: formatarMoeda(st.estatisticas.valor_pago || 0) },
                { rotulo: "Processando", valor: st.estatisticas.processando || 0, tom: (st.estatisticas.processando || 0) > 0 ? "ambar" : null, sub: formatarMoeda(st.estatisticas.valor_processando || 0) },
                { rotulo: "Rejeitados", valor: st.estatisticas.rejeitados || 0, tom: (st.estatisticas.rejeitados || 0) > 0 ? "vermelho" : null },
                { rotulo: "Total de itens", valor: st.itens.length },
                { rotulo: "Valor total", valor: formatarMoeda(st.estatisticas.valor_total || 0) }
            ], { marginBottom: 0 }),

            // Filtros
            React.createElement("div", { className: "bg-white rounded-[14px] p-4 border border-gray-200" },
                React.createElement("div", { className: "flex flex-wrap items-end gap-3" },
                    React.createElement("div", null,
                        React.createElement("label", { className: "fin-lbl" }, "Data início"),
                        React.createElement("input", {
                            type: "date", value: st.filtroDataInicio,
                            onChange: function(e) { setSt(function(p) { return Object.assign({}, p, { filtroDataInicio: e.target.value }); }); },
                            className: "fin-inp"
                        })
                    ),
                    React.createElement("div", null,
                        React.createElement("label", { className: "fin-lbl" }, "Data fim"),
                        React.createElement("input", {
                            type: "date", value: st.filtroDataFim,
                            onChange: function(e) { setSt(function(p) { return Object.assign({}, p, { filtroDataFim: e.target.value }); }); },
                            className: "fin-inp"
                        })
                    ),
                    React.createElement("div", null,
                        React.createElement("label", { className: "fin-lbl" }, "Lote"),
                        React.createElement("select", {
                            value: st.filtroLote,
                            onChange: function(e) { setSt(function(p) { return Object.assign({}, p, { filtroLote: e.target.value }); }); },
                            className: "fin-inp"
                        },
                            React.createElement("option", { value: "" }, "Todos os lotes"),
                            (st.lotes || []).map(function(l) {
                                return React.createElement("option", { key: l.id, value: l.id },
                                    "Lote #" + l.id + " — " + formatarMoeda(l.valor_total) + " (" + l.quantidade + " prof.)"
                                );
                            })
                        )
                    ),
                    React.createElement("div", null,
                        React.createElement("label", { className: "fin-lbl" }, "Status"),
                        React.createElement("select", {
                            value: st.filtroStatus,
                            onChange: function(e) { setSt(function(p) { return Object.assign({}, p, { filtroStatus: e.target.value }); }); },
                            className: "fin-inp"
                        },
                            React.createElement("option", { value: "" }, "Todos"),
                            React.createElement("option", { value: "processando" }, "Processando"),
                            React.createElement("option", { value: "pago" }, "Pago"),
                            React.createElement("option", { value: "parcial" }, "Parcial"),
                            React.createElement("option", { value: "erro" }, "Erro")
                        )
                    ),
                    React.createElement("button", {
                        onClick: function() { carregarDados(); },
                        className: "fin-btn fin-btn-p"
                    }, "Filtrar"),
                    (st.filtroDataInicio || st.filtroDataFim || st.filtroLote || st.filtroStatus) && React.createElement("button", {
                        onClick: function() {
                            var limpo = { filtroDataInicio: '', filtroDataFim: '', filtroLote: '', filtroStatus: '' };
                            setSt(function(p) { return Object.assign({}, p, limpo); });
                            carregarDados(limpo);
                        },
                        className: "fin-btn fin-btn-s"
                    }, "Limpar"),
                    st.loading && React.createElement("div", { className: "flex items-center gap-2 text-gray-500", style: { height: 38 } },
                        React.createElement("div", { className: "w-4 h-4 border-2 border-purple-700 border-t-transparent rounded-full animate-spin" }),
                        React.createElement("span", { className: "text-sm" }, "Buscando...")
                    ),
                    // Busca local
                    React.createElement("label", { style: { marginLeft: "auto", flex: "1 1 240px", maxWidth: 360, display: "flex", alignItems: "center", gap: 8, height: 38, padding: "0 12px", border: "1px solid #e5e7eb", borderRadius: 10, color: "#9ca3af", background: "#ffffff" } },
                        React.createElement("svg", { className: "ico", style: { width: 15, height: 15 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-search" })),
                        React.createElement("input", {
                            type: "text", placeholder: "Código, nome ou chave Pix", "aria-label": "Buscar profissional",
                            value: st.busca,
                            onChange: function(e) { setSt(function(p) { return Object.assign({}, p, { busca: e.target.value }); }); },
                            style: { border: 0, outline: 0, flex: 1, minWidth: 0, font: "inherit", fontSize: 13, color: "#111827", background: "transparent" }
                        })
                    )
                )
            ),

            // Tabela
            st.loading
                ? React.createElement("div", { className: "fin-card" }, window.FinUI.vazio("Carregando..."))
                : itensFiltrados.length === 0
                    ? React.createElement("div", { className: "fin-card" }, window.FinUI.vazio("Nenhum pagamento de acerto encontrado. Ajuste os filtros ou realize um acerto primeiro."))
                    : React.createElement("div", { className: "bg-white rounded-[14px] overflow-x-auto border border-gray-200" },
                        React.createElement("div", { className: "px-4 py-3 border-b border-gray-100 flex justify-between items-center flex-wrap gap-2" },
                            React.createElement("span", { className: "text-sm text-gray-700 font-semibold" }, itensFiltrados.length + " profissionais encontrados"),
                            React.createElement("span", { className: "text-sm text-green-800 font-bold" }, "Total: " + formatarMoeda(itensFiltrados.reduce(function(a, i) { return a + parseFloat(i.valor || 0); }, 0)))
                        ),
                        React.createElement("table", { className: "w-full text-sm fin-tbl" },
                            React.createElement("thead", null,
                                React.createElement("tr", null,
                                    React.createElement("th", { className: "px-4 py-3 text-center" }, "Lote"),
                                    React.createElement("th", { className: "px-4 py-3 text-left" }, "Código"),
                                    React.createElement("th", { className: "px-4 py-3 text-left" }, "Nome"),
                                    React.createElement("th", { className: "px-4 py-3 text-left" }, "Chave Pix"),
                                    React.createElement("th", { className: "px-4 py-3 text-left" }, "CPF"),
                                    React.createElement("th", { className: "px-4 py-3 text-right" }, "Valor Pago"),
                                    React.createElement("th", { className: "px-4 py-3 text-center" }, "Status"),
                                    React.createElement("th", { className: "px-4 py-3 text-left" }, "Data"),
                                    React.createElement("th", { className: "px-4 py-3 text-left" }, "Executado por")
                                )
                            ),
                            React.createElement("tbody", null,
                                itensFiltrados.map(function(item, i) {
                                    return React.createElement("tr", {
                                        key: item.id || i,
                                        className: ""
                                    },
                                        React.createElement("td", { className: "px-4 py-2.5 text-center" },
                                            React.createElement("span", { className: "text-gray-700 font-semibold tabular-nums" }, "#" + item.lote_id)
                                        ),
                                        React.createElement("td", { className: "px-4 py-2.5 tabular-nums text-gray-700" }, "#" + item.cod_prof),
                                        React.createElement("td", { className: "px-4 py-2.5 font-medium" }, item.nome_prof || '—'),
                                        React.createElement("td", { className: "px-4 py-2.5 text-xs text-gray-500 max-w-[160px] truncate" }, item.pix_key || '—'),
                                        React.createElement("td", { className: "px-4 py-2.5 text-xs text-gray-500" }, item.cpf || '—'),
                                        React.createElement("td", { className: "px-4 py-2.5 text-right font-semibold tabular-nums" }, formatarMoeda(item.valor)),
                                        React.createElement("td", { className: "px-4 py-2.5 text-center" }, badge(item.item_status)),
                                        React.createElement("td", { className: "px-4 py-2.5 text-xs text-gray-500" }, item.lote_criado_em ? new Date(item.lote_criado_em).toLocaleDateString('pt-BR') : '—'),
                                        React.createElement("td", { className: "px-4 py-2.5 text-xs text-gray-500" }, item.executado_por_nome || '—')
                                    );
                                })
                            )
                        )
                    )
        );
    };

    
    console.log("✅ ModuloFinanceiro.js carregado");
})();
