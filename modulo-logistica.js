/* REDESIGN_CLEAN_V1: telas no padrao clean aprovado (mockups 16/10). */
/* UI_UNIFICADO_V1: emojis -> sprite de icones; cores na paleta unica (CORES_TOKENS_V1). */
/* DEEMOJI_V1 */
// ==================== MÓDULO UBER DIRECT ====================
// Arquivo: modulo-uber.js
// Admin: Dashboard, Tracking em tempo real, Entregas, Configuração
// Hub Logístico — despacho multi-provedor (Uber Direct + 99) via Central Tutts
// ============================================================

(function () {
  'use strict';

  const { useState, useEffect, useCallback, useRef, useMemo } = React;
  const h = React.createElement;
  // CANCEL_MOTIVO_V3: motivos padrao do cancelamento (admin). Lista curta de
  // proposito — o que nao cabe aqui vai em "Outro" com texto livre.
  const MOTIVOS_CANCELAMENTO = [
    'Cliente desistiu da entrega',
    'Pedido duplicado',
    'Endereco incorreto ou incompleto',
    'Demora na alocacao do entregador',
    'Entregador nao compareceu',
    'Produto indisponivel / sem estoque',
    'Erro no cadastro da OS',
    'Vai sair com moto propria',
  ]; /* HUB_ICONS_V1 */

  // REDESPACHO_BTN_V1 — estagios em que ainda da pra redespachar.
  //
  // Doc oficial da 99 (Cancel Order): "If the courier has picked up the
  // package, order cancellation is not supported." A fronteira e a COLETA,
  // nao o aceite: entre COURIER_ASSIGNED e ARRIVED_PICKUP a 99 ainda cancela.
  // A partir de PICKED_UP ela recusa, a corrida segue viva SENDO COBRADA, e
  // um redespacho ali pagaria DUAS corridas.
  //
  // Fica no escopo do modulo de proposito: TERMINAIS_CANON esta duplicado
  // dentro de CardEntrega e de CardKanban, e duas copias de uma regra que
  // envolve dinheiro e uma so pra sair de sincronia.
  const ANTES_DA_COLETA_CANON = ['PENDING', 'QUOTED', 'DISPATCHED', 'COURIER_ASSIGNED', 'PICKUP_EN_ROUTE', 'ARRIVED_PICKUP'];

  // ── Helpers ──
  function fmtDT(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
  function fmtMoney(v) {
    if (v == null) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  }

  // ════════════════════════════════════════════════════════
  // HUB_ABAS_V1 — peças de UI do padrão clean para as demais abas do Hub
  // (Tracking, Regras, Barrados, Frequentes). Só visual: nenhuma regra aqui.
  // ════════════════════════════════════════════════════════
  const HX = {
    titulo: { fontFamily: 'Sora, Inter, sans-serif', letterSpacing: '-0.01em' },
    btnPri: 'h-10 px-4 rounded-[10px] bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800 inline-flex items-center justify-center gap-1.5 disabled:opacity-50',
    btnSec: 'h-10 px-4 rounded-[10px] border border-gray-200 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 inline-flex items-center justify-center gap-1.5 disabled:opacity-50',
    btnIco: 'w-10 h-10 rounded-[10px] border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 grid place-items-center flex-shrink-0',
    btnDest: 'h-8 px-3 rounded-[10px] border border-red-200 bg-white text-red-800 text-[13px] font-semibold hover:bg-red-50 inline-flex items-center gap-1.5',
    input: 'w-full h-[38px] px-3 border border-gray-200 rounded-[10px] bg-white text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100',
    area: 'w-full px-3 py-2 border border-gray-200 rounded-[10px] bg-white text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 resize-y',
    label: 'block text-xs font-semibold text-gray-700 mb-1',
    hint: 'text-[11.5px] text-gray-500 mt-1 leading-snug',
    card: 'bg-white rounded-[14px] border border-gray-200',
    th: 'px-4 py-2.5 text-left text-xs font-semibold text-gray-500 whitespace-nowrap',
  };
  const HX_TOM = {
    verde:    { bg: '#f0fdf4', fg: '#166534', dot: '#16a34a' },
    ambar:    { bg: '#fffbeb', fg: '#92400e', dot: '#d97706' },
    vermelho: { bg: '#fef2f2', fg: '#991b1b', dot: '#dc2626' },
    azul:     { bg: '#eff6ff', fg: '#1e40af', dot: '#2563eb' },
    roxo:     { bg: '#faf7fd', fg: '#5d0b85', dot: '#770fa8' },
    cinza:    { bg: '#f3f4f6', fg: '#374151', dot: '#9ca3af' },
  };
  const hxIco = (nome, sz, extra) => h('svg', { className: 'ico', style: Object.assign({ width: sz || 16, height: sz || 16 }, extra || {}), 'aria-hidden': 'true' }, h('use', { href: '#i-' + nome }));
  // Pílula suave: fundo 50 + texto 800 + ponto 6px 600
  function HxPilula({ tom, children, title, semPonto }) {
    const t = HX_TOM[tom] || HX_TOM.cinza;
    return h('span', { title, className: 'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap', style: { background: t.bg, color: t.fg } },
      !semPonto && h('span', { 'aria-hidden': 'true', style: { width: 6, height: 6, borderRadius: 99, background: t.dot, flexShrink: 0 } }),
      children);
  }
  // Tom da pílula a partir da classe Tailwind legada de STATUS_LABELS
  function hxTomDeCor(cor) {
    const c = String(cor || '');
    if (/green|emerald/.test(c)) return 'verde';
    if (/red/.test(c)) return 'vermelho';
    if (/amber|orange|yellow/.test(c)) return 'ambar';
    if (/blue|sky|cyan/.test(c)) return 'azul';
    if (/purple|indigo|violet/.test(c)) return 'roxo';
    return 'cinza';
  }
  function HxStatus({ entrega }) {
    const s = resolverStatus(entrega || {});
    return h(HxPilula, { tom: hxTomDeCor(s.cor) }, s.label);
  }
  // Cabeçalho de página: título Sora 24 + subtítulo cinza + ações à direita
  function HxCabecalho({ titulo, sub, acoes }) {
    return h('div', { className: 'flex items-end justify-between flex-wrap gap-3' },
      h('div', { className: 'min-w-0' },
        h('h1', { className: 'text-2xl font-bold text-gray-900', style: HX.titulo }, titulo),
        sub && h('p', { className: 'text-[13px] text-gray-500 mt-1' }, sub)),
      acoes && h('div', { className: 'flex gap-2 items-center flex-wrap' }, acoes));
  }
  // Faixa única de KPIs: um card, células divididas por borda #f3f4f6
  function HxKpis({ itens, rotulo }) {
    return h('section', { 'aria-label': rotulo || 'Indicadores', className: 'bg-white rounded-[14px] border border-gray-200 flex flex-wrap overflow-hidden' },
      itens.map((k, i) => h('div', { key: i, style: { flex: '1 1 160px', padding: '16px 20px', borderRight: i < itens.length - 1 ? '1px solid #f3f4f6' : 'none', minWidth: 0 } },
        h('div', { style: { fontSize: 12, color: '#6b7280' } }, k.l),
        h('div', { style: { fontFamily: 'Sora, Inter, sans-serif', fontSize: 26, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: k.cor || '#111827', lineHeight: 1.25, margin: '2px 0' } }, k.v),
        k.sub && h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, k.sub))));
  }
  // Switch no padrão (roxo ligado / cinza desligado), com nome acessível
  function HxSwitch({ on, onClick, disabled, label }) {
    return h('button', {
      // sem role=switch: o index.html força padding/min-size em button[role=switch] no mobile
      type: 'button', 'aria-pressed': !!on, 'aria-label': label, onClick, disabled,
      className: 'relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 ' + (on ? 'bg-purple-700' : 'bg-gray-300'),
    }, h('span', { className: 'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ' + (on ? 'right-0.5' : 'left-0.5') }));
  }
  // Linha de configuração: título + descrição à esquerda, switch à direita
  function HxLinhaSwitch({ titulo, desc, on, onClick, disabled, children }) {
    return h('div', { className: 'py-3.5 border-t border-gray-100 first:border-t-0' },
      h('div', { className: 'flex items-start justify-between gap-4' },
        h('div', { className: 'min-w-0' },
          h('div', { className: 'text-[13.5px] font-semibold text-gray-900' }, titulo),
          desc && h('p', { className: 'text-[12px] text-gray-500 mt-0.5 leading-snug' }, desc)),
        h(HxSwitch, { on, onClick, disabled, label: typeof titulo === 'string' ? titulo : undefined })),
      children);
  }
  function HxVazio({ titulo, texto, acao }) {
    return h('div', { className: 'py-14 px-6 text-center' },
      h('div', { className: 'text-[14px] font-semibold text-gray-700' }, titulo),
      texto && h('div', { className: 'text-[13px] text-gray-500 mt-1 max-w-md mx-auto' }, texto),
      acao && h('div', { className: 'mt-4' }, acao));
  }
  function HxSpinner() {
    return h('div', { className: 'py-16 flex justify-center' }, h('div', { className: 'animate-spin w-8 h-8 border-[3px] border-purple-700 border-t-transparent rounded-full', role: 'status', 'aria-label': 'Carregando' }));
  }
  // Avatar neutro (foto ou iniciais) — sem cores fortes
  function HxAvatar({ foto, nome, size }) {
    const s = size || 32;
    const ini = (function () { if (!nome) return '?'; const p = String(nome).trim().split(/\s+/); return (p.length === 1 ? p[0].slice(0, 2) : p[0][0] + p[p.length - 1][0]).toUpperCase(); })();
    return h('div', { className: 'relative flex-shrink-0', style: { width: s, height: s } },
      foto && h('img', { src: foto, alt: nome || 'Entregador', className: 'rounded-full object-cover', style: { width: s, height: s },
        onError: (ev) => { ev.target.style.display = 'none'; const fb = ev.target.nextSibling; if (fb) fb.style.display = 'flex'; } }),
      h('div', { className: 'rounded-full items-center justify-center font-semibold', style: { width: s, height: s, background: '#f3e8fb', color: '#5d0b85', fontSize: Math.round(s * 0.36), display: foto ? 'none' : 'flex' } }, ini));
  }

  // 🆕 2026-06: badge do codigo (coleta/entrega) da 99/Uber.
  // - codigo presente: mostra destacado e copia ao clicar.
  // - codigo ausente: mostra "aguardando" (a 99 gera apos o despacho, via poller;
  //   se a verificacao estiver desligada no provedor, fica sem codigo mesmo).
  function CodigoBadge(label, codigo) {
    if (codigo) {
      return h('div', {
        onClick: () => { try { navigator.clipboard.writeText(String(codigo)); } catch (_) {} },
        title: 'Clique para copiar',
        className: 'mt-1.5 inline-flex items-center gap-1.5 cursor-pointer bg-purple-50 border border-purple-200 rounded-lg px-2 py-1'
      },
        h('span', { className: 'text-[10px] uppercase tracking-wider text-purple-700 font-semibold' }, label),
        h('span', { className: 'text-sm font-bold tracking-widest text-purple-800' }, String(codigo)),
        h('span', { className: 'text-[10px] text-purple-400' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-clipboard' })))
      );
    }
    return h('div', { className: 'mt-1.5 inline-flex items-center gap-1 text-[11px] text-gray-400' },
      h('span', null, label + ': '),
      h('span', { className: 'italic' }, 'aguardando provedor')
    );
  }

  // Badge de código de DEVOLUÇÃO (laranja) — só aparece quando a corrida devolveu.
  // Separado do CodigoBadge (roxo) pra não poluir: devolução é exceção, não padrão.
  function CodigoBadgeDevol(label, codigo) {
    if (!codigo) return null;
    return h('div', {
      onClick: () => { try { navigator.clipboard.writeText(String(codigo)); } catch (_) {} },
      title: 'Clique para copiar',
      className: 'mt-1.5 inline-flex items-center gap-1.5 cursor-pointer bg-orange-50 border border-orange-200 rounded-lg px-2 py-1'
    },
      h('span', { className: 'text-[10px] uppercase tracking-wider text-orange-500 font-semibold' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-corner' })) + label),
      h('span', { className: 'text-sm font-bold tracking-widest text-orange-800' }, String(codigo)),
      h('span', { className: 'text-[10px] text-orange-400' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-clipboard' })))
    );
  }

  // Labels de status. Duas famílias de chave:
  //  - LEGADAS (snake_case): formato antigo da Uber (enviado_uber, pickup...).
  //  - CANÔNICAS (UPPER): o enum do hub multi-provider (DISPATCHED, PICKED_UP...).
  // O Badge tenta as duas — assim Uber e 99Entrega exibem o MESMO texto em
  // português, independente de qual provider mandou o status.
  const STATUS_LABELS = {
    // ── Família legada (Uber) ──
    aguardando_cotacao:    { label: 'Aguardando cotação',  cor: 'bg-gray-100 text-gray-700' },
    cotacao_recebida:      { label: 'Cotação OK',           cor: 'bg-blue-100 text-blue-700' },
    enviado_uber:          { label: 'Enviado ao provedor',      cor: 'bg-purple-100 text-purple-700' },
    entregador_atribuido:  { label: 'Entregador atribuído', cor: 'bg-indigo-100 text-indigo-700' },
    pickup:                { label: 'A caminho da coleta',  cor: 'bg-amber-100 text-amber-700' },
    pickup_complete:       { label: 'Coletou',              cor: 'bg-amber-200 text-amber-800' },
    dropoff:               { label: 'A caminho da entrega', cor: 'bg-orange-100 text-orange-700' },
    delivered:             { label: 'Entregue',             cor: 'bg-green-100 text-green-700' },
    canceled:              { label: 'Cancelado',            cor: 'bg-red-100 text-red-700' },
    cancelado:             { label: 'Cancelado',            cor: 'bg-red-100 text-red-700' },
    fallback_fila:         { label: 'Fallback p/ fila',     cor: 'bg-yellow-100 text-yellow-800' },
    erro:                  { label: 'Erro',                 cor: 'bg-red-200 text-red-900' },
    // ── Família canônica (hub multi-provider — CanonicalStatus) ──
    PENDING:               { label: 'Pendente',                cor: 'bg-gray-100 text-gray-700' },
    QUOTED:                { label: 'Cotação OK',              cor: 'bg-blue-100 text-blue-700' },
    DISPATCHED:            { label: 'Procurando entregador',   cor: 'bg-purple-100 text-purple-700' },
    COURIER_ASSIGNED:      { label: 'Entregador atribuído',    cor: 'bg-indigo-100 text-indigo-700' },
    PICKUP_EN_ROUTE:       { label: 'A caminho da coleta',     cor: 'bg-amber-100 text-amber-700' },
    ARRIVED_PICKUP:        { label: 'Na coleta',              cor: 'bg-amber-100 text-amber-700' },
    PICKED_UP:             { label: 'Coletou',                cor: 'bg-amber-200 text-amber-800' },
    DROPOFF_EN_ROUTE:      { label: 'A caminho da entrega',    cor: 'bg-orange-100 text-orange-700' },
    ARRIVED_DROPOFF:       { label: 'Na entrega',             cor: 'bg-orange-100 text-orange-700' },
    DELIVERED:             { label: 'Entregue',                cor: 'bg-green-100 text-green-700' },
    CANCELED:              { label: 'Cancelado',               cor: 'bg-red-100 text-red-700' },
    RETURNED:              { label: 'Devolvido',               cor: 'bg-red-100 text-red-700' },
    RETURNING:             { label: 'Devolvendo',              cor: 'bg-amber-100 text-amber-700' },
    FAILED:                { label: 'Falha',                   cor: 'bg-red-200 text-red-900' },
    FALLBACK_QUEUE:        { label: 'Fallback p/ fila',        cor: 'bg-yellow-100 text-yellow-800' },
  };

  // Tradução de status NATIVO da 99Entrega → label PT-BR (rede de segurança:
  // se por algum motivo só o status_native chegar, ainda exibe em português).
  const STATUS_NATIVE_99 = {
    finding:           'Procurando entregador',
    waiting:           'Entregador atribuído',
    delivering:        'Em entrega',
    completed:         'Entregue',
    canceled:          'Cancelado',
    closed:            'Encerrado',
    sendback:          'Em devolução',
    sendbackcompleted: 'Devolução concluída',
  };

  // Resolve o melhor label PT-BR a partir do registro de entrega.
  // Prioridade: status canônico → status legado → tradução do nativo 99 → cru.
  function resolverStatus(e) {
    const canon = e && e.status_canonico;
    if (canon && STATUS_LABELS[canon]) return STATUS_LABELS[canon];

    const legado = e && e.status_uber;
    if (legado && STATUS_LABELS[legado]) return STATUS_LABELS[legado];

    const nat99 = STATUS_NATIVE_99[String(legado || '').toLowerCase()];
    if (nat99) return { label: nat99, cor: 'bg-gray-100 text-gray-700' };

    return { label: legado || '—', cor: 'bg-gray-100 text-gray-700' };
  }

  // true quando a entrega ainda esta PROCURANDO entregador (nenhum motoboy
  // valido associado). Evita mostrar motoboy/faixa de coleta com dados
  // antigos quando a corrida volta a buscar (ex.: motoboy cancelou).
  function estaProcurando(e) {
    const c = String((e && e.status_canonico) || '').toUpperCase();
    if (['PENDING', 'QUOTED', 'DISPATCHED'].includes(c)) return true;
    const n = String((e && e.status_uber) || '').toLowerCase();
    if (!c && ['finding', 'pending', 'created'].includes(n)) return true;
    return false;
  }

  // Status oferecidos no dropdown de filtro — só os canônicos, na ordem do
  // ciclo de vida da entrega.
  const STATUS_FILTRO_OPCOES = [
    'PENDING', 'QUOTED', 'DISPATCHED', 'COURIER_ASSIGNED',
    'PICKUP_EN_ROUTE', 'ARRIVED_PICKUP', 'PICKED_UP',
    'DROPOFF_EN_ROUTE', 'ARRIVED_DROPOFF', 'DELIVERED',
    'CANCELED', 'RETURNED', 'FAILED', 'FALLBACK_QUEUE',
  ];

  function Badge({ status, entrega }) {
    // Aceita tanto Badge({entrega}) (preferido — usa status canônico) quanto
    // Badge({status}) (compat — string solta).
    const s = entrega
      ? resolverStatus(entrega)
      : (STATUS_LABELS[status] || { label: status, cor: 'bg-gray-100 text-gray-700' });
    return h('span', { className: `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.cor}` }, s.label);
  }

  // ════════════════════════════════════════════════════════
  // ABA 1: DASHBOARD - métricas
  // ════════════════════════════════════════════════════════
  // ════════════════════════════════════════════════════════
  // HUB_DASH_ANALITICO_V1 — seções analíticas do Dashboard do Hub
  // Provedores (99 × Uber) + ETA prometido × real, motivos de cancelamento,
  // parceiros frequentes × novos, tendência diária e mapa de calor hora × dia.
  // Dados: GET /logistics/dashboard/analitico (agregado por corrida/OS).
  // Cores: 99 = roxo #770fa8, Uber = âmbar #f67602 (fixas por provedor, nunca por posição).
  // ════════════════════════════════════════════════════════
  // HUB_DASH_ANALITICO_V11: provider_code real da 99 e 'noventanove'
  const PROV_COR = { '99': '#770fa8', noventanove: '#770fa8', uber: '#f67602', moto_propria: '#16a34a' };
  const PROV_NOME = { '99': '99Entrega', noventanove: '99Entrega', uber: 'Uber Direct', moto_propria: 'Moto própria' };
  const provCor = (p) => PROV_COR[String(p || '').toLowerCase()] || '#6b7280';
  const provNome = (p) => PROV_NOME[String(p || '').toLowerCase()] || String(p || '—');
  const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  function HubAnalitico({ API_URL, fetchAuth, showToast, de, ate }) {
    const [an, setAn] = useState(null);
    const [erro, setErro] = useState(null);
    const [heatMetrica, setHeatMetrica] = useState('corridas'); // corridas | pct_no_prazo | t_total_min
    const [hover, setHover] = useState(null); // { x, y, linhas: [] }

    useEffect(() => {
      let vivo = true;
      (async () => {
        setAn(null); setErro(null);
        try {
          const res = await fetchAuth(`${API_URL}/logistics/dashboard/analitico?data_inicio=${de}&data_fim=${ate}`);
          const json = await res.json();
          if (!vivo) return;
          if (json.success) setAn(json); else setErro(json.error || 'Erro ao carregar analítico');
        } catch (e) { if (vivo) setErro('Erro de rede ao carregar analítico'); }
      })();
      return () => { vivo = false; };
    }, [API_URL, fetchAuth, de, ate]);

    const fmtMin = (m) => { const v = parseFloat(m); if (m == null || isNaN(v)) return '—'; const r = Math.round(v); return r < 60 ? r + ' min' : Math.floor(r / 60) + 'h' + (r % 60 ? ' ' + (r % 60) + 'min' : ''); };
    const pct = (a, b) => (b ? (a / b) * 100 : null);
    const fmtPct = (v, d = 0) => v == null ? '—' : v.toFixed(d) + '%';
    // HUB_CLEAN_V1: card limpo (sem sombra, sem ícone no título)
    const card = (titulo, icone, sub, corpo, extra) => h('section', { className: 'bg-white rounded-[14px] border border-gray-200 p-5 space-y-3 min-w-0' },
      h('div', { className: 'flex items-start gap-2 flex-wrap' },
        h('div', { className: 'flex-1 min-w-0' },
          h('h2', { className: 'text-[15px] font-semibold text-gray-900' }, titulo),
          sub && h('p', { className: 'text-xs text-gray-500 mt-1' }, sub)),
        extra || null),
      corpo);
    const tip = hover && h('div', { className: 'fixed z-50 pointer-events-none bg-gray-900 text-white text-[11px] rounded-lg px-2.5 py-1.5', style: { left: hover.x + 12, top: hover.y + 12, maxWidth: 260 } },
      hover.linhas.map((l, i) => h('div', { key: i, className: i === 0 ? 'font-bold' : 'text-gray-300' }, l)));
    const onMove = (linhas) => (e) => setHover({ x: e.clientX, y: e.clientY, linhas });
    const offHover = () => setHover(null);

    if (erro) return h('div', { className: 'bg-red-50 border border-red-200 text-red-800 text-sm rounded-[14px] p-4' }, erro);
    if (!an) return h('div', { className: 'flex items-center justify-center py-10' }, h('div', { className: 'animate-spin w-8 h-8 border-4 border-purple-700 border-t-transparent rounded-full' }));

    const provs = an.provedores || [];
    const totalCorr = provs.reduce((s, p) => s + p.corridas, 0);

    // ── 1) PROVEDORES ──
    const secProvedores = card('Provedores', 'truck', 'Por corrida (OS) — o provedor da tentativa final. Custos e receita só do que fatura.',
      !provs.length ? h('div', { className: 'text-sm text-gray-400 py-4 text-center' }, 'Sem corridas no período.') :
      h('div', { className: 'space-y-3' },
        // barra de participação
        h('div', { className: 'flex h-2.5 rounded-full overflow-hidden gap-0.5' },
          provs.map(p => h('div', { key: p.provider, style: { width: `${pct(p.corridas, totalCorr)}%`, background: provCor(p.provider), minWidth: 4 }, onMouseMove: onMove([provNome(p.provider), `${p.corridas} corridas · ${fmtPct(pct(p.corridas, totalCorr))}`]), onMouseLeave: offHover }))),
        h('div', { className: 'flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500' }, provs.map(p => h('span', { key: p.provider, className: 'inline-flex items-center gap-1.5' }, h('span', { className: 'w-2 h-2 rounded-sm', style: { background: provCor(p.provider) } }), `${provNome(p.provider)} · ${p.corridas} (${fmtPct(pct(p.corridas, totalCorr))})`))),
        h('div', { className: 'overflow-x-auto -mx-5 border-t border-gray-100' },
          h('table', { className: 'w-full text-[12.5px]', style: { minWidth: 960 } },
            h('thead', null, h('tr', { className: 'bg-gray-50 text-xs text-gray-500' },
              ['Provedor', 'Corridas', 'Entregues', 'Canceladas', 'Redesp.', 'Tempo médio', 'Localização', 'Km médio', 'Custo médio', 'Receita', 'Margem', 'Margem %'].map((t, i) => h('th', { key: t, scope: 'col', className: 'py-2.5 font-semibold ' + (i === 0 ? 'pl-5 pr-2 text-left' : i === 11 ? 'pl-2 pr-5 text-right' : 'px-2 text-right') }, t)))),
            h('tbody', null, provs.map(p => {
              const m = parseFloat(p.margem || 0), rec = parseFloat(p.receita || 0);
              return h('tr', { key: p.provider, className: 'border-t border-gray-100 hover:bg-gray-50 tabular-nums' },
                h('td', { className: 'pl-5 pr-2 py-2.5 font-semibold text-gray-900' }, h('span', { className: 'inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle', style: { background: provCor(p.provider) } }), provNome(p.provider)),
                h('td', { className: 'px-2 py-2 text-right text-gray-700' }, p.corridas),
                h('td', { className: 'px-2 py-2 text-right text-gray-700' }, `${p.entregues} `, h('span', { className: 'text-gray-400' }, `(${fmtPct(pct(p.entregues, p.corridas))})`)),
                h('td', { className: 'px-2 py-2 text-right ' + (pct(p.canceladas, p.corridas) > 20 ? 'text-red-800 font-semibold' : 'text-gray-700') }, `${p.canceladas} `, h('span', { className: 'text-gray-400 font-normal' }, `(${fmtPct(pct(p.canceladas, p.corridas))})`)),
                h('td', { className: 'px-2 py-2 text-right ' + (p.redespachos ? 'text-amber-800 font-semibold' : 'text-gray-400') }, p.redespachos),
                h('td', { className: 'px-2 py-2 text-right text-gray-700' }, fmtMin(p.t_total_min), p.t_total_mediana_min != null && h('span', { className: 'text-gray-400' }, ` (${fmtMin(p.t_total_mediana_min)})`)),
                h('td', { className: 'px-2 py-2 text-right text-gray-700' }, fmtMin(p.t_localizacao_min)),
                h('td', { className: 'px-2 py-2 text-right text-gray-700' }, p.km_medio != null ? parseFloat(p.km_medio).toFixed(1) + ' km' : '—'),
                h('td', { className: 'px-2 py-2 text-right text-gray-700' }, fmtMoney(parseFloat(p.custo_medio || 0))),
                h('td', { className: 'px-2 py-2 text-right text-gray-700' }, fmtMoney(rec)),
                h('td', { className: 'px-2 py-2 text-right font-semibold ' + (m >= 0 ? 'text-green-800' : 'text-red-800') }, (m >= 0 ? '+ ' : '− ') + fmtMoney(Math.abs(m))),
                h('td', { className: 'pl-2 pr-5 py-2 text-right text-gray-600' }, fmtPct(pct(m, rec))),
              );
            })))),
        h('p', { className: 'text-[11px] text-gray-400' }, 'Tempo médio = 1ª solicitação → entrega (mediana entre parênteses). Redesp. = tentativas a mais que a corrida precisou; a corrida é atribuída ao provedor que entregou.'),
      ));

    // ── 2) ETA PROMETIDO × REAL ──
    const secEta = card('ETA prometido × real', 'clock', 'ETA = duração prevista que o próprio provedor devolve na cotação (99: delivery_duration · Uber: duration). Comparada com o tempo real da mesma tentativa (solicitação → entrega). Mede confiabilidade da promessa, não velocidade.',
      h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
        provs.filter(p => p.eta_avaliadas > 0).map(p => {
          const cumpriu = pct(p.eta_cumpriu, p.eta_avaliadas);
          const desvio = p.eta_desvio_min;
          const maxV = Math.max(parseFloat(p.eta_medio) || 0, parseFloat(p.real_tentativa_min) || 0, 1);
          return h('div', { key: p.provider, className: 'border border-gray-200 rounded-xl p-3 space-y-2' }, /* HUB_CLEAN_V1 */
            h('div', { className: 'flex items-center gap-2' },
              h('span', { className: 'inline-block w-2.5 h-2.5 rounded-full', style: { background: provCor(p.provider) } }),
              h('span', { className: 'font-bold text-sm text-gray-800' }, provNome(p.provider)),
              h('span', { className: 'ml-auto text-[10px] text-gray-400' }, `${p.eta_avaliadas} entregas com ETA`)),
            [['ETA prometido', p.eta_medio, '#d1d5db'], ['Tempo real', p.real_tentativa_min, provCor(p.provider)]].map(([l, v, cor]) => h('div', { key: l, className: 'flex items-center gap-2 text-[11px]' },
              h('span', { className: 'w-24 text-gray-500' }, l),
              h('div', { className: 'flex-1 h-2 bg-gray-100 rounded-full overflow-hidden' }, h('div', { className: 'h-full rounded-full', style: { width: `${((parseFloat(v) || 0) / maxV) * 100}%`, background: cor, minWidth: 2 } })),
              h('span', { className: 'w-14 text-right font-semibold text-gray-800' }, fmtMin(v)))),
            h('div', { className: 'flex items-start gap-4 pt-1 border-t border-gray-100' },
              h('div', { className: 'shrink-0' }, h('div', { className: 'text-xs text-gray-500 whitespace-nowrap' }, 'Cumpriu o ETA'), h('div', { className: 'text-lg font-bold tabular-nums whitespace-nowrap ' + (cumpriu >= 80 ? 'text-green-800' : cumpriu >= 60 ? 'text-amber-800' : 'text-red-800') }, fmtPct(cumpriu))),
              h('div', { className: 'shrink-0' }, h('div', { className: 'text-xs text-gray-500 whitespace-nowrap' }, 'Desvio médio'), h('div', { className: 'text-lg font-bold tabular-nums whitespace-nowrap ' + (desvio > 0 ? 'text-amber-800' : 'text-green-800') }, desvio == null ? '—' : (desvio > 0 ? '+' : '') + fmtMin(desvio))),
              h('div', { className: 'text-[11px] text-gray-500 leading-snug' },
                desvio > 5 ? 'Promete menos do que entrega — ETA otimista.'
                : desvio < -10 ? 'Promete com folga — cumpre quase sempre, mas a ETA superestima o tempo.'
                : cumpriu < 70 ? 'Promessa justa: na média bate, mas estoura em boa parte das corridas.'
                : 'Entrega dentro do que promete.')));
        }),
        !provs.some(p => p.eta_avaliadas > 0) && h('div', { className: 'text-sm text-gray-400 py-4 text-center md:col-span-2' }, 'Nenhuma entrega com ETA registrado no período.')));

    // ── 3) MOTIVOS DE CANCELAMENTO ──
    const motivos = an.motivos || [];
    const totalCanc = motivos.reduce((s, m) => s + m.total, 0);
    const porQuem = {}; motivos.forEach(m => { porQuem[m.por] = (porQuem[m.por] || 0) + m.total; });
    const QUEM_ROT = { operador: 'Operador (Tutts)', cliente: 'Cliente', provider: 'Provedor', fallback: 'Sem entregador', 'sem registro': 'Sem registro' };
    const secMotivos = card('Motivos de cancelamento', 'x', `${totalCanc} canceladas definitivas — cancelar pra redespachar não entra.`,
      !motivos.length ? h('div', { className: 'text-sm text-gray-400 py-4 text-center' }, 'Nenhum cancelamento definitivo no período.') :
      h('div', { className: 'space-y-3' },
        h('div', { className: 'flex flex-wrap gap-1.5' }, Object.entries(porQuem).sort((a, b) => b[1] - a[1]).map(([q, n]) => h('span', { key: q, className: 'text-[11px] font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-700' }, `${QUEM_ROT[q] || q} · ${n} (${fmtPct(pct(n, totalCanc))})`))),
        h('div', { className: 'space-y-1.5' }, motivos.slice(0, 10).map((m, i) => h('div', { key: i, className: 'flex items-center gap-2 text-xs' },
          h('span', { className: 'w-2 h-2 rounded-full shrink-0', style: { background: provCor(m.provider) }, title: provNome(m.provider) }),
          h('span', { className: 'w-40 shrink-0 truncate text-gray-700', title: m.motivo }, m.motivo),
          h('span', { className: 'w-20 shrink-0 text-[10px] text-gray-400 truncate' }, QUEM_ROT[m.por] || m.por),
          h('div', { className: 'flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden' }, h('div', { className: 'h-full rounded-full bg-red-600', style: { width: `${pct(m.total, motivos[0].total)}%`, minWidth: 2 } })),
          h('span', { className: 'w-16 text-right font-semibold text-gray-900 tabular-nums' }, `${m.total} `, h('span', { className: 'text-gray-400 font-normal' }, `(${fmtPct(pct(m.total, totalCanc))})`))))),
        motivos.length > 10 && h('p', { className: 'text-[10px] text-gray-400' }, `+${motivos.length - 10} motivos menores.`)));

    // ── 4) PARCEIROS: frequentes × novos × ocasionais, por provedor ──
    const parc = an.parceiros || [];
    const TIPO = { frequente: { rot: 'Parceiros frequentes', cor: '#770fa8', d: '> 3 entregas nos 30 dias antes do fim do período' }, ocasional: { rot: 'Ocasionais', cor: '#9ca3af', d: 'já entregaram antes, mas não são frequentes' }, novo: { rot: 'Motos novas', cor: '#16a34a', d: '1ª entrega com a gente caiu no período' }, sem_id: { rot: 'Sem identificação', cor: '#e5e7eb', d: 'provedor não mandou telefone do entregador' } };
    const ORDEM = ['frequente', 'ocasional', 'novo', 'sem_id'];
    const agrupa = (lista) => { const o = {}; ORDEM.forEach(t => { o[t] = { entregas: 0, motoboys: 0 }; }); lista.forEach(p => { if (o[p.tipo]) { o[p.tipo].entregas += p.entregas; o[p.tipo].motoboys += p.motoboys; } }); return o; };
    const barraParc = (titulo, lista, cor) => { const g = agrupa(lista); const tot = ORDEM.reduce((s, t) => s + g[t].entregas, 0); if (!tot) return null;
      return h('div', { key: titulo, className: 'space-y-1.5' },
        h('div', { className: 'flex items-center gap-2 text-xs' }, cor && h('span', { className: 'inline-block w-2.5 h-2.5 rounded-full', style: { background: cor } }), h('span', { className: 'font-bold text-gray-800' }, titulo), h('span', { className: 'text-gray-400' }, `· ${tot} entregas`)),
        h('div', { className: 'flex h-6 rounded-md overflow-hidden gap-0.5' }, ORDEM.filter(t => g[t].entregas).map(t => h('div', { key: t, className: 'flex items-center justify-center text-[10px] font-bold', style: { width: `${pct(g[t].entregas, tot)}%`, background: TIPO[t].cor, color: t === 'sem_id' || t === 'ocasional' ? '#374151' : '#fff', minWidth: 28 }, onMouseMove: onMove([TIPO[t].rot, `${g[t].entregas} entregas (${fmtPct(pct(g[t].entregas, tot))}) · ${g[t].motoboys} motoboys`, TIPO[t].d]), onMouseLeave: offHover }, fmtPct(pct(g[t].entregas, tot))))));
    };
    const provsParc = [...new Set(parc.map(p => p.provider))];
    const secParceiros = card('Parceiros frequentes × motos novas', 'users', 'Quem está entregando: proporção das entregas feitas por parceiros frequentes, motos novas e ocasionais. Mesma régua da aba Frequentes.',
      !parc.length ? h('div', { className: 'text-sm text-gray-400 py-4 text-center' }, 'Sem entregas concluídas no período.') :
      h('div', { className: 'space-y-4' },
        barraParc('Todos os provedores', parc, null),
        provsParc.length > 1 && h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100' }, provsParc.map(pv => barraParc(provNome(pv), parc.filter(p => p.provider === pv), provCor(pv)))),
        h('div', { className: 'flex flex-wrap gap-3 text-[10px] text-gray-500' }, ORDEM.map(t => h('span', { key: t, className: 'inline-flex items-center gap-1' }, h('span', { className: 'w-2.5 h-2.5 rounded-sm', style: { background: TIPO[t].cor } }), `${TIPO[t].rot} — ${TIPO[t].d}`)))));

    // ── 5) TENDÊNCIA DIÁRIA ──
    const dias = an.por_dia || [];
    const secTendencia = (function () {
      if (!dias.length) return card('Tendência diária', 'trendup', null, h('div', { className: 'text-sm text-gray-400 py-4 text-center' }, 'Sem dados.'));
      const W = 900, HB = 120, HL = 70, padL = 34, padR = 8, n = dias.length, bw = (W - padL - padR) / n;
      const maxC = Math.max(...dias.map(d => d.corridas), 1);
      const fmtDia = (s) => s.slice(8, 10) + '/' + s.slice(5, 7);
      const passo = n > 20 ? Math.ceil(n / 12) : 1;
      const x = (i) => padL + i * bw;
      const pts = dias.map((d, i) => d.pct_no_prazo == null ? null : [x(i) + bw / 2, HL - 6 - (d.pct_no_prazo / 100) * (HL - 14)]);
      const path = pts.reduce((acc, p, i) => p ? acc + (acc && pts[i - 1] ? ' L' : ' M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1) : acc, '');
      return card('Tendência diária', 'trendup', 'Corridas por dia (entregues em roxo, o resto em cinza) e % no prazo. Um gráfico por medida — sem eixo duplo.',
        h('div', { className: 'space-y-2' },
          h('div', { className: 'text-xs text-gray-500' }, 'Corridas por dia'),
          h('svg', { viewBox: `0 0 ${W} ${HB + 18}`, className: 'w-full', style: { height: 150 } },
            [0.5, 1].map(f => h('g', { key: f }, h('line', { x1: padL, x2: W - padR, y1: HB - f * (HB - 10), y2: HB - f * (HB - 10), stroke: '#f3f4f6' }), h('text', { x: padL - 4, y: HB - f * (HB - 10) + 3, fontSize: 9, fill: '#9ca3af', textAnchor: 'end' }, Math.round(maxC * f)))),
            h('line', { x1: padL, x2: W - padR, y1: HB, y2: HB, stroke: '#e5e7eb' }),
            dias.map((d, i) => { const hT = (d.corridas / maxC) * (HB - 10), hE = (d.entregues / maxC) * (HB - 10); return h('g', { key: d.dia, onMouseMove: onMove([fmtDia(d.dia), `${d.corridas} corridas · ${d.entregues} entregues · ${d.canceladas} canceladas`, `no prazo ${fmtPct(d.pct_no_prazo)} · tempo médio ${fmtMin(d.t_total_min)}`, `margem ${fmtMoney(d.margem)}`]), onMouseLeave: offHover },
              h('rect', { x: x(i) + bw * 0.15, y: HB - hT, width: Math.max(bw * 0.7, 2), height: hT, fill: '#e5e7eb', rx: 3 }),
              h('rect', { x: x(i) + bw * 0.15, y: HB - hE, width: Math.max(bw * 0.7, 2), height: hE, fill: '#770fa8', rx: 3 }),
              (i % passo === 0) && h('text', { x: x(i) + bw / 2, y: HB + 13, fontSize: 9, fill: '#6b7280', textAnchor: 'middle' }, fmtDia(d.dia))); })),
          h('div', { className: 'text-xs text-gray-500 pt-1' }, '% no prazo por dia'),
          h('svg', { viewBox: `0 0 ${W} ${HL}`, className: 'w-full', style: { height: 80 } },
            [0, 50, 100].map(v => h('g', { key: v }, h('line', { x1: padL, x2: W - padR, y1: HL - 6 - (v / 100) * (HL - 14), y2: HL - 6 - (v / 100) * (HL - 14), stroke: v === 100 ? '#e5e7eb' : '#f3f4f6', strokeDasharray: v === 50 ? '3 3' : null }), h('text', { x: padL - 4, y: HL - 6 - (v / 100) * (HL - 14) + 3, fontSize: 9, fill: '#9ca3af', textAnchor: 'end' }, v + '%'))),
            path && h('path', { d: path, fill: 'none', stroke: '#16a34a', strokeWidth: 2, strokeLinejoin: 'round' }),
            pts.map((p, i) => p && h('circle', { key: i, cx: p[0], cy: p[1], r: 4, fill: '#fff', stroke: '#16a34a', strokeWidth: 2, onMouseMove: onMove([fmtDia(dias[i].dia), `${fmtPct(dias[i].pct_no_prazo)} no prazo · ${dias[i].avaliadas} avaliadas`]), onMouseLeave: offHover })))));
    })();

    // ── 6) MAPA DE CALOR hora × dia ──
    const heat = an.mapa_calor || [];
    const secHeat = (function () {
      if (!heat.length) return card('Quando estoura', 'calendar', null, h('div', { className: 'text-sm text-gray-400 py-4 text-center' }, 'Sem dados.'));
      const idx = {}; heat.forEach(c => { idx[c.dow + '-' + c.hora] = c; });
      const horas = []; for (let hh = 0; hh < 24; hh++) if (heat.some(c => c.hora === hh)) horas.push(hh);
      const hMin = Math.max(0, Math.min(...horas) - 0), hMax = Math.max(...horas); const hs = []; for (let hh = hMin; hh <= hMax; hh++) hs.push(hh);
      const val = (c) => !c ? null : heatMetrica === 'corridas' ? c.corridas : heatMetrica === 'pct_no_prazo' ? c.pct_no_prazo : c.t_total_min;
      const vals = heat.map(val).filter(v => v != null); const vMax = Math.max(...vals, 1), vMin = Math.min(...vals, 0);
      // sequencial: um tom (roxo) claro → escuro; pra % no prazo, inverte (baixo = escuro = ruim)
      const cor = (v) => { if (v == null) return '#f9fafb'; let t = vMax === vMin ? 1 : (v - vMin) / (vMax - vMin); if (heatMetrica === 'pct_no_prazo') t = 1 - t; const L = 96 - t * 58; return `hsl(281 62% ${L}%)`; }; /* HUB_CLEAN_V1: matiz do Roxo Tutts */
      const fmtV = (c) => !c ? '' : heatMetrica === 'corridas' ? c.corridas : heatMetrica === 'pct_no_prazo' ? fmtPct(c.pct_no_prazo) : fmtMin(c.t_total_min);
      const seletor = h('div', { role: 'group', 'aria-label': 'Métrica do mapa', className: 'flex gap-1 bg-gray-100 rounded-[10px] p-[3px] text-xs' }, [['corridas', 'Volume'], ['pct_no_prazo', '% no prazo'], ['t_total_min', 'Tempo médio']].map(([k, r]) => h('button', { key: k, type: 'button', 'aria-pressed': heatMetrica === k, onClick: () => setHeatMetrica(k), className: `px-2.5 py-1 rounded-lg ${heatMetrica === k ? 'bg-white text-gray-900 font-semibold' : 'text-gray-500'}` }, r)));
      return card('Quando estoura: hora × dia da semana', 'calendar', 'Corridas pela hora da 1ª solicitação (horário de Brasília). Mais escuro = mais volume / mais tempo; em "% no prazo", mais escuro = pior.',
        h('div', { className: 'overflow-x-auto' },
          h('table', { className: 'text-[10px] border-separate', style: { borderSpacing: 2 } },
            h('thead', null, h('tr', null, h('th', { className: 'text-left text-gray-400 font-semibold pr-1' }, ''), hs.map(hh => h('th', { key: hh, className: 'text-gray-400 font-semibold w-8 text-center' }, String(hh).padStart(2, '0'))))),
            h('tbody', null, [1, 2, 3, 4, 5, 6, 0].map(dw => h('tr', { key: dw },
              h('td', { className: 'text-gray-500 font-semibold pr-1 whitespace-nowrap' }, DOW[dw]),
              hs.map(hh => { const c = idx[dw + '-' + hh]; return h('td', { key: hh, className: 'w-8 h-7 rounded text-center font-semibold', style: { background: cor(val(c)), color: c && ((heatMetrica === 'pct_no_prazo' ? 1 - ((val(c) - vMin) / Math.max(vMax - vMin, 1)) : (val(c) - vMin) / Math.max(vMax - vMin, 1)) > 0.55) ? '#fff' : '#374151' },
                onMouseMove: c ? onMove([`${DOW[dw]} ${String(hh).padStart(2, '0')}h`, `${c.corridas} corridas · ${c.entregues} entregues · ${c.canceladas} canceladas`, `no prazo ${fmtPct(c.pct_no_prazo)} (${c.avaliadas} avaliadas) · tempo médio ${fmtMin(c.t_total_min)}`]) : null, onMouseLeave: offHover }, fmtV(c)); })))))),
        seletor);
    })();

    // HUB_MENU_SECOES_V1: ids das seções pro menu lateral
    return h(React.Fragment, null,
      h('div', { id: 'hub-provedores', className: 'scroll-mt-24' }, secProvedores),
      h('div', { id: 'hub-eta', className: 'grid grid-cols-1 lg:grid-cols-2 gap-4 scroll-mt-24' }, secEta, secMotivos),
      h('div', { id: 'hub-parceiros', className: 'scroll-mt-24' }, secParceiros),
      h('div', { id: 'hub-tendencia', className: 'scroll-mt-24' }, secTendencia),
      h('div', { id: 'hub-heat', className: 'scroll-mt-24' }, secHeat),
      tip);
  }

  // ════════════════════════════════════════════════════════
  // HUB_MENU_SECOES_V1 — menu lateral de seções do Dashboard (mesmo padrão do
  // Análise Gerencial): sticky, destaca a seção visível, rola suave ao clicar.
  // ════════════════════════════════════════════════════════
  const HUB_SECOES = [
    { id: 'hub-kpis', rotulo: 'KPIs do período' },
    { id: 'hub-tempo', rotulo: 'Tempo e SLA' },
    { id: 'hub-financeiro', rotulo: 'Financeiro' },
    { id: 'hub-margem', rotulo: 'Margem por cliente' },
    { id: 'hub-provedores', rotulo: 'Provedores' },
    { id: 'hub-eta', rotulo: 'ETA e cancelamentos' },
    { id: 'hub-parceiros', rotulo: 'Parceiros e motos novas' },
    { id: 'hub-tendencia', rotulo: 'Tendência diária' },
    { id: 'hub-heat', rotulo: 'Hora × dia da semana' },
  ];
  function MenuSecoesHub({ de, ate, total }) {
    const [ativa, setAtiva] = useState(HUB_SECOES[0].id);
    useEffect(() => {
      const aoRolar = () => {
        let melhor = null, menor = Infinity;
        HUB_SECOES.forEach(sec => { const el = document.getElementById(sec.id); if (!el) return; const d = Math.abs(el.getBoundingClientRect().top - 96); if (d < menor) { menor = d; melhor = sec.id; } });
        // no fim da página a última seção nunca chega ao topo: marca ela
        if ((window.innerHeight + (window.pageYOffset || document.documentElement.scrollTop)) >= document.documentElement.scrollHeight - 8) melhor = HUB_SECOES[HUB_SECOES.length - 1].id;
        if (melhor) setAtiva(melhor);
      };
      aoRolar();
      window.addEventListener('scroll', aoRolar, { passive: true }); window.addEventListener('resize', aoRolar);
      return () => { window.removeEventListener('scroll', aoRolar); window.removeEventListener('resize', aoRolar); };
    }, []);
    const irPara = (e, id) => { e.preventDefault(); const el = document.getElementById(id); if (!el) return; const topo = el.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop) - 84; window.scrollTo({ top: topo, behavior: 'smooth' }); setAtiva(id); };
    const fmtD = (s) => s ? s.slice(8, 10) + '/' + s.slice(5, 7) : '';
    /* HUB_CLEAN_V1: menu de seções como lista simples (sem card/fundo), ativo em roxo */
    return h('nav', { 'aria-label': 'Seções do dashboard', title: de === ate ? fmtD(de) : `${fmtD(de)} – ${fmtD(ate)}${total != null ? ` · ${total} corridas` : ''}`, className: 'w-full lg:w-52 flex-shrink-0 lg:sticky lg:top-[82px] lg:max-h-[calc(100vh-98px)] lg:overflow-y-auto' },
      h('div', { className: 'px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400' }, 'Seções'),
      h('div', { className: 'flex flex-row flex-wrap lg:flex-col gap-0.5' }, HUB_SECOES.map(sec => { const on = ativa === sec.id; return h('a', { key: sec.id, href: '#' + sec.id, onClick: (e) => irPara(e, sec.id), 'aria-current': on ? 'true' : undefined,
        className: 'block px-3 py-1.5 text-[13px] no-underline border-l-2 transition-colors ' + (on ? 'border-purple-700 text-purple-800 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-800') }, sec.rotulo); })));
  }

  function TabDashboard({ API_URL, fetchAuth, showToast }) {
    const [data, setData] = useState(null);
    const [sla, setSla] = useState(null);
    const [margemData, setMargemData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [margemLoading, setMargemLoading] = useState(false);
    const [finRel, setFinRel] = useState(undefined);        // HUB_FIN_REGRA_V1: undefined = carregando, null = erro
    const [periodo, setPeriodo] = useState('7d');           // 1d | 7d | 30d | custom

    const hojeBRT   = () => dataLocalBRT(new Date());
    const diasAtras = (nd) => dataLocalBRT(new Date(Date.now() - nd * 86400000));
    const [deCustom, setDeCustom]   = useState(diasAtras(7));
    const [ateCustom, setAteCustom] = useState(hojeBRT());

    const range = periodo === 'custom' ? { de: deCustom, ate: ateCustom }
      : periodo === '1d'  ? { de: hojeBRT(),    ate: hojeBRT() }
      : periodo === '30d' ? { de: diasAtras(29), ate: hojeBRT() }
      :                     { de: diasAtras(6),  ate: hojeBRT() };
    const de = range.de, ate = range.ate;

    const carregar = useCallback(async () => {
      setLoading(true);
      try {
        const res = await fetchAuth(`${API_URL}/logistics/dashboard/metricas?data_inicio=${de}&data_fim=${ate}`);
        const json = await res.json();
        setData(json.metricas || {});
        setSla(json.sla || null);
      } catch { showToast('Erro ao carregar métricas', 'error'); }
      finally { setLoading(false); }
    }, [fetchAuth, API_URL, de, ate]);

    const carregarMargem = useCallback(async () => {
      setMargemLoading(true);
      try {
        const res = await fetchAuth(`${API_URL}/logistics/dashboard/margem-clientes?periodo=custom&inicio=${de}&fim=${ate}`);
        const json = await res.json();
        if (json.success) setMargemData(json);
        else showToast(json.error || 'Erro ao carregar margem', 'error');
      } catch { showToast('Erro de rede ao carregar margem', 'error'); }
      finally { setMargemLoading(false); }
    }, [fetchAuth, API_URL, de, ate]);

    useEffect(() => { carregar(); }, [carregar]);
    useEffect(() => { carregarMargem(); }, [carregarMargem]);
    // HUB_FIN_REGRA_V1: financeiro a partir das linhas do Relatório (Entregue + Devolvido)
    useEffect(() => {
      let vivo = true; setFinRel(undefined);
      (async () => {
        try {
          const res = await fetchAuth(`${API_URL}/admin/relatorio/hub-corridas?de=${de}&ate=${ate}`);
          const json = await res.json();
          if (!vivo) return;
          if (!json.success) { setFinRel(null); return; }
          // HUB_FIN_REGRA_V11: o relatório injeta as corridas de MOTO PRÓPRIA (provider 'proprio',
          // is_moto_propria) — elas não são do Hub e ficam FORA do dashboard (sem custo de provedor,
          // sem valor Mapp; entravam com margem zero e diluíam o ticket). Também sai o que não tem
          // valor de regra (ex.: entregue com cancelado_por preenchido → valor null).
          const todas = (json.corridas || []).filter(c => (c.status === 'Entregue' || c.status === 'Devolvido') && !c.is_moto_propria && String(c.provider || '').toLowerCase() !== 'proprio' && c.valor_origem !== 'moto_propria');
          const num = (v) => (v == null || isNaN(parseFloat(v)) ? null : parseFloat(v));
          const rows = todas.filter(c => num(c.valor) != null);
          const semValor = todas.length - rows.length;
          let mapp = 0, semMapp = 0, prov = 0, regra = 0, margem = 0; const orig = {};
          rows.forEach(c => {
            const vm = num(c.valor_mapp), vp = num(c.custo_provedor), vr = num(c.valor);
            if (vm == null) semMapp++; else mapp += vm;
            if (vp != null) prov += vp;
            if (vr != null) regra += vr;
            margem += (vr || 0) - (vp || 0);
            if (c.valor_origem) orig[c.valor_origem] = (orig[c.valor_origem] || 0) + 1;
          });
          const ORIG_ROT = { regra: 'regra', cliente: 'tabela do cliente', global: 'tabela global', mapp: 'valor Mapp', indefinido: 'indefinido' };
          const origens = Object.entries(orig).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n} ${ORIG_ROT[k] || k}`).join(', ');
          setFinRel({ n: rows.length, semValor, mapp, semMapp, prov, regra, regraDif: regra - mapp, margem, ticket: rows.length ? margem / rows.length : 0, origens });
        } catch (e) { if (vivo) setFinRel(null); }
      })();
      return () => { vivo = false; };
    }, [fetchAuth, API_URL, de, ate]);

    if (loading || !data) return h('div', { className: 'flex items-center justify-center py-16' },
      h('div', { className: 'animate-spin w-10 h-10 border-4 border-purple-700 border-t-transparent rounded-full' })
    );

    const ni = (x) => parseInt(x || 0, 10);
    const fmtMin = (m) => {
      const v = parseFloat(m);
      if (m == null || m === '' || isNaN(v)) return '—';
      const r = Math.round(v);
      return r < 60 ? r + ' min' : Math.floor(r / 60) + 'h' + (r % 60 ? ' ' + (r % 60) + 'min' : '');
    };

    const total = ni(data.total), entregues = ni(data.entregues), emand = ni(data.em_andamento), cancel = ni(data.cancelados);
    const tLoc = data.t_localizacao_min, tCol = data.t_coleta_min, tRota = data.t_rota_min, tTot = data.t_total_min;
    const somaEst = Math.max(1, (parseFloat(tLoc) || 0) + (parseFloat(tCol) || 0) + (parseFloat(tRota) || 0));
    const pctNP = (sla && sla.pct_no_prazo != null) ? sla.pct_no_prazo : null;

    const pills = [['1d', 'Hoje'], ['7d', '7 dias'], ['30d', '30 dias'], ['custom', 'Período']];

    // HUB_CLEAN_V1: dashboard no padrão clean (cards brancos, borda #e5e7eb, raio 14,
    // sem sombra, sem gradiente, sem caixa de ícone colorida). Mesmos dados/estados.
    const SORA = { fontFamily: 'Sora, Inter, sans-serif' };
    const cardCls = 'bg-white border border-gray-200 rounded-[14px]';
    const fmtDm = (s) => s ? s.slice(8, 10) + '/' + s.slice(5, 7) : '';
    const periodoTxt = de === ate ? fmtDm(de) : `${fmtDm(de)} a ${fmtDm(ate)}`;
    const pillPrazo = (np) => {
      const t = np >= 80 ? ['bg-green-50 text-green-800', 'bg-green-600'] : np >= 60 ? ['bg-amber-50 text-amber-800', 'bg-amber-600'] : ['bg-red-50 text-red-800', 'bg-red-600'];
      return h('span', { className: `inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${t[0]}` },
        h('span', { className: `w-1.5 h-1.5 rounded-full ${t[1]}` }), `${np.toFixed(0)}%`);
    };
    const kpis = [
      // HUB_DASH_OS_V1: contagem por CORRIDA (OS). Redespacho nao infla total/cancelados.
      { lbl: 'Total de corridas', val: total, foot: data.tentativas_total != null ? `${ni(data.tentativas_total)} tentativas · ${ni(data.redespachos)} redespachos em ${ni(data.os_redespachadas)} corridas` : null },
      { lbl: 'Entregues', val: entregues, cor: 'text-green-800', foot: total ? `${(entregues / total * 100).toFixed(0)}% do total${ni(data.devolvidos) ? ` · ${ni(data.devolvidos)} devolvida${ni(data.devolvidos) > 1 ? 's' : ''}` : ''}` : null },
      { lbl: 'Em andamento', val: emand, foot: `${ni(data.and_procurando)} buscando · ${ni(data.and_coletar)} p/ coletar · ${ni(data.and_rota)} em rota` },
      { lbl: 'Canceladas', val: cancel, cor: cancel ? 'text-red-800' : null, foot: total ? `${(cancel / total * 100).toFixed(0)}% · ${ni(data.fallback)} fallback · só cancelamento definitivo` : null },
      // HUB_DASH_ANALITICO_V1: KPI de destaque — tempo médio de entrega (1ª solicitação → entrega, só entregues)
      { lbl: 'Tempo médio de entrega', val: fmtMin(tTot), foot: data.t_total_mediana_min != null ? `mediana ${fmtMin(data.t_total_mediana_min)} · ${ni(data.n_trilha)} entregues` : null },
    ];
    const segs = [
      { v: tLoc, c: '#c084e6', l: 'Localização', md: data.t_localizacao_mediana_min, d: '1ª solicitação → entregador' },
      { v: tCol, c: '#770fa8', l: 'Coleta', md: data.t_coleta_mediana_min, d: 'atribuição → coleta' },
      { v: tRota, c: '#3a1556', l: 'Entrega', md: data.t_rota_mediana_min, d: 'coleta → entrega' },
    ];
    const temSeg = segs.some(s => parseFloat(s.v) > 0);
    const celSla = (rot, val, cor) => h('div', { key: rot },
      h('div', { className: 'text-xs text-gray-500' }, rot),
      h('div', { className: `text-lg font-bold tabular-nums ${cor || 'text-gray-900'}` }, val));

    return h('div', { className: 'max-w-[1500px] mx-auto px-4 py-5 md:px-6 md:py-6 space-y-4' },
      // HEADER
      h('div', { className: 'flex items-end justify-between flex-wrap gap-3' },
        h('div', null,
          h('h1', { className: 'text-2xl font-bold text-gray-900', style: Object.assign({ letterSpacing: '-0.01em' }, SORA) }, 'Dashboard do Hub'),
          h('p', { className: 'text-sm text-gray-500 mt-1' }, `${periodoTxt} · ${total} corrida${total !== 1 ? 's' : ''}`),
        ),
        h('div', { className: 'flex items-center gap-2 flex-wrap' },
          h('div', { role: 'group', 'aria-label': 'Período', className: 'inline-flex bg-gray-100 rounded-[10px] p-[3px]' },
            pills.map(([p, lbl]) => h('button', { key: p, type: 'button', onClick: () => setPeriodo(p), 'aria-pressed': periodo === p,
              className: `px-3 py-1.5 text-[13px] rounded-lg ${periodo === p ? 'bg-white text-gray-900 font-semibold' : 'text-gray-500 hover:text-gray-800'}` }, lbl)),
          ),
          periodo === 'custom' && h('div', { className: 'flex items-center gap-1.5' },
            h('input', { type: 'date', 'aria-label': 'Data inicial', value: deCustom, onChange: e => setDeCustom(e.target.value), className: 'h-[38px] px-2.5 border border-gray-200 rounded-[10px] text-[13px] text-gray-700 bg-white' }),
            h('span', { className: 'text-gray-400 text-xs' }, 'até'),
            h('input', { type: 'date', 'aria-label': 'Data final', value: ateCustom, onChange: e => setAteCustom(e.target.value), className: 'h-[38px] px-2.5 border border-gray-200 rounded-[10px] text-[13px] text-gray-700 bg-white' }),
          ),
          h('button', { type: 'button', onClick: () => { carregar(); carregarMargem(); }, className: 'h-[38px] px-3.5 inline-flex items-center gap-2 bg-white border border-gray-200 rounded-[10px] text-[13px] font-semibold text-gray-700 hover:bg-gray-50' },
            h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-refresh' })), 'Atualizar'),
        ),
      ),

      // HUB_MENU_SECOES_V1: menu lateral + conteúdo
      h('div', { className: 'flex flex-col lg:flex-row gap-6 items-start' },
      h(MenuSecoesHub, { de, ate, total }),
      h('div', { className: 'flex-1 min-w-0 w-full space-y-4' },
      // KPIs
      h('div', { id: 'hub-kpis', className: 'grid grid-cols-2 md:grid-cols-5 gap-3 scroll-mt-24' },
        kpis.map(k => h('div', { key: k.lbl, className: cardCls + ' p-4 flex flex-col gap-1.5 min-w-0' },
          h('span', { className: 'text-xs text-gray-500' }, k.lbl),
          h('span', { className: 'text-[28px] leading-tight font-bold tabular-nums ' + (k.cor || 'text-gray-900'), style: Object.assign({ letterSpacing: '-0.01em' }, SORA) }, k.val),
          k.foot && h('span', { className: 'text-[11.5px] text-gray-500 leading-snug' }, k.foot),
        )),
      ),

      // TEMPO + SLA
      h('div', { id: 'hub-tempo', className: 'grid grid-cols-1 lg:grid-cols-5 gap-3 scroll-mt-24' },
        h('section', { className: cardCls + ' lg:col-span-3 p-5 flex flex-col gap-4 min-w-0' },
          h('div', null,
            h('h2', { className: 'text-[15px] font-semibold text-gray-900' }, 'Desempenho de tempo'),
            h('p', { className: 'text-xs text-gray-500 mt-1' }, `Tempo médio de cada etapa nas ${ni(data.n_trilha)} corridas entregues, contado desde a 1ª solicitação — redespacho não zera o relógio. Mediana entre parênteses.`),
          ),
          h('div', { className: 'flex h-2.5 rounded-full overflow-hidden gap-0.5 bg-gray-100', role: 'img', 'aria-label': segs.map(s => `${s.l} ${fmtMin(s.v)}`).join(', ') },
            temSeg && segs.filter(s => parseFloat(s.v) > 0).map(s => h('div', { key: s.l, title: `${s.l}: ${fmtMin(s.v)}`, style: { flex: parseFloat(s.v), background: s.c } })),
          ),
          h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3' },
            segs.map(t => h('div', { key: t.l, className: 'min-w-0' },
              h('div', { className: 'flex items-center gap-1.5 text-xs text-gray-500' }, h('span', { className: 'inline-block w-2 h-2 rounded-sm', style: { background: t.c } }), t.l),
              h('div', { className: 'text-xl font-bold text-gray-900 tabular-nums mt-1' }, fmtMin(t.v), t.md != null && h('span', { className: 'text-xs font-medium text-gray-400 ml-1' }, `(${fmtMin(t.md)})`)),
              h('div', { className: 'text-[11px] text-gray-400' }, t.d),
            )).concat([
              h('div', { key: 'total', className: 'min-w-0 md:pl-3 md:border-l border-gray-100' },
                h('div', { className: 'text-xs text-gray-500' }, 'Tempo total'),
                h('div', { className: 'text-xl font-bold text-purple-800 tabular-nums mt-1' }, fmtMin(tTot), data.t_total_mediana_min != null && h('span', { className: 'text-xs font-medium text-gray-400 ml-1' }, `(${fmtMin(data.t_total_mediana_min)})`)),
                h('div', { className: 'text-[11px] text-gray-400' }, '1ª solicitação → entrega'),
              ),
            ]),
          ),
        ),
        h('section', { className: cardCls + ' lg:col-span-2 p-5 flex flex-wrap items-center gap-5 min-w-0' },
          h('div', { className: 'flex-none grid place-items-center rounded-full', role: 'img', 'aria-label': pctNP != null ? `${pctNP.toFixed(0)}% no prazo` : 'sem dados de prazo',
            style: { width: 116, height: 116, background: pctNP != null ? `conic-gradient(#16a34a 0 ${pctNP}%, #f3f4f6 ${pctNP}% 100%)` : '#f3f4f6' } },
            h('div', { className: 'grid place-items-center rounded-full bg-white text-center', style: { width: 92, height: 92 } },
              h('div', null,
                h('div', { className: 'text-2xl font-bold text-gray-900 tabular-nums', style: SORA }, pctNP != null ? `${pctNP.toFixed(0)}%` : '—'),
                h('div', { className: 'text-[10.5px] text-gray-500' }, 'no prazo'))),
          ),
          h('div', { className: 'flex-1 min-w-[180px] grid grid-cols-2 gap-3.5' },
            h('div', { className: 'col-span-2' },
              h('h2', { className: 'text-[15px] font-semibold text-gray-900' }, 'SLA / Prazo'),
              h('p', { className: 'text-[11.5px] text-gray-500 mt-1' }, `Prazo pela distância, contado da 1ª solicitação · ${sla ? sla.total_avaliado : 0} entregues avaliadas${sla && sla.sem_km ? ` · ${sla.sem_km} sem km` : ''}.`)),
            celSla('No prazo', sla ? sla.no_prazo : 0),
            celSla('Fora do prazo', sla ? sla.fora : 0, (sla && sla.fora) ? 'text-red-800' : null),
            celSla('Atraso médio', (sla && sla.fora) ? '+' + fmtMin(sla.atraso_medio_min) : '—'),
            celSla('ETA do provedor', `${Math.round(parseFloat(data.eta_medio || 0))} min`),
          ),
        ),
      ),

      // FINANCEIRO — HUB_FIN_REGRA_V1
      // Fonte: as MESMAS linhas do Relatório (/admin/relatorio/hub-corridas), só Entregue + Devolvido.
      // Assim o Dashboard bate com o Relatório por construção:
      //   Valor Mapp   = valor original da OS na Mapp (valor_servico_mapp_original)
      //   Provedor     = custo final da 99 (com taxas) ou a cotação (Uber)
      //   Regra        = valor do Hub pela tabela (regra do cliente → cliente → global → Mapp)
      //   Margem       = regra − provedor · Ticket médio = margem ÷ corridas
      h('div', { id: 'hub-financeiro', className: 'scroll-mt-24' }, (function () {
        if (finRel === undefined) return h('div', { className: cardCls + ' p-4 flex items-center gap-2 text-xs text-gray-500' }, h('div', { className: 'animate-spin w-4 h-4 border-2 border-purple-700 border-t-transparent rounded-full' }), 'Calculando financeiro pelas linhas do Relatório...');
        if (finRel === null) return h('div', { className: 'bg-red-50 border border-red-200 text-red-800 text-xs rounded-[14px] p-4' }, 'Não deu pra carregar o financeiro (relatório indisponível). Tente Atualizar.');
        const f = finRel;
        const cells = [
          { l: 'Valor Mapp', v: fmtMoney(f.mapp), s: `${f.n} corridas do Hub faturáveis${f.semMapp ? ` · ${f.semMapp} sem valor Mapp` : ''}${f.semValor ? ` · ${f.semValor} sem valor (fora)` : ''}` },
          { l: 'Valor provedor', v: fmtMoney(f.prov), s: `média ${fmtMoney(f.n ? f.prov / f.n : 0)} por corrida` },
          { l: 'Valor com regra aplicada', v: fmtMoney(f.regra), s: `${f.regraDif >= 0 ? '+' : '−'} ${fmtMoney(Math.abs(f.regraDif))} vs Mapp${f.origens ? ' · ' + f.origens : ''}` },
          { l: 'Margem (regra − provedor)', v: (f.margem >= 0 ? '+ ' : '− ') + fmtMoney(Math.abs(f.margem)), c: f.margem >= 0 ? 'text-green-800' : 'text-red-800', s: f.regra ? `${((f.margem / f.regra) * 100).toFixed(1)}% do valor com regra` : null },
          { l: 'Ticket médio da margem', v: (f.ticket >= 0 ? '+ ' : '− ') + fmtMoney(Math.abs(f.ticket)), c: f.ticket >= 0 ? 'text-green-800' : 'text-red-800', s: `(regra − provedor) ÷ ${f.n} corridas · ticket cliente ${fmtMoney(f.n ? f.regra / f.n : 0)}` },
        ];
        return h('section', { className: cardCls + ' grid grid-cols-2 md:grid-cols-5 overflow-hidden', 'aria-label': 'Financeiro' },
          cells.map((c, i) => h('div', { key: c.l, className: 'px-[18px] py-4 min-w-0 border-gray-100 ' + (i < cells.length - 1 ? 'border-b md:border-b-0 md:border-r' : '') },
            h('div', { className: 'text-xs text-gray-500' }, c.l),
            h('div', { className: `text-lg font-bold mt-1 tabular-nums ${c.c || 'text-gray-900'}` }, c.v),
            c.s && h('div', { className: 'text-[11px] text-gray-400 mt-1 leading-snug' }, c.s))));
      })()),

      // MARGEM POR CLIENTE
      h('section', { id: 'hub-margem', className: cardCls + ' overflow-hidden scroll-mt-24' },
        h('div', { className: 'px-5 pt-4 pb-3' },
          h('h2', { className: 'text-[15px] font-semibold text-gray-900' }, 'Margem por cliente'),
          h('p', { className: 'text-xs text-gray-500 mt-1' }, 'Quanto cada cliente rende quando despachado pelo hub. Por corrida (OS): receita e custo só do que fatura (entregue + devolvida), custo da tentativa final. Margem = valor cliente − custo do provedor.'),
        ),
        margemLoading
          ? h('div', { className: 'text-center py-10' }, h('div', { className: 'animate-spin w-7 h-7 border-4 border-purple-700 border-t-transparent rounded-full mx-auto' }))
          : (!margemData || !margemData.por_cliente || margemData.por_cliente.length === 0)
            ? h('div', { className: 'text-center py-10 px-5' }, h('p', { className: 'text-sm font-semibold text-gray-700' }, 'Nenhuma entrega no período'), h('p', { className: 'text-xs text-gray-500 mt-1' }, 'Escolha outro período acima para ver a margem por cliente.'))
            : h('div', null,
                (margemData.por_dia && margemData.por_dia.length > 0) && (function () {
                  const porDia = margemData.por_dia;
                  const maxAbs = Math.max(1, ...porDia.map(d => Math.abs(parseFloat(d.margem || 0))));
                  return h('div', { className: 'px-5 pb-4' },
                    h('div', { className: 'text-xs text-gray-500 mb-2' }, `Margem por dia (${porDia.length} dia${porDia.length !== 1 ? 's' : ''})`),
                    h('div', { className: 'flex items-end gap-1 h-20 border-b border-gray-200' },
                      porDia.map((d, i) => {
                        const v = parseFloat(d.margem || 0), pos = v >= 0, pc = (Math.abs(v) / maxAbs) * 100;
                        return h('div', { key: i, className: 'flex-1 flex flex-col justify-end h-full', title: `${new Date(d.dia).toLocaleDateString('pt-BR')}: ${pos ? '+' : '−'} ${fmtMoney(Math.abs(v))}` },
                          h('div', { className: `w-full rounded-t ${pos ? 'bg-green-600' : 'bg-red-600'}`, style: { height: `${Math.max(2, pc)}%` } }));
                      }),
                    ),
                  );
                })(),
                h('div', { className: 'overflow-x-auto' },
                  h('table', { className: 'w-full text-[12.5px]', style: { minWidth: 900, borderCollapse: 'collapse' } },
                    h('thead', null,
                      h('tr', { className: 'bg-gray-50 text-gray-500 text-xs' },
                        ['Cliente', 'Corridas', 'Entregues', 'Redesp.', 'Receita', 'Custo', 'Margem', 'Méd. coleta', 'No prazo', '% Cancel.'].map((t, i) =>
                          h('th', { key: t, scope: 'col', className: 'py-2.5 font-semibold ' + (i === 0 ? 'pl-5 pr-2.5 text-left' : i === 8 ? 'px-2.5 text-left' : i === 9 ? 'pl-2.5 pr-5 text-right' : 'px-2.5 text-right') }, t)))),
                    h('tbody', null,
                      margemData.por_cliente.map((c, i) => {
                        const m = parseFloat(c.margem_total || 0), pos = m >= 0, np = c.pct_no_prazo;
                        return h('tr', { key: i, className: 'border-t border-gray-100 hover:bg-gray-50' },
                          h('td', { className: 'pl-5 pr-2.5 py-2.5' }, h('div', { className: 'font-semibold text-gray-900' }, c.cliente), !c.regra_id && h('div', { className: 'text-[11px] text-gray-400' }, 'Sem regra')),
                          h('td', { className: 'px-2.5 py-2.5 text-right tabular-nums text-gray-700' }, c.qtd),
                          h('td', { className: 'px-2.5 py-2.5 text-right tabular-nums text-gray-700' }, c.entregues != null ? c.entregues : '—'),
                          h('td', { className: 'px-2.5 py-2.5 text-right tabular-nums ' + (ni(c.redespachos) ? 'text-amber-800 font-semibold' : 'text-gray-400') }, c.redespachos != null ? c.redespachos : '—'),
                          h('td', { className: 'px-2.5 py-2.5 text-right tabular-nums text-gray-700' }, fmtMoney(parseFloat(c.receita_total || 0))),
                          h('td', { className: 'px-2.5 py-2.5 text-right tabular-nums text-gray-700' }, fmtMoney(parseFloat(c.custo_uber_total || 0))),
                          h('td', { className: `px-2.5 py-2.5 text-right tabular-nums font-semibold ${pos ? 'text-green-800' : 'text-red-800'}` }, `${pos ? '+' : '−'} ${fmtMoney(Math.abs(m))}`),
                          h('td', { className: 'px-2.5 py-2.5 text-right tabular-nums text-gray-700' }, fmtMin(c.medio_coleta_min)),
                          h('td', { className: 'px-2.5 py-2.5' }, np == null ? h('span', { className: 'text-gray-300' }, '—') : pillPrazo(np)),
                          h('td', { className: 'pl-2.5 pr-5 py-2.5 text-right tabular-nums text-gray-700' }, `${parseFloat(c.taxa_cancelamento || 0).toFixed(0)}%`),
                        );
                      })
                    ),
                  ),
                ),
              ),
      ),
      // HUB_DASH_ANALITICO_V1: provedores, ETA, motivos, parceiros, tendência, mapa de calor
      h(HubAnalitico, { API_URL, fetchAuth, showToast, de, ate }),
      )), // fim conteúdo + flex (HUB_MENU_SECOES_V1)
    );
  }

  // ════════════════════════════════════════════════════════
  // ABA 2: TRACKING - mapa em tempo real via WebSocket
  // ════════════════════════════════════════════════════════
  function TabTracking({ API_URL, fetchAuth, showToast, token }) {
    const [ativas, setAtivas] = useState([]);
    const [selecionada, setSelecionada] = useState(null);
    const [posicaoAtual, setPosicaoAtual] = useState(null);
    const wsRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const [mapsPronto, setMapsPronto] = useState(!!(window.google && window.google.maps));

    // Carrega o Google Maps JS dinamicamente (chave vem do backend via /logistics/maps-key).
    // O index.html do app principal NAO injeta o Maps — sem isto o mapa de tracking fica
    // em branco mesmo com posicao chegando. Mesmo padrao do solicitacao.html.
    useEffect(() => {
      if (window.google && window.google.maps) { setMapsPronto(true); return; }
      const jaInjetado = document.querySelector('script[data-tutts-maps-loader]');
      if (jaInjetado) { jaInjetado.addEventListener('load', () => setMapsPronto(true)); return; }
      (async () => {
        try {
          const resp = await fetchAuth(`${API_URL}/logistics/maps-key`);
          if (!resp.ok) { console.error('Falha ao obter chave do Google Maps:', resp.status); return; }
          const { key } = await resp.json();
          if (!key) return;
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places,geometry&v=weekly`;
          script.async = true; script.defer = true;
          script.setAttribute('data-tutts-maps-loader', '1');
          script.onload = () => setMapsPronto(true);
          script.onerror = () => console.error('Erro ao carregar Google Maps JS — verifique a chave');
          document.head.appendChild(script);
        } catch (err) { console.error('Erro no loader do Google Maps:', err); }
      })();
    }, []);

    const carregarAtivas = useCallback(async () => {
      try {
        const res = await fetchAuth(`${API_URL}/logistics/tracking/ativas`);
        const json = await res.json();
        setAtivas(json.entregas || []);
      } catch { showToast('Erro ao carregar entregas ativas', 'error'); }
    }, [fetchAuth, API_URL]);

    useEffect(() => { carregarAtivas(); const i = setInterval(carregarAtivas, 30000); return () => clearInterval(i); }, []);

    // Conectar WebSocket
    useEffect(() => {
      const wsUrl = API_URL.replace(/^http/, 'ws').replace(/\/api$/, '') + '/ws/uber-tracking';
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'AUTH', token }));
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.event === 'UBER_LOCATION_UPDATE' && selecionada && msg.data.codigoOS == selecionada.codigo_os) {
            setPosicaoAtual({ lat: msg.data.latitude, lng: msg.data.longitude, at: msg.timestamp });
          }
        } catch {}
      };

      return () => { ws.close(); };
    }, [token, selecionada]);

    // Subscribe na OS selecionada
    useEffect(() => {
      if (selecionada && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'SUBSCRIBE', codigoOS: selecionada.codigo_os }));
      }
    }, [selecionada]);

    // Inicializar Google Maps quando OS é selecionada
    useEffect(() => {
      if (!selecionada || !window.google?.maps) return;
      const center = posicaoAtual
        ? { lat: parseFloat(posicaoAtual.lat), lng: parseFloat(posicaoAtual.lng) }
        : { lat: parseFloat(selecionada.latitude_coleta || -12.97), lng: parseFloat(selecionada.longitude_coleta || -38.50) };

      const mapEl = document.getElementById('uber-map');
      if (!mapEl) return;

      mapRef.current = new google.maps.Map(mapEl, { center, zoom: 14, disableDefaultUI: false });

      // Marcadores fixos
      if (selecionada.latitude_coleta && selecionada.longitude_coleta) {
        new google.maps.Marker({
          position: { lat: parseFloat(selecionada.latitude_coleta), lng: parseFloat(selecionada.longitude_coleta) },
          map: mapRef.current, label: 'C', title: 'Coleta',
        });
      }
      if (selecionada.latitude_entrega && selecionada.longitude_entrega) {
        new google.maps.Marker({
          position: { lat: parseFloat(selecionada.latitude_entrega), lng: parseFloat(selecionada.longitude_entrega) },
          map: mapRef.current, label: 'E', title: 'Entrega',
        });
      }
    }, [selecionada, mapsPronto]);

    // Atualizar marcador do entregador
    useEffect(() => {
      if (!posicaoAtual || !mapRef.current) return;
      const pos = { lat: parseFloat(posicaoAtual.lat), lng: parseFloat(posicaoAtual.lng) };
      if (markerRef.current) {
        markerRef.current.setPosition(pos);
      } else {
        markerRef.current = new google.maps.Marker({
          position: pos, map: mapRef.current,
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#770fa8', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
          title: 'Entregador',
        });
      }
      mapRef.current.panTo(pos);
    }, [posicaoAtual]);

    // HUB_ABAS_V1: Tracking no padrão clean — cabeçalho, lista em card com seleção roxa suave,
    // painel de detalhe limpo (dados do entregador + botão Tracking principal) e estado vazio.
    const campoTrk = (rot, val) => h('div', { className: 'min-w-0' },
      h('dt', { className: 'text-xs text-gray-500' }, rot),
      h('dd', { className: 'text-[13px] text-gray-900 font-medium mt-0.5 truncate' }, val || '—'));
    const selecionarTrk = (e) => { setSelecionada(e); setPosicaoAtual(e.ultima_posicao ? { lat: e.ultima_posicao.lat, lng: e.ultima_posicao.lng } : null); };
    return h('div', { className: 'max-w-7xl mx-auto px-4 py-5 md:px-6 md:py-6 space-y-4' },
      h(HxCabecalho, {
        titulo: 'Tracking',
        sub: `${ativas.length} entrega${ativas.length !== 1 ? 's' : ''} em andamento · posição do entregador em tempo real`,
        acoes: [h('button', { key: 'r', type: 'button', onClick: carregarAtivas, className: HX.btnIco, title: 'Atualizar', 'aria-label': 'Atualizar entregas ativas' }, hxIco('refresh'))],
      }),
      h('div', { className: 'grid grid-cols-1 lg:grid-cols-[minmax(300px,380px)_1fr] gap-4 items-start' },
        // Lista
        h('section', { 'aria-label': 'Entregas em andamento', className: HX.card + ' overflow-hidden' },
          h('div', { className: 'px-4 py-3 border-b border-gray-100 flex items-center justify-between' },
            h('span', { className: 'text-[15px] font-semibold text-gray-900' }, 'Em andamento'),
            h('span', { className: 'text-xs text-gray-500 tabular-nums' }, String(ativas.length))),
          ativas.length === 0
            ? h(HxVazio, { titulo: 'Nenhuma entrega em andamento', texto: 'Quando uma corrida for despachada, ela aparece aqui com a posição do entregador.' })
            : h('div', { className: 'max-h-[620px] overflow-y-auto' },
                ativas.map(e => {
                  const sel = selecionada?.id === e.id;
                  return h('div', {
                    key: e.id, role: 'button', tabIndex: 0, 'aria-pressed': sel,
                    onClick: () => selecionarTrk(e),
                    onKeyDown: (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); selecionarTrk(e); } },
                    className: 'px-4 py-3 cursor-pointer border-t border-gray-100 first:border-t-0 focus:outline-none focus-visible:bg-gray-50 ' + (sel ? '' : 'hover:bg-gray-50'),
                    style: sel ? { background: '#faf7fd', boxShadow: 'inset 2px 0 0 #770fa8' } : null,
                  },
                    h('div', { className: 'flex items-center justify-between gap-2' },
                      h('span', { className: 'flex items-center gap-2 min-w-0' },
                        h(ProviderLogo, { code: (e.provider_code || e.provider || null), size: 18 }),
                        h('span', { className: 'text-[13.5px] font-semibold text-gray-900 cursor-pointer whitespace-nowrap', style: { fontVariantNumeric: 'tabular-nums' }, title: 'Clique para copiar a OS', onClick: (ev) => { ev.stopPropagation(); copiarTextoOS(e.codigo_os, showToast); } }, `OS ${e.codigo_os} `, h('svg', { className: 'ico oscopy-a', style: { width: 12, height: 12, opacity: 0.45, display: 'inline-block', marginLeft: 3, verticalAlign: 'baseline' }, 'aria-hidden': 'true' }, h('use', { href: '#i-copy' })))
                      ),
                      h('div', { className: 'flex items-center gap-1.5 flex-shrink-0' },
                        h(HxStatus, { entrega: e }),
                        e.tracking_url && h('a', {
                          href: e.tracking_url, target: '_blank', rel: 'noopener noreferrer',
                          onClick: (ev) => ev.stopPropagation(),
                          title: 'Abrir tracking oficial do provedor', 'aria-label': `Abrir tracking oficial da OS ${e.codigo_os}`,
                          className: 'w-7 h-7 grid place-items-center rounded-lg text-gray-500 hover:text-purple-800 hover:bg-white',
                        }, hxIco('link', 15)),
                      ),
                    ),
                    h('p', { className: 'text-[12.5px] mt-1 ' + (e.entregador_nome ? 'text-gray-700' : 'text-gray-400') }, e.entregador_nome || 'Sem entregador atribuído'),
                    h('p', { className: 'text-xs text-gray-500 truncate mt-0.5' }, e.endereco_entrega)
                  );
                }))
        ),
        // Mapa + detalhes
        h('div', { className: 'space-y-4 min-w-0' },
          selecionada ? [
            h('section', { key: 'info', 'aria-label': 'Detalhe da entrega', className: HX.card + ' p-4 md:p-5' },
              h('div', { className: 'flex items-start justify-between gap-3 flex-wrap' },
                h('div', { className: 'flex items-center gap-3 min-w-0' },
                  (selecionada.entregador_foto || selecionada.entregador_nome) && h(HxAvatar, { foto: selecionada.entregador_foto, nome: selecionada.entregador_nome, size: 44 }),
                  h('div', { className: 'min-w-0' },
                    h('div', { className: 'flex items-center gap-2 flex-wrap' },
                      h('h2', { className: 'text-base font-semibold text-gray-900', style: { fontVariantNumeric: 'tabular-nums' } }, `OS ${selecionada.codigo_os}`),
                      h(HxStatus, { entrega: selecionada })),
                    h('p', { className: 'text-[12.5px] text-gray-500 mt-0.5' }, provedorInfo(selecionada).nome, selecionada.endereco_entrega ? ' · ' + selecionada.endereco_entrega : ''))
                ),
                // Botão tracking oficial do provedor
                selecionada.tracking_url && h('a', {
                  href: selecionada.tracking_url, target: '_blank', rel: 'noopener noreferrer',
                  className: HX.btnPri + ' flex-shrink-0',
                  title: 'Abrir página oficial de rastreio da entrega em nova aba',
                }, hxIco('link'), 'Tracking'),
              ),
              // Dados do entregador
              selecionada.entregador_nome
                ? h('dl', { className: 'grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 mt-4 pt-4 border-t border-gray-100' },
                    campoTrk('Entregador', h('span', { className: 'inline-flex items-center gap-1.5' }, selecionada.entregador_nome,
                      selecionada.entregador_rating && h('span', { className: 'inline-flex items-center gap-0.5 text-gray-500 font-normal' }, hxIco('star', 12), String(selecionada.entregador_rating)))),
                    campoTrk('Telefone', fmtTelefoneBR(selecionada.entregador_telefone)),
                    campoTrk('Veículo', selecionada.entregador_veiculo),
                    campoTrk('Placa', selecionada.entregador_placa))
                : h('p', { className: 'text-[13px] text-gray-500 mt-4 pt-4 border-t border-gray-100' }, 'Ainda sem entregador atribuído.'),
              // Última posição (se houver)
              posicaoAtual && h('div', { className: 'text-[11.5px] text-gray-500 mt-3', style: { fontVariantNumeric: 'tabular-nums' } },
                'Última posição ',
                h('span', { className: 'font-mono text-gray-600' }, `${parseFloat(posicaoAtual.lat).toFixed(5)}, ${parseFloat(posicaoAtual.lng).toFixed(5)}`),
                posicaoAtual.at && h('span', null, ` · ${fmtDT(posicaoAtual.at)}`)
              )
            ),
            h('div', { key: 'map', id: 'uber-map', role: 'region', 'aria-label': 'Mapa da entrega', className: 'w-full h-[420px] md:h-[480px] rounded-[14px] border border-gray-200 bg-gray-100' })
          ] : h('section', { className: HX.card },
            h(HxVazio, { titulo: 'Selecione uma entrega', texto: 'Escolha uma entrega na lista para ver o entregador e acompanhar a posição no mapa.' }))
        )
      )
    );
  }

  // ════════════════════════════════════════════════════════
  // ABA 3: ENTREGAS - listagem com filtros
  // ════════════════════════════════════════════════════════
  // Helpers locais usados pelos cards
  function fmtTelefoneBR(tel) {
    if (!tel) return '—';
    const digits = String(tel).replace(/\D/g, '');
    // E.164 com DDI Brasil (55) + DDD (2) + 9 dígitos
    if (digits.length === 13 && digits.startsWith('55')) {
      return `+55 ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`;
    }
    if (digits.length === 11) {
      return `${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    return tel;
  }

  function iniciaisDoNome(nome) {
    if (!nome) return '?';
    const partes = nome.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  function calcularDuracao(inicio, fim) {
    if (!inicio || !fim) return null;
    const ms = new Date(fim) - new Date(inicio);
    if (ms < 0) return null;
    const min = Math.floor(ms / 60000);
    const seg = Math.floor((ms % 60000) / 1000);
    if (min === 0) return `${seg}s`;
    return `${min}m${String(seg).padStart(2, '0')}s`;
  }

  function truncMeio(s, ini = 12, fim = 4) {
    if (!s) return '—';
    if (s.length <= ini + fim + 1) return s;
    return `${s.slice(0, ini)}…${s.slice(-fim)}`;
  }

  // Detecta se é dispositivo móvel pra adaptar comportamento do "Ligar"
  function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
  }

  // Card individual de entrega — extraído pra ficar legível
  // 🆕 2026-05 Hub — rótulo + ícone do provedor de uma entrega.
  // O registro pode trazer provider_code (logistics_deliveries) ou não
  // (uber_entregas legado). Sem o campo, assume 'uber' — é o que há na
  // tabela legada hoje. Quando a leitura migrar pra logistics_deliveries
  // (Fase 6), o provider real já aparece sem mudar nada aqui.
  // Copia o numero da OS pro clipboard (com fallback) e avisa via toast.
  function copiarTextoOS(codigo, showToast) {
    const txt = String(codigo == null ? '' : codigo);
    const ok = function () { if (showToast) showToast('OS ' + txt + ' copiada', 'success'); };
    const fail = function () { if (showToast) showToast('Nao foi possivel copiar', 'error'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(ok, fail);
    } else {
      try {
        const ta = document.createElement('textarea');
        ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta); ok();
      } catch (e) { fail(); }
    }
  }

  function provedorInfo(entrega) {
    const code = (entrega && (entrega.provider_code || entrega.provider)) || null;
    if (code === 'noventanove' || code === '99') return { code: 'noventanove', nome: '99Entrega', tipo: '99', icone: h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-bike" })) };
    if (code === 'uber') return { code: 'uber', nome: 'Uber Direct', tipo: 'uber', icone: h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-bike" })) };
    if (code === 'proprio') return { code: 'proprio', nome: 'Moto própria', tipo: 'proprio', icone: h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-bike" })) }; // MOTO_PROPRIA_FRONT_V1
    return { code: code, nome: code || 'Sem provedor', tipo: 'na', icone: h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-package" })) };
  }

  // ──────────────────────────────────────────────────────────
  // ProviderLogo — logo oficial redondo do provedor logístico.
  // SVGs embutidos inline (sem arquivo externo → sem risco de 404).
  //  - uber: app icon oficial, círculo preto, wordmark branco.
  //  - 99Entrega: ícone oficial (Preto.svg) recortado em círculo via CSS.
  // Provider desconhecido → fallback com a inicial num círculo cinza.
  // ──────────────────────────────────────────────────────────
  const PROVIDER_SVGS = {
    proprio:
      '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">' +
      '<circle cx="30" cy="30" r="30" fill="#770fa8"/>' +
      '<g fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="20" cy="38" r="6"/><circle cx="40" cy="38" r="6"/>' +
      '<path d="M20 38l6-12h6l4 6h4"/><path d="M26 26h8"/></g>' +
      '</svg>',
    uber:
      '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">' +
      '<circle cx="30" cy="30" r="30" fill="black"/>' +
      '<path d="M14.3206 35.4962C16.3593 35.4962 17.9356 33.9227 17.9356 31.5943V22.5322H20.1422V37.2163H17.9566V35.8527C16.9688 36.8805 15.6028 37.4678 14.0682 37.4678C10.9151 37.4678 8.49786 35.1814 8.49786 31.7216V22.5346H10.7045V31.5943C10.7045 33.9647 12.2598 35.4962 14.3199 35.4962" fill="white"/>' +
      '<path d="M21.7828 22.5324H23.9056V27.8815C24.4007 27.3754 24.9925 26.9735 25.6459 26.6997C26.2993 26.4258 27.0012 26.2855 27.7099 26.287C30.863 26.287 33.343 28.7834 33.343 31.888C33.343 34.9717 30.863 37.4677 27.7099 37.4677C26.9978 37.4696 26.2925 37.3296 25.6353 37.0559C24.9781 36.7821 24.3823 36.3802 23.8828 35.8736V37.2155H21.7797L21.7828 22.5324ZM27.563 35.601C29.5811 35.601 31.2415 33.9436 31.2415 31.888C31.2415 29.8112 29.5811 28.175 27.563 28.175C25.524 28.175 23.8635 29.8112 23.8635 31.888C23.8635 33.9436 25.503 35.601 27.563 35.601Z" fill="white"/>' +
      '<path d="M39.6917 26.3083C42.7813 26.3083 45.0517 28.6786 45.0517 31.8673V32.5596H36.3297C36.6241 34.3006 38.0743 35.6013 39.881 35.6013C41.1222 35.6013 42.1724 35.0975 42.9709 34.0278L44.5055 35.1605C43.4333 36.5871 41.8359 37.4469 39.881 37.4469C36.6652 37.4469 34.1848 35.0556 34.1848 31.8673C34.1848 28.8466 36.56 26.3083 39.692 26.3083H39.6917ZM36.3707 30.8815H42.9078C42.5506 29.245 41.2263 28.1543 39.65 28.1543C38.0736 28.1543 36.7493 29.245 36.3707 30.8815Z" fill="white"/>' +
      '<path d="M50.7474 28.4061C49.36 28.4061 48.3511 29.4759 48.3511 31.133V37.2164H46.228V26.5181H48.3311V27.8408C48.8566 26.9806 49.7185 26.4352 50.8956 26.4352H51.6311V28.4072L50.7474 28.4061Z" fill="white"/>' +
      '</svg>',
    noventanove:
      '<svg viewBox="0 0 209 209" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M0 46.4444C0 20.7939 20.7939 0 46.4444 0H162.556C188.206 0 209 20.7939 209 46.4444V162.556C209 188.206 188.206 209 162.556 209H46.4444C20.7939 209 0 188.206 0 162.556V46.4444Z" fill="#111827"/>' +
      '<path fill-rule="evenodd" clip-rule="evenodd" d="M68.3442 55.1528C79.373 55.1528 89.1552 60.5957 95.2622 68.9939C99.1792 74.3808 101.576 80.9841 101.855 88.1472V89.3804C101.855 96.36 99.8283 102.865 96.3157 108.275L67.5618 153.086C67.2567 153.561 66.7381 153.847 66.1817 153.847H43.3702C42.2719 153.847 41.613 152.602 42.2148 151.663L60.7855 122.723C45.9202 119.221 34.8334 105.627 34.8334 89.3804L34.8643 88.1472C35.1118 81.0028 37.498 74.4152 41.3972 69.0364C47.502 60.6143 57.2972 55.1528 68.3442 55.1528ZM68.3442 100.691C72.3576 100.691 75.909 98.7126 78.1455 95.6683L79.081 94.2104C80.0497 92.4185 80.6038 90.3607 80.6029 88.1472C80.5912 81.2422 75.1079 75.6479 68.3442 75.6479C61.5805 75.6479 56.0977 81.2422 56.0846 88.1692C56.0846 95.0851 61.5735 100.691 68.3442 100.691Z" fill="#f3f4f6"/>' +
      '<path fill-rule="evenodd" clip-rule="evenodd" d="M167.573 68.9939C161.467 60.5957 151.685 55.1528 140.656 55.1528C129.609 55.1528 119.813 60.6143 113.709 69.0364C109.81 74.4152 107.423 81.0028 107.175 88.1472L107.145 89.3804C107.145 105.627 118.232 119.221 133.097 122.723L114.526 151.663C113.924 152.602 114.583 153.847 115.681 153.847H138.493C139.049 153.847 139.568 153.561 139.873 153.086L168.627 108.275C172.14 102.865 174.167 96.36 174.167 89.3804V88.1472C173.887 80.9841 171.49 74.3808 167.573 68.9939ZM140.656 100.691C144.669 100.691 148.221 98.7126 150.457 95.6683L151.392 94.2104C152.361 92.4185 152.915 90.3607 152.914 88.1472C152.903 81.2422 147.419 75.6479 140.656 75.6479C133.892 75.6479 128.409 81.2422 128.396 88.1692C128.396 95.0852 133.885 100.691 140.656 100.691Z" fill="#f3f4f6"/>' +
      '</svg>',
  };

  function ProviderLogo({ code, size = 22 }) {
    const c = (code === '99') ? 'noventanove' : code;
    const svg = PROVIDER_SVGS[c];
    const base = {
      width: size, height: size,
      borderRadius: '50%',
      flexShrink: 0,
      display: 'inline-block',
      verticalAlign: 'middle',
    };
    if (svg) {
      // O SVG da 99 é um quadrado de cantos arredondados; overflow:hidden +
      // borderRadius 50% recorta num círculo perfeito. O da Uber já é círculo.
      return h('span', {
        style: { ...base, overflow: 'hidden', lineHeight: 0 },
        dangerouslySetInnerHTML: { __html: svg },
        title: c === 'uber' ? 'Uber Direct' : c === 'noventanove' ? '99Entrega' : code,
      });
    }
    // Fallback — provider sem logo: círculo cinza com a inicial.
    return h('span', {
      style: {
        ...base,
        background: '#e5e7eb',
        color: '#374151',
        fontSize: size * 0.5,
        fontWeight: 700,
        textAlign: 'center',
        lineHeight: `${size}px`,
      },
    }, String(code || '?').charAt(0).toUpperCase());
  }

  // SeloProvider — selo de TEXTO colorido pra diferenciar o provedor num relance.
  //  uber → preto/branco (marca Uber) · 99 → amarelo (marca 99) · sem provider → cinza neutro.
  // Acompanha o ProviderLogo; nunca assume 'uber' por omissão (fallback neutro).
  function SeloProvider({ code }) {
    const c = (code === '99') ? 'noventanove' : code;
    let texto, estilo, title;
    if (c === 'uber') {
      texto = 'Uber'; title = 'Uber Direct';
      estilo = { background: '#111827', color: '#ffffff' };
    } else if (c === 'noventanove') {
      texto = '99'; title = '99Entrega';
      estilo = { background: '#fde68a', color: '#92400e' };
    } else {
      texto = 'sem provedor'; title = 'Sem provedor identificado';
      estilo = { background: '#f3f4f6', color: '#6b7280', border: '0.5px solid #d1d5db' };
    }
    return h('span', {
      title,
      style: {
        fontSize: '10px', fontWeight: 600, padding: '1px 7px',
        borderRadius: '999px', whiteSpace: 'nowrap', lineHeight: '16px',
        flexShrink: 0, ...estilo,
      },
    }, texto);
  }

  // ════════════════════════════════════════════════════════
  // 🆕 2026-07: Tentativas de despacho por OS (secao do card).
  // Aparece SO quando houve historia: mais de uma tentativa OU um
  // cancelamento (re-despacho). Corrida despachada de primeira nao mostra.
  // Dados vem do batch GET /logistics/deliveries/tentativas.
  // ════════════════════════════════════════════════════════
  // TRILHA_COMPACTA_ADMIN_V1
  // Trilhas de re-despacho ficam enormes (ja vi 9+ passos). Fechada mostra so
  // os MAX_TRILHA mais RECENTES — a trilha e cronologica (antigo em cima),
  // entao cortar pelo fim esconderia justo o "atual". O botao de expandir vai
  // no TOPO, revelando os passos antigos.
  const MAX_TRILHA = 4;

  function TentativasDespacho({ dados, aberta, onToggle }) {
    // Hook ANTES de qualquer early return (regras dos hooks). O estado
    // sobrevive ao refresh de 30s porque o CardKanban tem key: e.id estavel.
    // HUB_CLEAN_V1: aberta/onToggle opcionais (o menu "…" do card abre a trilha).
    const [_trilhaAbertaInt, _setTrilhaAbertaInt] = useState(false);
    const trilhaAberta = aberta != null ? aberta : _trilhaAbertaInt;
    const setTrilhaAberta = onToggle ? (() => onToggle()) : _setTrilhaAbertaInt;
    if (!dados || !Array.isArray(dados.eventos)) return null;
    const evs = dados.eventos;
    const temCancelamento = evs.some(x => x.tipo === 'canceled');
    if (evs.length <= 1 && !temCancelamento) return null;

    // marca o ultimo dispatch_success como "atual" — MAS so se nada terminal
    // (cancelado/falha) veio depois dele. Se a corrida foi cancelada ou falhou
    // apos o ultimo despacho, esse despacho nao esta mais valendo: sem "atual".
    let idxUltimoSucesso = -1;
    evs.forEach((x, i) => { if (x.tipo === 'dispatch_success') idxUltimoSucesso = i; });
    const houveTerminalDepois = evs.some((x, i) =>
      i > idxUltimoSucesso &&
      (x.tipo === 'canceled' || x.tipo === 'error' || x.tipo === 'dispatch_failed'));
    const idxAtual = houveTerminalDepois ? -1 : idxUltimoSucesso;
    const totalTent = dados.total_tentativas || evs.filter(x => String(x.tipo).indexOf('dispatch') === 0).length;

    // Fatia visivel: fechada, so os MAX_TRILHA ultimos.
    const ocultos = (!trilhaAberta && evs.length > MAX_TRILHA) ? (evs.length - MAX_TRILHA) : 0;
    const inicio = ocultos;
    const podeExpandir = evs.length > MAX_TRILHA;

    let contDisp = 0;
    // BUSCA_SIMULTANEA_TENT_V1: dispatch_success do MESMO grupo sao tentativas
    // PARALELAS (busca simultanea), nao redespacho. Conta o grupo como UM
    // despacho e rotula as irmas iguais (sem "Re-despachado").
    const _grupoCount = {};
    evs.forEach(x => { if (x.tipo === 'dispatch_success' && x.grupo) _grupoCount[x.grupo] = (_grupoCount[x.grupo] || 0) + 1; });
    const _grupoContado = {};
    return h('div', { className: 'pt-2.5 border-t border-gray-100' },
      /* MP_TRILHA_DROPDOWN_V4: trilha inteira colapsada num dropdown (fechada por padrao) */
      h('button', { type: 'button', 'aria-expanded': !!trilhaAberta, onClick: () => setTrilhaAberta(v => !v), className: 'w-full flex items-center gap-2 mb-1 text-left' },
        h('span', { className: 'text-xs font-semibold text-gray-700' }, 'Tentativas de despacho'),
        h('span', { className: 'text-[11px] font-semibold bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 tabular-nums' }, String(totalTent)),
        h('svg', { className: 'ico ml-auto text-gray-400', 'aria-hidden': 'true', style: { width: 14, height: 14, transform: trilhaAberta ? 'rotate(180deg)' : 'none' } }, h('use', { href: '#i-arrowdown' })),
      ),
      trilhaAberta && h('div', { className: 'pl-1 mt-2' },
        evs.map((ev, i) => {
          const hora = _fmtHora(_tsValido(ev.hora));
          const ehUltimo = i === evs.length - 1;
          let icone, dotCls, titulo, detalhe = null, detClsExtra = '';
          let providerCode = ev.provider && ev.provider !== 'none' ? ev.provider : null;

          if (ev.tipo === 'dispatch_success') {
            const ehSimult = ev.grupo && _grupoCount[ev.grupo] >= 2; // BUSCA_SIMULTANEA_TENT_V1
            icone = ''; dotCls = 'border-green-500 bg-green-500';
            if (ehSimult) {
              // o grupo inteiro conta como UM despacho (nao numera irmas)
              if (!_grupoContado[ev.grupo]) { contDisp++; _grupoContado[ev.grupo] = true; }
              titulo = contDisp === 1 ? 'Despachado' : 'Re-despachado';
              detalhe = 'busca simult\u00e2nea';
              detClsExtra = 'text-purple-700 bg-purple-50';
            } else {
              contDisp++;
              titulo = contDisp === 1 ? 'Despachado' : 'Re-despachado';
            }
          } else if (ev.tipo === 'canceled') {
            const sistema = ev.cancelado_por === 'sistema-bloqueio';
            icone = ''; dotCls = 'border-red-500 bg-red-500';
            titulo = sistema ? 'Cancelado pelo sistema' : 'Cancelado';
            detalhe = sistema
              ? ('Entregador bloqueado' + (ev.courier ? ' — ' + ev.courier : ''))
              : (ev.motivo || null);
            detClsExtra = 'text-red-700 bg-red-50';
            providerCode = null;
          } else if (ev.tipo === 'dispatch_failed' || ev.tipo === 'error') {
            icone = ''; dotCls = 'border-amber-500 bg-amber-500';
            titulo = 'Falha no despacho';
            const errTxt = String(ev.erro || ev.motivo || '');
            detalhe = /external_id/i.test(errTxt)
              ? 'external_id duplicado — 99 recusou recriar'
              : (errTxt ? errTxt.slice(0, 120) : 'erro ao criar no provedor');
            detClsExtra = 'text-amber-700 bg-amber-50';
          } else {
            icone = ''; dotCls = 'border-gray-400 bg-gray-400';
            titulo = 'Rejeitado';
            detalhe = ev.motivo || ev.erro || null; detClsExtra = 'text-gray-600 bg-gray-100';
          }

          // Fora da fatia visivel: ja contamos o contDisp acima (pra numerar
          // Despachado x Re-despachado certo), agora so nao desenhamos.
          if (i < inicio) return null;

          const ehAtual = (i === idxAtual);
          return h('div', { key: i, className: 'flex gap-3' },
            h('div', { className: 'flex flex-col items-center flex-shrink-0' },
              h('span', { className: `w-3 h-3 rounded-full border-2 ${dotCls}` }),
              !ehUltimo && h('span', { className: 'w-0.5 flex-1 bg-gray-200 my-1', style: { minHeight: '16px' } })
            ),
            h('div', { className: 'flex-1 pb-2.5 min-w-0' },
              h('div', { className: 'flex items-center gap-2 flex-wrap' },
                h('span', { className: 'text-[13px] font-bold text-gray-800' }, titulo),
                providerCode && h(ProviderLogo, { code: providerCode, size: 15 }),
                ehAtual && h('span', { className: 'text-[10px] font-semibold text-green-700 bg-green-50 rounded-full px-2 py-0.5' }, 'atual')
              ),
              detalhe && h('div', { className: `inline-block text-[11px] rounded-md px-2 py-0.5 mt-1 ${detClsExtra}` }, detalhe),
              h('div', { className: 'text-[11px] text-gray-400 mt-0.5' }, hora)
            )
          );
        })
      )
    );
  }

  // REDESPACHO_BTN_V1: onRedespachoRapido e prop NOVA — nao reaproveita
  // onRedespachar, que abre o modal de "Editar endereco". Sao acoes
  // diferentes: uma troca o endereco, a outra so troca o motoboy.
  function CardEntrega({ entrega, tentativas, onCancelar, onVerTracking, onVerDetalhes, onRedespachar, onRedespachoRapido, showToast }) {
    const e = entrega;

    const valorUber           = parseFloat(e.valor_uber || e.valor_provider || 0);
    const valorHub            = parseFloat(e.valor_servico || 0);   // preço calculado pelo hub (km)
    const margemHub           = Math.round((valorHub - valorUber) * 100) / 100;
    const margemHubPct        = valorUber > 0 ? Math.round((margemHub / valorUber) * 1000) / 10 : null;
    const margemPos           = margemHub >= 0;
    // Valores originais (audit — usados só se precisar)
    const valorClienteOriginal = parseFloat(e.valor_servico_mapp_original || e.valor_servico || 0);
    const valorProfOriginal    = parseFloat(e.valor_profissional_mapp_original || e.valor_profissional || 0);

    const prov           = provedorInfo(e);

    const TERMINAIS_CANON = ['DELIVERED', 'CANCELED', 'RETURNED', 'FAILED', 'FALLBACK_QUEUE'];
    const TERMINAIS_NATIVE = ['delivered', 'cancelado', 'canceled', 'entregue', 'finalizado', 'concluido', 'fallback_fila'];
    const podeCancelar = !TERMINAIS_CANON.includes(e.status_canonico)
      && !TERMINAIS_NATIVE.includes(e.status_uber);
    // REDESPACHO_BTN_V1 — trava mais estreita que podeCancelar.
    // Doc da 99 (Cancel Order): "If the courier has picked up the package,
    // order cancellation is not supported." Depois da coleta a 99 recusa o
    // cancelamento, a corrida segue viva sendo COBRADA, e o redespacho
    // pagaria duas. A fronteira e a COLETA, nao o aceite.
    const podeRedespachar = ANTES_DA_COLETA_CANON.includes(e.status_canonico) && String(e.provider_code || e.provider || '').toLowerCase() !== 'uber'; // UBER_NO_REDISPATCH_V1
    const temEntregador = !!e.entregador_nome && !estaProcurando(e);

    const duracao = calcularDuracao(e.created_at, e.finalizado_at);

    async function copiarTel() {
      if (!e.entregador_telefone) {
        showToast?.('Sem telefone do entregador', 'error');
        return;
      }
      try {
        await navigator.clipboard.writeText(e.entregador_telefone);
        showToast?.('Telefone copiado: ' + e.entregador_telefone, 'success');
      } catch (err) {
        // Fallback pra browsers/contextos sem clipboard API
        const ta = document.createElement('textarea');
        ta.value = e.entregador_telefone;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); showToast?.('Telefone copiado', 'success'); }
        catch { showToast?.('Não foi possível copiar', 'error'); }
        document.body.removeChild(ta);
      }
    }

    function ligar() {
      if (!e.entregador_telefone) {
        showToast?.('Sem telefone do entregador', 'error');
        return;
      }
      // Em mobile abre o discador. Em desktop, copia o número (porque tel: raramente funciona)
      if (isMobile()) {
        window.location.href = `tel:${e.entregador_telefone}`;
      } else {
        copiarTel();
        showToast?.('Desktop: número copiado, ligue do seu celular', 'info');
      }
    }

    return h('div', {
      className: 'bg-white rounded-[14px] border border-gray-200 p-4 md:p-5 space-y-4',
    },

      // ── Cabeçalho ──
      h('div', { className: 'flex items-start justify-between gap-3 pb-3 border-b border-gray-100' },
        h('div', { className: 'flex flex-col gap-1 min-w-0 flex-1' },
          h('div', { className: 'flex items-center gap-3 flex-wrap' },
            h('span', { className: 'text-lg md:text-xl font-bold text-gray-800 cursor-pointer', title: 'Clique para copiar a OS', onClick: (ev) => { ev.stopPropagation(); copiarTextoOS(e.codigo_os, showToast); } }, `OS ${e.codigo_os} `, h('svg', { className: 'ico oscopy-b', style: { width: 12, height: 12, opacity: 0.45, display: 'inline-block', marginLeft: 3, verticalAlign: 'baseline' }, 'aria-hidden': 'true' }, h('use', { href: '#i-copy' }))),
            h(Badge, { entrega: e }),
            h('span', {
              className: 'inline-flex items-center gap-1.5',
              title: 'Provedor que despachou esta entrega',
            },
              h(ProviderLogo, { code: prov.code, size: 18 })
            ),
          ),
          // Nome do cliente vindo da regra que casou (ou "Manual" se foi despacho manual)
          h('div', { className: 'text-xs text-gray-500' },
            'Cliente: ',
            h('span', { className: 'font-semibold text-gray-700' },
              e.cliente_nome_regra || 'Manual / sem regra')
          ),
        ),
        h('div', { className: 'flex gap-2 flex-shrink-0 flex-wrap justify-end' },
          onVerTracking && h('button', {
            onClick: () => onVerTracking(e),
            disabled: !(e.rastreio_token || e.tracking_url),
            title: e.rastreio_token ? 'Abrir rastreio Tutts' : (e.tracking_url ? 'Abrir rastreio no provedor' : 'Rastreio ainda nao disponivel'),
            className: `text-xs px-3 py-1.5 border rounded-lg ${
              (e.rastreio_token || e.tracking_url)
                ? 'border-gray-200 hover:bg-gray-50 text-gray-700'
                : 'border-gray-100 text-gray-300 cursor-not-allowed'
            }`,
          }, 'Tracking'),
          // Badge de código de coleta — visível no card para acesso rápido
          e.pickup_code && h('span', {
            title: `Código de coleta: ${e.pickup_code}`,
            className: 'text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded font-mono font-semibold cursor-default border border-amber-200',
            onClick: () => navigator.clipboard?.writeText(e.pickup_code),
          }, `${e.pickup_code}`),
          onVerDetalhes && h('button', {
            onClick: () => onVerDetalhes(e),
            className: 'text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700',
          }, 'Detalhes'),
          podeCancelar && onRedespachar && h('button', {
            onClick: () => onRedespachar(e),
            title: 'Cancelar e redespachar com novo endereço de entrega',
            className: 'text-xs px-3 py-1.5 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-50',
          }, 'Editar endereço'),
          podeCancelar && h('button', {
            onClick: () => onCancelar(e),
            className: 'text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50',
          }, 'Cancelar'),
        )
      ),

      // REDESPACHO_BTN_V1 — linha propria: a fileira de cima ja tem 5 botoes
      // e um sexto viraria icone. Roxo pra nao parecer irmao de "Editar
      // endereco" (ambar) nem de "Cancelar" (vermelho) — as tres acoes sao
      // diferentes.
      podeRedespachar && onRedespachoRapido && h('div', { className: 'mt-2' },
        h('button', {
          onClick: () => onRedespachoRapido(e),
          title: 'Cancela a corrida atual e chama outro entregador. O atual fica de fora desta OS.',
          className: 'w-full text-xs font-semibold px-3 py-2 border border-purple-300 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100',
        }, '\u21bb  Redespachar'),
      ),

      // ── Endereços lado a lado ──
      h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
        h('div', null,
          h('div', { className: 'text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1' }, h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-package' })), 'Coleta')),
          h('div', { className: 'text-sm text-gray-800 leading-relaxed break-words' }, e.endereco_coleta || '—'),
          CodigoBadge('Código de coleta', e.pickup_code),
          e.return_code && CodigoBadgeDevol('Código de devolução', e.return_code)
        ),
        h('div', null,
          h('div', { className: 'text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1' }, h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-pin' })), 'Entrega')),
          h('div', { className: 'text-sm text-gray-800 leading-relaxed break-words' }, e.endereco_entrega || '—'),
          // CLIENTE_FINAL_NF_DETALHE
          (e.cliente_final || e.nota_fiscal) && h('div', { className: 'flex flex-wrap items-center gap-1.5 mt-1.5' },
            e.cliente_final && h('span', {
              className: 'inline-flex items-center gap-1 text-[11px] font-semibold text-gray-700 bg-gray-100 rounded px-2 py-0.5',
            }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-building' })), e.cliente_final),
            e.nota_fiscal && h('span', {
              className: 'inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 rounded px-2 py-0.5',
            }, h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-filetext' })), 'NF '), e.nota_fiscal),
          )
        ),
      ),

      // financeiro (custo/valor/margem) removido do card — fica so nos detalhes

      // ── Bloco do entregador ──
      temEntregador
        ? h('div', { className: 'flex items-center gap-3 p-3 bg-gray-50 rounded-lg' },
            // Avatar
            // Avatar — foto real do entregador se vier, senão iniciais
            e.entregador_foto
              ? h('img', {
                  src: e.entregador_foto,
                  alt: e.entregador_nome,
                  className: 'w-11 h-11 rounded-full object-cover flex-shrink-0 bg-purple-100',
                  onError: (ev) => {
                    // Se a URL expirou ou falhou, esconde a img e o div abaixo aparece
                    ev.target.style.display = 'none';
                    const fallback = ev.target.nextSibling;
                    if (fallback) fallback.style.display = 'flex';
                  },
                })
              : null,
            h('div', {
              className: 'w-11 h-11 rounded-full bg-purple-100 flex items-center justify-center font-semibold text-sm text-purple-700 flex-shrink-0',
              style: e.entregador_foto ? { display: 'none' } : {},
            }, iniciaisDoNome(e.entregador_nome)),

            // Info
            h('div', { className: 'flex-1 min-w-0' },
              h('div', { className: 'flex items-center gap-2 flex-wrap' },
                h('span', { className: 'text-sm font-semibold text-gray-800' }, e.entregador_nome),
                e.entregador_rating && h('span', { className: 'text-xs text-gray-600' }, `${e.entregador_rating}`),
                e.id_motoboy_mapp && h('span', { className: 'text-[11px] text-gray-400' }, `· id Mapp ${e.id_motoboy_mapp}`),
              ),
              h('div', { className: 'text-xs text-gray-600 mt-0.5 break-words' },
                [
                  fmtTelefoneBR(e.entregador_telefone),
                  e.entregador_veiculo,
                  e.entregador_placa,
                ].filter(Boolean).join(' · ') || '—'
              ),
            ),

            // Ações
            e.entregador_telefone && h('div', { className: 'flex gap-1.5 flex-shrink-0' },
              h('button', {
                onClick: copiarTel,
                title: 'Copiar telefone',
                className: 'text-[11px] px-2.5 py-1.5 border border-gray-200 rounded-md hover:bg-white text-gray-700',
              }, 'Copiar'),
              h('button', {
                onClick: ligar,
                title: 'Ligar pro entregador',
                className: 'text-[11px] px-2.5 py-1.5 border border-gray-200 rounded-md hover:bg-white text-gray-700',
              }, 'Ligar'),
            ),
          )
        : h('div', { className: 'p-3 bg-gray-50 rounded-lg text-xs text-gray-400 italic text-center' },
            // Sem dados do entregador. A mensagem depende do status: se a
            // entrega já avançou (provider não expôs o courier — comum em
            // sandbox), não faz sentido dizer "aguardando atribuição".
            (function () {
              const st = e.status_canonico;
              if (st === 'DELIVERED')   return 'Entrega concluída.';
              if (st === 'FAILED' || st === 'FALLBACK_QUEUE')
                return e.erro_ultimo
                  ? String(e.erro_ultimo).replace(/^Erro\s+[^:]+:\s*/i, '')
                  : 'Falha no despacho — sem entregador vinculado.';
              if (st === 'CANCELED' || st === 'RETURNED')
                return 'Entrega encerrada sem entregador vinculado.';
              if (['COURIER_ASSIGNED','PICKUP_EN_ROUTE','ARRIVED_PICKUP',
                   'PICKED_UP','DROPOFF_EN_ROUTE','ARRIVED_DROPOFF'].includes(st))
                return 'Em andamento — dados do entregador não informados pelo provedor.';
              return 'Aguardando atribuição de entregador...';
            })()
          ),

      // ── 🆕 Tentativas de despacho (so quando houve re-despacho/cancelamento) ──
      h(TentativasDespacho, { dados: tentativas }),

      // ── Rodapé com timestamps ──
      h('div', { className: 'flex items-center justify-between gap-2 pt-2 border-t border-gray-100 text-[11px] text-gray-400 flex-wrap' },
        h('span', null,
          'Despachada ', fmtDT(e.created_at),
          e.finalizado_at ? ` · Finalizada ${fmtDT(e.finalizado_at)}` : '',
          duracao ? ` · Duração ${duracao}` : '',
        ),
      ),
    );
  }

  // Data local (YYYY-MM-DD) de um timestamp, no fuso de Brasília.
  function dataLocalBRT(ts) {
    const d = ts instanceof Date ? ts : new Date(ts);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  }

  // ════════════════════════════════════════════════════════
  // TEMPO / TRILHA — indicador de coleta nos cards + trilha no detalhe
  // ════════════════════════════════════════════════════════
  const SLA_COLETA_MIN = 15;  // limite global despacho→coleta (min). Acima disso = atrasado.
  const SLA_LOCALIZAR_MIN = 10;  // limite (min) p/ localizar entregador (estágio 1).

  // Tabela "Prazo Padrão" (faixas km → minutos) carregada de GET /bi/prazo-padrao.
  // Cache em escopo de módulo, compartilhada por todos os cards.
  let _prazoFaixas = null;
  function setPrazoFaixas(fx) { _prazoFaixas = Array.isArray(fx) ? fx : null; }
  // Prazo total (min) para uma distância, conforme a tabela; fallback na fórmula.
  function prazoPorKm(km) {
    if (km == null || isNaN(km)) return null;
    const fx = _prazoFaixas;
    if (Array.isArray(fx) && fx.length) {
      for (const f of fx) {
        const lo = Number(f.km_min) || 0;
        const hi = (f.km_max == null || f.km_max === '') ? Infinity : Number(f.km_max);
        if (km >= lo && km < hi) return Number(f.prazo_minutos) || null;
      }
      const ult = fx[fx.length - 1];
      if (ult && Number(ult.prazo_minutos)) return Number(ult.prazo_minutos);
    }
    return 60 + Math.max(0, Math.ceil((km - 10) / 5)) * 15;
  }

  function _tsValido(x) { const t = x ? new Date(x).getTime() : NaN; return isNaN(t) ? null : t; }
  function _minsEntre(a, b) {
    const d1 = _tsValido(a), d2 = _tsValido(b);
    if (d1 == null || d2 == null) return null;
    return Math.max(0, Math.round((d2 - d1) / 60000));
  }
  function _fmtHora(ts) {
    try { return new Date(ts).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
    catch (_) { return '—'; }
  }
  function _fmtDur(min) {
    if (min == null) return null;
    if (min < 60) return min + ' min';
    const hh = Math.floor(min / 60), mm = min % 60;
    return hh + 'h' + (mm ? ' ' + mm + 'min' : '');
  }
  function _clsFaixa(min) {
    if (min == null) return 'bg-gray-50 text-gray-500';
    if (min > SLA_COLETA_MIN) return 'bg-red-50 text-red-700';
    if (min >= SLA_COLETA_MIN - 5) return 'bg-amber-50 text-amber-700';
    return 'bg-green-50 text-green-700';
  }

  // HUB_CLEAN_V1: % decorrido do limite, p/ a barra de 4px do card (0–100).
  function _pctBar(m, lim) { if (m == null || !lim) return 100; return Math.max(4, Math.min(100, Math.round((m / lim) * 100))); }
  // Indicador de tempo do card. Retorna { label, texto, cls, pct } ou null.
  function indicadorTempo(e) {
    const st = e && e.status_canonico;
    if (['CANCELED', 'FAILED', 'FALLBACK_QUEUE'].includes(st)) return null;

    const km      = e.distancia_km != null ? parseFloat(e.distancia_km) : null;
    const prazo   = prazoPorKm(km);                       // SLA total (min) por distância
    const metaTxt = prazo != null ? ' / ' + _fmtDur(prazo) : '';

    // ENTREGUE → tempo total (desde a criação) vs SLA da tabela
    if (st === 'DELIVERED') {
      const fim = _tsValido(e.entregue_at) || _tsValido(e.finalizado_at);
      const tot = fim != null ? _minsEntre(e.created_at, fim) : null;
      if (tot == null) return { label: 'entregue', texto: 'concluída', cls: 'bg-gray-50 text-gray-500', pct: 100 };
      const dentro = (prazo != null) ? tot <= prazo : null;
      const cls = dentro == null ? 'bg-gray-50 text-gray-500' : (dentro ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700');
      const suf = dentro == null ? '' : (dentro ? ' · no prazo' : ' · fora do prazo');
      return { label: 'tempo total', texto: '' + (_fmtDur(tot) || '—') + metaTxt + suf, cls, pct: _pctBar(tot, prazo) };
    }
    if (st === 'RETURNING') {
      return { label: 'devolução', texto: 'devolvendo', cls: 'bg-amber-50 text-amber-700', pct: 100 };
    }
    if (st === 'RETURNED') {
      return { label: 'devolução', texto: 'devolvido', cls: 'bg-amber-50 text-amber-700', pct: 100 };
    }

    // cor por (decorrido, limite) com faixa curta de atenção (3 min antes)
    const _corLim = (mm, lim) => {
      if (lim == null || mm == null) return 'bg-green-50 text-green-700';
      if (mm > lim) return 'bg-red-50 text-red-700';
      if (mm >= lim - 3) return 'bg-amber-50 text-amber-700';
      return 'bg-green-50 text-green-700';
    };

    // EM ROTA (já coletou) → tempo desde a criação vs SLA por distância
    const emRota = ['PICKED_UP', 'DROPOFF_EN_ROUTE', 'ARRIVED_DROPOFF'].includes(st) || !!e.coletado_at;
    if (emRota) {
      const m = _minsEntre(e.created_at, Date.now());
      const atrasado = prazo != null && m != null && m > prazo;
      const perto    = prazo != null && m != null && m >= prazo - 10 && m <= prazo;
      const cls = atrasado ? 'bg-red-50 text-red-700' : (perto ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700');
      return { label: 'em rota de entrega', texto: '' + (m != null ? _fmtDur(m) : '—') + metaTxt + (atrasado ? ' · atrasado' : ''), cls, pct: _pctBar(m, prazo) };
    }

    // ESTÁGIO 2 — entregador atribuído → coleta: limite desde a ATRIBUIÇÃO
    const atribuido = !estaProcurando(e) && (!!e.entregador_nome || ['COURIER_ASSIGNED', 'PICKUP_EN_ROUTE', 'ARRIVED_PICKUP'].includes(st));
    if (atribuido) {
      const base = _tsValido(e.atribuido_at) || _tsValido(e.created_at);
      const m = _minsEntre(base, Date.now());
      const atrasado = m != null && m > SLA_COLETA_MIN;
      return { label: 'aguardando coleta', texto: '' + (m != null ? _fmtDur(m) : '—') + ' / ' + _fmtDur(SLA_COLETA_MIN) + (atrasado ? ' · atrasado' : ''), cls: _corLim(m, SLA_COLETA_MIN), pct: _pctBar(m, SLA_COLETA_MIN) };
    }

    // ESTÁGIO 1 — procurando entregador: limite desde a CRIAÇÃO
    const mLoc = _minsEntre(e.created_at, Date.now());
    const atrasadoLoc = mLoc != null && mLoc > SLA_LOCALIZAR_MIN;
    return { label: 'aguardando entregador', texto: '' + (mLoc != null ? _fmtDur(mLoc) : '—') + ' / ' + _fmtDur(SLA_LOCALIZAR_MIN) + (atrasadoLoc ? ' · atrasado' : ''), cls: _corLim(mLoc, SLA_LOCALIZAR_MIN), pct: _pctBar(mLoc, SLA_LOCALIZAR_MIN) };
  }
  // Extrai o payload de um evento (JSONB pode vir como objeto ou string).
  function _payloadEvt(w) {
    let p = w && w.payload;
    if (typeof p === 'string') { try { p = JSON.parse(p); } catch (_) { p = null; } }
    return p || null;
  }

  // Trilha da entrega: Criação → Coleta → (Devolução) → Entrega, com duração
  // por estágio, trocas de entregador (payload.reatribuicao) e devolução.
  function TrilhaEntrega({ entrega: e, webhooks }) {
    const evs = Array.isArray(webhooks) ? webhooks : [];
    const primeiroEvento = (canon) => {
      const arr = evs.filter(w => String(w.status_canonico || '').toUpperCase() === canon)
                     .map(w => _tsValido(w.created_at)).filter(x => x != null);
      return arr.length ? Math.min.apply(null, arr) : null;
    };
    const trocas = evs.map(w => {
      const p = _payloadEvt(w);
      if (!p || p.reatribuicao !== true) return null;
      return { ts: _tsValido(w.created_at), idAnterior: p.id_anterior, nomeAnterior: p.nome_anterior || null, nomeNovo: p.nome_novo || null };
    }).filter(x => x && x.ts != null);

    const tCriacao = _tsValido(e.created_at);
    const tColeta  = _tsValido(e.coletado_at) || primeiroEvento('PICKED_UP');
    const tDevolIni = primeiroEvento('RETURNING');   // devolução iniciada (SendBack)
    const tRetorno = tDevolIni || primeiroEvento('RETURNED'); // fallback p/ dados antigos
    const tDevolFim = primeiroEvento('RETURNED');    // devolução concluída (SendBackCompleted)
    const tEntrega = _tsValido(e.entregue_at) || primeiroEvento('DELIVERED')
                   || (e.status_canonico === 'DELIVERED' ? _tsValido(e.finalizado_at) : null);
    const houveDevol = tRetorno != null || tDevolFim != null || ['RETURNING', 'RETURNED'].includes(e.status_canonico);

    const marcos = [];
    if (tCriacao != null) marcos.push({ k: 'criacao', titulo: 'Criação / Despacho', ts: tCriacao, node: 'done' });
    if (tColeta  != null) marcos.push({ k: 'coleta',  titulo: 'Coleta',             ts: tColeta,  node: 'done' });
    if (tDevolIni != null) marcos.push({ k: 'devol',   titulo: 'Devolução iniciada', ts: tDevolIni, node: 'warn', nota: 'Item retornando ao remetente (sendback)' });
    if (tDevolFim != null) marcos.push({ k: 'devolfim', titulo: 'Devolução concluída', ts: tDevolFim, node: 'done' });
    if (tEntrega != null && !houveDevol) marcos.push({ k: 'entrega', titulo: 'Entrega', ts: tEntrega, node: 'done' });
    marcos.sort((a, b) => a.ts - b.ts);
    if (marcos.length === 0) return null;

    const totalMin = marcos.length >= 2 ? Math.round((marcos[marcos.length - 1].ts - marcos[0].ts) / 60000) : null;

    return h('div', { className: 'pt-3 border-t border-gray-100' },
      h('div', { className: 'text-xs uppercase tracking-wider text-purple-700 font-semibold mb-3' }, h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-pin" })), "Trilha da entrega")),
      h('div', { className: 'pl-1' },
        marcos.map((m, i) => {
          const prox = marcos[i + 1];
          const durMin = prox ? Math.round((prox.ts - m.ts) / 60000) : null;
          const trocasAqui = trocas.filter(t => t.ts >= m.ts && (!prox || t.ts < prox.ts));
          const dotCls = m.node === 'warn' ? 'border-amber-500 bg-amber-500' : 'border-purple-600 bg-purple-600';
          const durLate = m.k === 'criacao' && durMin != null && durMin > SLA_COLETA_MIN;
          return h('div', { key: i, className: 'flex gap-3' },
            h('div', { className: 'flex flex-col items-center flex-shrink-0' },
              h('span', { className: `w-3 h-3 rounded-full border-2 ${dotCls}` }),
              prox && h('span', { className: 'w-0.5 flex-1 bg-gray-200 my-1', style: { minHeight: '22px' } }),
            ),
            h('div', { className: 'flex-1 pb-3' },
              h('div', { className: 'text-[13px] font-bold text-gray-800' }, m.titulo),
              h('div', { className: 'text-[11px] text-gray-400 mt-0.5' }, _fmtHora(m.ts)),
              m.nota && h('div', { className: 'text-[11px] text-amber-700 bg-amber-50 rounded-md px-2 py-1 mt-1 inline-block' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-corner' })) + m.nota),
              trocasAqui.map((t, j) => h('div', { key: 'tr' + j, className: 'text-[11px] text-purple-700 bg-purple-50 rounded-md px-2 py-1 mt-1' },
                'Troca de entregador · ' + _fmtHora(t.ts) + ((t.nomeAnterior && t.nomeNovo) ? ' — ' + t.nomeAnterior + ' → ' + t.nomeNovo : (t.nomeAnterior ? ' — anterior: ' + t.nomeAnterior : (t.idAnterior ? ' — anterior #' + t.idAnterior : ''))))),
              durMin != null && h('div', { className: `text-[10px] font-bold mt-1 inline-block px-2 py-0.5 rounded ${durLate ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}` },
                (m.k === 'criacao' ? (_fmtDur(durMin) + ' até a coleta') : (_fmtDur(durMin) + ' até ' + prox.titulo.toLowerCase())) + (durLate ? ' · acima do SLA' : '')),
            ),
          );
        }),
      ),
      totalMin != null && h('div', { className: 'flex justify-between items-center pt-2 mt-1 border-t border-gray-100 text-[12px] font-bold text-gray-700' },
        h('span', null, 'Tempo total'), h('span', null, _fmtDur(totalMin) || '—')),
    );
  }

  // ════════════════════════════════════════════════════════
  // KANBAN — visão por status (reusa helpers e a mesma lógica do CardEntrega)
  // ════════════════════════════════════════════════════════
  // [hub-falha-alerta-v2] Falhas em PRIMEIRO lugar: e a coluna que exige acao
  // imediata do admin. As demais seguem o fluxo natural da corrida.
  const KANBAN_COLS = [
    // HUB_CLEAN_V1: cor = ponto do cabeçalho; recolhida = vai pra coluna estreita "Recolhidas"
    { id: 'falha',    nome: 'Falhas',                dot: 'bg-red-500',    cnt: 'bg-red-500',    cor: '#dc2626' },
    { id: 'aguard',   nome: 'Aguardando entregador', dot: 'bg-purple-600', cnt: 'bg-purple-600', cor: '#770fa8' },
    { id: 'coleta',   nome: 'Aguardando coleta',     dot: 'bg-blue-500',   cnt: 'bg-blue-500',   cor: '#2563eb' },
    { id: 'coletou',  nome: 'Coletou',               dot: 'bg-amber-500',  cnt: 'bg-amber-500',  cor: '#d97706' },
    { id: 'entregue', nome: 'Entregue',              dot: 'bg-green-500',  cnt: 'bg-green-500',  cor: '#16a34a' },
    { id: 'devol',    nome: 'Devolução',             dot: 'bg-orange-500', cnt: 'bg-orange-500', cor: '#d97706', recolhida: true },
    { id: 'cancel',   nome: 'Cancelado',             dot: 'bg-gray-400',   cnt: 'bg-gray-400',   cor: '#9ca3af', recolhida: true },
    // EXTRAVIADOS_COL_V1
    { id: 'extraviado', nome: 'Extraviados',         dot: 'bg-pink-500',   cnt: 'bg-pink-500',   cor: '#991b1b', recolhida: true },
  ];

  // Mapeia uma entrega pra uma das 7 colunas, a partir do status canônico
  // (com rede de segurança no status nativo/legado).
  function colunaDoStatus(e) {
    const c = String((e && e.status_canonico) || '').toUpperCase();
    const n = String((e && e.status_uber) || '').toLowerCase();
    // EXTRAVIADOS_COL_V1: o marcador do admin e soberano — vence qualquer
    // status vindo do provedor. Sai da coluna atual e vai pra Extraviados.
    if (e && e.extraviado_em) return 'extraviado';
    if (c === 'DELIVERED' || ['delivered', 'entregue', 'completed', 'finalizado', 'concluido'].includes(n)) return 'entregue';
    if (c === 'RETURNED' || c === 'RETURNING' || ['sendback', 'sendbackcompleted', 'devolucao', 'devolvido', 'devolvendo'].includes(n)) return 'devol';
    if (c === 'CANCELED' || ['canceled', 'cancelado'].includes(n)) return 'cancel';
    if (c === 'FAILED' || c === 'FALLBACK_QUEUE' || ['erro', 'fallback_fila'].includes(n)) return 'falha';
    if (['PICKED_UP', 'DROPOFF_EN_ROUTE', 'ARRIVED_DROPOFF'].includes(c) || ['pickup_complete', 'dropoff'].includes(n)) return 'coletou';
    if (['COURIER_ASSIGNED', 'PICKUP_EN_ROUTE', 'ARRIVED_PICKUP'].includes(c) || ['entregador_atribuido', 'pickup', 'waiting'].includes(n)) return 'coleta';
    return 'aguard';
  }

  // Card compacto do Kanban — MESMA informação do CardEntrega, em compartimentos.
  // REDESPACHO_BTN_V1: onRedespachoRapido e prop nova (ver CardEntrega).
  function CardKanban({ entrega, coluna, tentativas, onCancelar, onVerTracking, onVerDetalhes, onRedespachar, onRedespachoRapido, onReportar, onChat, unread, ehFrequente, showToast, onExtraviar, onDesfazerExtravio }) {
    const e = entrega;
    // HUB_CLEAN_V1: menu "…" (posição fixa) e trilha de tentativas aberta pelo menu
    const [menu, setMenu] = useState(null);
    const [verTent, setVerTent] = useState(false);
    useEffect(() => {
      if (!menu) return;
      const fora = (ev) => { if (ev.target && ev.target.closest && ev.target.closest('[data-hub-menu],[data-hub-menu-btn]')) return; setMenu(null); };
      const rolou = (ev) => { if (ev.target && ev.target.closest && ev.target.closest('[data-hub-menu]')) return; setMenu(null); };
      const esc = (ev) => { if (ev.key === 'Escape') setMenu(null); };
      document.addEventListener('mousedown', fora); window.addEventListener('scroll', rolou, true); document.addEventListener('keydown', esc); window.addEventListener('resize', fora);
      return () => { document.removeEventListener('mousedown', fora); window.removeEventListener('scroll', rolou, true); document.removeEventListener('keydown', esc); window.removeEventListener('resize', fora); };
    }, [menu]);
    const ehProprio    = String(e.provider_code || '') === 'proprio'; // MOTO_PROPRIA_FRONT_V1
    const freq = !!(ehFrequente && e.entregador_telefone && ehFrequente(e.entregador_telefone));
    // EXTRAVIADOS_CARD_V1: so da pra extraviar o que ja foi coletado — antes
    // disso o pacote nem saiu da loja.
    const extraviado = !!e.extraviado_em;
    const jaColetou = !!e.coletado_at ||
      ['PICKED_UP', 'DROPOFF_EN_ROUTE', 'ARRIVED_DROPOFF', 'DELIVERED', 'RETURNING', 'RETURNED']
        .includes(String(e.status_canonico || '').toUpperCase());
    const podeExtraviar = jaColetou && !extraviado && !ehProprio;
    const valorUber    = parseFloat(e.valor_uber || e.valor_provider || 0);
    const valorHub     = parseFloat(e.valor_servico || 0);
    const margemHub    = Math.round((valorHub - valorUber) * 100) / 100;
    const margemHubPct = valorUber > 0 ? Math.round((margemHub / valorUber) * 1000) / 10 : null;
    const margemPos    = margemHub >= 0;
    const temCusto     = valorUber > 0;
    const prov         = provedorInfo(e);
    const eh99         = ['noventanove','99'].includes(String(e.provider_code || e.provider || '').toLowerCase());
    const ind          = indicadorTempo(e);

    const TERMINAIS_CANON  = ['DELIVERED', 'CANCELED', 'RETURNED', 'FAILED', 'FALLBACK_QUEUE'];
    const TERMINAIS_NATIVE = ['delivered', 'cancelado', 'canceled', 'entregue', 'finalizado', 'concluido', 'fallback_fila'];
    const podeCancelar  = !TERMINAIS_CANON.includes(e.status_canonico) && !TERMINAIS_NATIVE.includes(e.status_uber) && !ehProprio;
    // REDESPACHO_BTN_V1: ver comentario em CardEntrega — a 99 nao cancela
    // depois da coleta.
    const podeRedespachar = ANTES_DA_COLETA_CANON.includes(e.status_canonico) && String(e.provider_code || e.provider || '').toLowerCase() !== 'uber'; // UBER_NO_REDISPATCH_V1
    const temEntregador = !!e.entregador_nome && !estaProcurando(e);

    function copiarTel() {
      if (!e.entregador_telefone) { showToast && showToast('Sem telefone do entregador', 'error'); return; }
      try { navigator.clipboard.writeText(e.entregador_telefone); showToast && showToast('Telefone copiado', 'success'); }
      catch (_) { showToast && showToast('Não foi possível copiar', 'error'); }
    }
    function ligar() {
      if (!e.entregador_telefone) { showToast && showToast('Sem telefone do entregador', 'error'); return; }
      if (isMobile()) { window.location.href = `tel:${e.entregador_telefone}`; }
      else { copiarTel(); showToast && showToast('Desktop: número copiado, ligue do seu celular', 'info'); }
    }
    function msgSemEntregador() {
      const st = e.status_canonico;
      if (st === 'DELIVERED') return 'Entrega concluída.';
      if (st === 'FAILED' || st === 'FALLBACK_QUEUE')
        return e.erro_ultimo ? String(e.erro_ultimo).replace(/^Erro\s+[^:]+:\s*/i, '') : 'Falha no despacho.';
      if (st === 'CANCELED' || st === 'RETURNED') return 'Encerrada sem entregador.';
      if (['COURIER_ASSIGNED', 'PICKUP_EN_ROUTE', 'ARRIVED_PICKUP', 'PICKED_UP', 'DROPOFF_EN_ROUTE', 'ARRIVED_DROPOFF'].includes(st))
        return 'Em andamento — entregador não informado.';
      return 'Aguardando atribuição…';
    }

    // BORDA_LILAS_ADMIN_V1: card comum ganha borda lilas definida.
    // purple-200 e o MESMO tom do chip "Codigo de coleta" (CodigoBadge) que ja
    // vive dentro do card — mantem o roxo do projeto em vez de introduzir um
    // violet-* que nao e usado em lugar nenhum.
    // Todos com o mesmo peso (2px): quem diferencia frequente/extraviado e a
    // cor + a faixa no topo, nao a espessura.
    // BORDA_LILAS_V2: card comum com borda lilas VISIVEL.
    // purple-300 (#e9d5f9) e o equivalente do amber-300 na escala do Tailwind
    // — mesmo nivel de definicao da borda do parceiro frequente, so que roxo.
    // (o v1 usava purple-200 = #f3e8fb, que e cor de FUNDO: some como borda)
    // Todos com o mesmo peso (2px): quem diferencia e a cor + a faixa no topo.
    // BUSCA_SIMULTANEA_LOGO_V1: em corrida simultanea (grupo sem vencedor),
    // mostra os DOIS provedores pulsando no lugar do logo unico.
    const buscandoSimultaneo = !!e.grupo_simultaneo && e.grupo_vencedor == null
      && !['DELIVERED','CANCELED','RETURNED','FAILED','FALLBACK_QUEUE'].includes(String(e.status_canonico || '').toUpperCase())
      && !ehProprio;

    // HUB_CLEAN_V1 — card no padrão clean: branco, borda #e5e7eb, sem faixas/gradientes.
    // Frequente/extraviado viram pílulas no topo; ações raras foram pro menu "…".
    // Nenhuma ação sumiu: Detalhes, Editar, Cancelar, Desfazer, Reportar, Extraviar,
    // Copiar (OS/telefone), Tentativas de despacho continuam acessíveis.
    const temHistorico = !!(tentativas && Array.isArray(tentativas.eventos) &&
      (tentativas.eventos.length > 1 || tentativas.eventos.some(x => x.tipo === 'canceled')));
    const nTent = temHistorico ? (tentativas.total_tentativas || tentativas.eventos.filter(x => String(x.tipo).indexOf('dispatch') === 0).length) : 0;
    const MONO = { fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace" };
    const corInd = !ind ? null : /red/.test(ind.cls) ? ['#dc2626', '#991b1b'] : /amber/.test(ind.cls) ? ['#d97706', '#92400e'] : /green/.test(ind.cls) ? ['#16a34a', '#166534'] : ['#9ca3af', '#6b7280'];
    const statusTxt = resolverStatus(e).label;
    const hora = (function () { const t = _tsValido(e.created_at); if (t == null) return '—'; try { return new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); } catch (_) { return '—'; } })();
    const kmTxt = e.distancia_km != null ? Number(e.distancia_km).toFixed(1).replace('.', ',') + ' km' : null; /* MP_KM_CARD_V4 */
    const provBadge = (code) => {
      const c = (code === '99') ? 'noventanove' : code;
      const st = c === 'uber' ? { background: '#111827', color: '#ffffff', t: 'Uber', title: 'Uber Direct' }
        : c === 'noventanove' ? { background: '#f3f4f6', color: '#111827', t: '99', title: '99Entrega' }
        : c === 'proprio' ? { background: '#f0fdf4', color: '#166534', t: 'Moto própria', title: 'Moto própria (Tutts)' }
        : { background: '#f3f4f6', color: '#6b7280', t: 'sem provedor', title: 'Sem provedor identificado' };
      return h('span', { key: c || 'na', title: st.title, style: { fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: st.background, color: st.color, whiteSpace: 'nowrap', flexShrink: 0 } }, st.t);
    };
    // GEOCODE_ORIGEM_V1: selo "Endereço geocodificado" separado entre cache (sem custo) e Google (pago), com o motivo
    const GEO_MOTIVO = {
      nunca_consultado: ['1ª vez', 'Endereço nunca consultado antes. Foi pago uma vez e agora fica no cache para sempre.'],
      texto_diferente: ['texto diferente', 'Esse MESMO lugar já estava no cache, mas escrito de outro jeito. Pagou de novo só porque o texto mudou.'],
      cache_sem_detalhes: ['atualização', 'Estava no cache sem rua/número e foi atualizado uma vez.'],
    };
    const GEO_CONTEXTO = {
      sem_coord_mapp: 'A OS veio da Mapp sem localização da entrega.',
      regra_forca_google: 'A regra do cliente manda geocodificar a entrega (ignora a localização da Mapp).',
      sem_regra: 'OS sem regra (lançamento manual): o Hub geocodifica a entrega.',
    };
    const seloGeocode = (g) => {
      const base = 'O endereço da entrega foi geocodificado automaticamente — confira antes de confiar 100%.';
      if (!g) return pilula('Endereço geocodificado', 'bg-amber-50 text-amber-800', { title: base + ' (corrida anterior ao registro de origem)' });
      const [mot, ctx] = String(g.motivo || '').split('|');
      const contexto = GEO_CONTEXTO[ctx] ? ' ' + GEO_CONTEXTO[ctx] : '';
      if (g.fonte !== 'google') {
        return pilula('Geocodificado · cache', 'bg-emerald-50 text-emerald-800', { title: 'Coordenada veio do cache — sem custo.' + contexto + ' ' + base });
      }
      const m = GEO_MOTIVO[mot] || ['Google', ''];
      return pilula('Geocodificado · Google · ' + m[0], 'bg-amber-50 text-amber-800',
        { title: 'Consultado no Google (pago). ' + m[1] + (mot === 'texto_diferente' && g.detalhe ? ' Texto já salvo: "' + g.detalhe + '".' : '') + contexto + ' ' + base });
    };
    const pilula = (txt, cls, extra) => h(extra && extra.onClick ? 'button' : 'span', Object.assign({ className: `inline-flex items-center gap-1 text-[10.5px] font-semibold rounded-full px-2 py-0.5 ${cls}` }, extra || {}), txt);
    const btnBase = 'h-8 px-2 rounded-lg border text-xs inline-flex items-center gap-1.5 whitespace-nowrap ';
    const temRastreio = !!(e.rastreio_token || e.tracking_url);
    const nomeProvBusca = prov.tipo === 'uber' ? 'Uber' : prov.tipo === '99' ? '99' : 'provedor';

    // menu "…" — posição fixa (escapa do overflow do quadro)
    function abrirMenu(ev) {
      if (menu) { setMenu(null); return; }
      const r = ev.currentTarget.getBoundingClientRect();
      const W = 232, H = itensMenu.length * 36 + 10;
      const left = Math.max(8, Math.min(r.right - W, window.innerWidth - W - 8));
      let top = r.bottom + 4;
      if (top + H > window.innerHeight - 8) top = Math.max(8, r.top - H - 4);
      setMenu({ top, left, W });
    }
    const itensMenu = [
      onVerDetalhes && { l: 'Detalhes', ic: 'eye', fn: () => onVerDetalhes(e) },
      temHistorico && { l: (verTent ? 'Ocultar' : 'Ver') + ` tentativas de despacho (${nTent})`, ic: 'list', fn: () => setVerTent(v => !v) },
      podeCancelar && onRedespachar && { l: 'Editar', ic: 'pencil', fn: () => onRedespachar(e) },
      { l: 'Copiar OS', ic: 'copy', fn: () => copiarTextoOS(e.codigo_os, showToast) },
      temEntregador && e.entregador_telefone && { l: 'Copiar telefone', ic: 'phone', fn: copiarTel },
      temEntregador && !ehProprio && onReportar && { l: 'Reportar ocorrência / bloquear', ic: 'alert', fn: () => onReportar(e) },
      // EXTRAVIADOS_BTN_V1
      temEntregador && podeExtraviar && onExtraviar && { l: 'Marcar como extraviado', ic: 'package', fn: () => onExtraviar(e) },
      // EXTRAVIADOS_DESFAZER_V1
      extraviado && onDesfazerExtravio && { l: 'Desfazer extravio', ic: 'refresh', fn: () => onDesfazerExtravio(e) },
      (podeCancelar || ehProprio) && onCancelar && { l: 'Cancelar', ic: 'x', perigo: true, fn: () => onCancelar(e) }, /* MP_CANCEL_BTN_V4 */
    ].filter(Boolean);

    return h('article', { className: 'bg-white border border-gray-200 rounded-[14px] p-3.5 flex flex-col gap-2.5 min-w-0' },
      // pílulas discretas no topo (frequente / extraviado / tentativas)
      (extraviado || freq || temHistorico) && h('div', { className: 'flex flex-wrap gap-1.5' },
        extraviado && pilula([h('span', { key: 'd', className: 'w-1.5 h-1.5 rounded-full bg-red-600' }), 'Extraviado'], 'bg-red-50 text-red-800'),
        !extraviado && freq && pilula([h('span', { key: 'd', className: 'w-1.5 h-1.5 rounded-full bg-amber-600' }), 'Parceiro frequente'], 'bg-amber-50 text-amber-800'),
        temHistorico && pilula(`${nTent} tentativas`, 'bg-gray-100 text-gray-600 hover:bg-gray-200', { type: 'button', onClick: () => setVerTent(v => !v), 'aria-expanded': verTent, title: 'Ver tentativas de despacho' }),
      ),
      // linha 1: OS + provedor + hora
      h('div', { className: 'flex items-center gap-2 min-w-0' },
        h('button', { type: 'button', className: 'text-[13px] font-bold text-gray-900 whitespace-nowrap', style: MONO, title: 'Clique para copiar a OS', onClick: (ev) => { ev.stopPropagation(); copiarTextoOS(e.codigo_os, showToast); } }, `OS ${e.codigo_os}`),
        buscandoSimultaneo ? [provBadge('noventanove'), provBadge('uber')] : provBadge(ehProprio ? 'proprio' : prov.code),
        h('span', { className: 'ml-auto text-[11px] text-gray-400 whitespace-nowrap tabular-nums', title: 'Despachada ' + fmtDT(e.created_at) }, hora, kmTxt && ' · ' + kmTxt),
      ),
      // linha 2: cliente + status
      h('div', { className: 'flex items-center gap-2 text-xs min-w-0' },
        h('span', { className: 'text-gray-500 truncate', title: e.cliente_nome_regra || 'Manual / sem regra' }, e.cliente_nome_regra || 'Manual / sem regra'),
        h('span', { className: 'ml-auto text-[11px] text-gray-400 whitespace-nowrap' }, statusTxt),
      ),
      // faixa de tempo: texto + barra 4px (lógica do indicadorTempo)
      ind && h('div', { className: 'flex flex-col gap-1' },
        h('div', { className: 'flex justify-between gap-2 text-[11.5px]' },
          h('span', { className: 'text-gray-500' }, ind.label),
          h('span', { className: 'font-semibold tabular-nums text-right', style: { color: corInd[1] } }, ind.texto)),
        h('div', { className: 'h-1 rounded-full bg-gray-100 overflow-hidden' },
          h('div', { className: 'h-1 rounded-full', style: { width: (ind.pct != null ? ind.pct : 100) + '%', background: corInd[0] } })),
      ),
      // rota: coleta (anel) e entrega (ponto)
      h('div', { className: 'grid gap-x-2 gap-y-1 text-xs items-center', style: { gridTemplateColumns: '10px minmax(0,1fr)' } },
        h('span', { 'aria-hidden': 'true', style: { width: 7, height: 7, borderRadius: 99, border: '2px solid #770fa8', boxSizing: 'border-box' } }),
        h('span', { className: 'truncate text-gray-700', title: 'Coleta: ' + (e.endereco_coleta || '—') }, e.endereco_coleta || '—'),
        h('span', { 'aria-hidden': 'true', style: { width: 7, height: 7, borderRadius: 99, background: '#770fa8' } }),
        h('span', { className: 'truncate text-gray-700', title: 'Entrega: ' + (e.endereco_entrega || '—') }, e.endereco_entrega || '—'),
      ),
      // extras da entrega: devolução, geocodificado, cliente final, NF
      (e.return_code || e.entrega_geocodificada || e.cliente_final || e.nota_fiscal) && h('div', { className: 'flex flex-wrap gap-1.5' },
        e.return_code && pilula(['Devolução ', h('b', { key: 'c', style: MONO }, String(e.return_code))], 'bg-amber-50 text-amber-800 cursor-pointer', { title: 'Código de devolução — clique para copiar', onClick: () => { try { navigator.clipboard.writeText(String(e.return_code)); } catch (_) {} } }),
        /* MP_GEOCOD_SELO_V1 */
        e.entrega_geocodificada && seloGeocode(e.entrega_geocode), // GEOCODE_ORIGEM_V1: cache x Google + motivo
        // CLIENTE_FINAL_NF_CARD
        e.cliente_final && pilula(e.cliente_final, 'bg-gray-100 text-gray-700', { title: 'Cliente final' }),
        e.nota_fiscal && pilula('NF ' + e.nota_fiscal, 'bg-gray-100 text-gray-700', { title: 'Nota fiscal' }),
      ),
      // entregador / busca / falha
      temEntregador
        ? h('div', { className: 'flex items-center gap-2.5 pt-2.5 border-t border-gray-100 min-w-0' },
            e.entregador_foto
              ? h('img', { src: e.entregador_foto, alt: '', className: 'w-[30px] h-[30px] rounded-full object-cover flex-shrink-0 bg-purple-100',
                  onError: (ev) => { ev.target.style.display = 'none'; const fb = ev.target.nextSibling; if (fb) fb.style.display = 'grid'; } })
              : null,
            h('span', { className: 'w-[30px] h-[30px] rounded-full bg-purple-100 text-purple-800 text-[11px] font-bold flex-shrink-0 place-items-center', style: { display: e.entregador_foto ? 'none' : 'grid' } }, iniciaisDoNome(e.entregador_nome)),
            h('div', { className: 'min-w-0 flex-1' },
              h('div', { className: 'text-[12.5px] font-semibold text-gray-900 truncate' }, e.entregador_nome),
              h('div', { className: 'text-[11px] text-gray-500 truncate' }, ehProprio ? 'motoboy próprio' : (fmtTelefoneBR(e.entregador_telefone) || '—'))),
            e.pickup_code && h('button', { type: 'button', className: 'text-right flex-shrink-0', title: 'Código de coleta — clique para copiar', onClick: () => { try { navigator.clipboard.writeText(String(e.pickup_code)); showToast && showToast('Código copiado', 'success'); } catch (_) {} } },
              h('div', { className: 'text-[10px] text-gray-400 uppercase', style: { letterSpacing: '.06em' } }, 'Coleta'),
              h('div', { className: 'text-base font-bold text-gray-900', style: Object.assign({ letterSpacing: '.1em' }, MONO) }, String(e.pickup_code))),
          )
        : buscandoSimultaneo /* BUSCA_SIMULTANEA_CARDANIM_V1 */
        ? h('div', { className: 'flex items-center gap-2 px-2.5 py-2 rounded-[10px] text-xs font-medium', style: { background: '#faf7fd', color: '#5d0b85' } },
            h('span', { className: 'w-[7px] h-[7px] rounded-full flex-shrink-0 animate-pulse', style: { background: '#770fa8', boxShadow: '0 0 0 4px #e9d5f9' } }),
            'Buscando na 99 e na Uber · o primeiro que aceitar leva')
        : (coluna.id === 'falha' || coluna.id === 'cancel')
        ? h('div', { className: 'flex items-center gap-2 px-2.5 py-2 rounded-[10px] text-xs font-medium bg-red-50 text-red-800' },
            h('span', { className: 'w-[7px] h-[7px] rounded-full bg-red-600 flex-shrink-0' }), msgSemEntregador())
        : estaProcurando(e)
        ? h('div', { className: 'flex items-center gap-2 px-2.5 py-2 rounded-[10px] text-xs font-medium', style: { background: '#faf7fd', color: '#5d0b85' } },
            h('span', { className: 'w-[7px] h-[7px] rounded-full flex-shrink-0', style: { background: '#770fa8', boxShadow: '0 0 0 4px #e9d5f9' } }),
            `Chamando entregador na ${nomeProvBusca} · aguardando atribuição`)
        : h('div', { className: 'text-[11.5px] text-gray-500 pt-2.5 border-t border-gray-100' }, msgSemEntregador()),
      // tentativas de despacho (aberta pelo menu ou pela pílula)
      temHistorico && verTent && h(TentativasDespacho, { dados: tentativas, aberta: true, onToggle: () => setVerTent(false) }),
      // ações
      h('div', { className: 'flex flex-wrap items-center gap-1' },
        // REDESPACHO_BTN_V1 — corrida extraviada nao redespacha
        !ehProprio && podeRedespachar && !extraviado && onRedespachoRapido && h('button', { type: 'button', onClick: () => onRedespachoRapido(e),
          title: 'Cancela a corrida atual e chama outro entregador. O atual fica de fora desta OS.',
          className: btnBase + 'font-semibold', style: { borderColor: '#e9d5f9', background: '#faf7fd', color: '#5d0b85' } }, 'Redespachar'),
        h('button', { type: 'button',
          onClick: () => ehProprio ? (e.tracking_url && window.open(e.tracking_url, '_blank', 'noopener,noreferrer')) : (onVerTracking && onVerTracking(e)),
          disabled: !temRastreio, 'aria-label': ehProprio ? 'Abrir rastreio nativo da Tutts' : 'Abrir rastreio',
          title: temRastreio ? null : 'Rastreio disponível quando o entregador aceitar',
          className: btnBase + (temRastreio ? 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50' : 'border-gray-100 bg-white text-gray-300 cursor-not-allowed') }, ehProprio ? 'Rastreio Tutts' : 'Rastreio'),
        (eh99 && onChat) && h('button', { type: 'button', onClick: () => onChat(e), title: 'Abrir chat com o motoboy (99)',
          className: btnBase + 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50' }, 'Chat',
          (unread > 0) && h('span', { className: 'min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold grid place-items-center', style: { background: '#f67602', color: '#26093a' }, 'aria-label': `${unread} não lidas` }, unread > 9 ? '9+' : String(unread))),
        h('button', { type: 'button', 'data-hub-menu-btn': '1', 'aria-label': 'Mais ações', 'aria-haspopup': 'menu', 'aria-expanded': !!menu, onClick: abrirMenu,
          className: 'ml-auto w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 inline-flex items-center justify-center gap-[3px]' },
          [0, 1, 2].map(i => h('span', { key: i, 'aria-hidden': 'true', className: 'w-[3.5px] h-[3.5px] rounded-full bg-current' }))),
      ),
      menu && h('div', { 'data-hub-menu': '1', role: 'menu', 'aria-label': `Ações da OS ${e.codigo_os}`, className: 'bg-white border border-gray-200 rounded-xl py-1',
        style: { position: 'fixed', top: menu.top, left: menu.left, width: menu.W, zIndex: 60, boxShadow: '0 8px 24px rgba(17,24,39,.08)' } },
        itensMenu.map((it, i) => h('button', { key: i, type: 'button', role: 'menuitem', autoFocus: i === 0,
          onClick: () => { setMenu(null); it.fn(); },
          className: 'w-full text-left px-3 py-2 text-[13px] flex items-center gap-2.5 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none ' + (it.perigo ? 'text-red-800' : 'text-gray-700') },
          h('svg', { className: 'ico', 'aria-hidden': 'true', style: { color: it.perigo ? '#dc2626' : '#9ca3af' } }, h('use', { href: '#i-' + it.ic })), it.l))),
    );
  }

  // Quadro Kanban — agrupa as entregas filtradas nas colunas.
  // EXTRAVIADOS_KSIG_V2: marcador UNICO deste patch. A v1 usava um texto que o
  // patch do CardKanban ja gravava, entao este aqui pulava como 'ja aplicado'
  // e o KanbanEntregas ficava sem onExtraviar -> ReferenceError.
  function KanbanEntregas({ entregas, tentativas, onCancelar, onVerTracking, onVerDetalhes, onRedespachar, onRedespachoRapido, onReportar, onChat, unreadMap, ehFrequente, showToast, onExtraviar, onDesfazerExtravio }) { // REDESPACHO_BTN_V1
    // Arrastar pra rolar o quadro na horizontal (click-and-drag estilo carrossel).
    const boardRef = useRef(null);
    // HUB_CLEAN_V1: colunas recolhidas (Devolução/Cancelado/Extraviados) abertas pelo operador
    const [abertas, setAbertas] = useState({});
    useEffect(() => {
      const el = boardRef.current;
      if (!el) return;
      let down = false, startX = 0, startScroll = 0;
      const onDown = (ev) => {
        if (ev.button !== 0) return;
        if (ev.target.closest('button, a, input, textarea, select')) return; // não atrapalha os botões
        down = true; startX = ev.pageX; startScroll = el.scrollLeft;
        el.classList.add('cursor-grabbing');
      };
      const onMove = (ev) => { if (down) el.scrollLeft = startScroll - (ev.pageX - startX); };
      const onUp = () => { down = false; el.classList.remove('cursor-grabbing'); };
      el.addEventListener('mousedown', onDown);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      return () => {
        el.removeEventListener('mousedown', onDown);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
    }, []);

    const grupos = {};
    KANBAN_COLS.forEach(c => { grupos[c.id] = []; });
    (entregas || []).forEach(e => { (grupos[colunaDoStatus(e)] || grupos.aguard).push(e); });
    const visiveis = KANBAN_COLS.filter(c => !c.recolhida || abertas[c.id]);
    const recolhidas = KANBAN_COLS.filter(c => c.recolhida);
    const ponto = (cor) => h('span', { 'aria-hidden': 'true', className: 'w-2 h-2 rounded-full flex-shrink-0', style: { background: cor } });

    return h('div', { ref: boardRef, className: 'flex gap-3.5 overflow-x-auto pb-2 items-start cursor-grab select-none' },
      visiveis.map(col => {
        const itens = grupos[col.id] || [];
        return h('section', { key: col.id, 'aria-label': col.nome, className: 'flex-shrink-0 w-[300px] flex flex-col gap-2.5' },
          h('div', { className: 'flex items-center gap-2 px-1 py-0.5' },
            ponto(col.cor),
            h('h2', { className: 'text-[13px] font-semibold text-gray-700' }, col.nome),
            h('span', { className: 'ml-auto text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-2.5 py-0.5 tabular-nums' }, String(itens.length)),
          ),
          itens.length
            ? itens.map(e => h(CardKanban, {
                key: e.id, entrega: e, coluna: col,
                tentativas: tentativas && tentativas[e.codigo_os],
                onCancelar, onVerTracking, onVerDetalhes, onRedespachar, onRedespachoRapido, onReportar, ehFrequente, showToast, // REDESPACHO_BTN_V1
                onExtraviar, onDesfazerExtravio,
                onChat, unread: (unreadMap && unreadMap[e.codigo_os]) || 0,
              }))
            : h('div', { className: 'text-xs text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded-[14px]' }, 'Nenhuma entrega aqui')
        );
      }),
      // coluna estreita "Recolhidas": clicar abre/fecha a coluna no quadro
      h('div', { className: 'flex-shrink-0 w-[168px] flex flex-col gap-2' },
        h('div', { className: 'text-[11px] font-semibold uppercase text-gray-400 px-1 py-1', style: { letterSpacing: '.08em' } }, 'Recolhidas'),
        recolhidas.map(col => {
          const on = !!abertas[col.id];
          return h('button', { key: col.id, type: 'button', 'aria-pressed': on, title: on ? 'Recolher coluna' : 'Mostrar coluna no quadro',
            onClick: () => setAbertas(a => Object.assign({}, a, { [col.id]: !a[col.id] })),
            className: 'flex items-center gap-2 p-3 rounded-xl border text-left text-[13px] ' + (on ? 'border-purple-200 bg-purple-50 text-purple-800 font-semibold' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50') },
            ponto(col.cor), col.nome,
            h('b', { className: 'ml-auto tabular-nums' }, String((grupos[col.id] || []).length)));
        }),
      ),
    );
  }

  // ════════════════════════════════════════════════════════
  // ABA: ENTREGAS — listagem em cards
  // ════════════════════════════════════════════════════════
  function TabEntregas({ API_URL, fetchAuth, showToast, setEstado }) {
    const [entregas, setEntregas] = useState([]);
    const [tentativas, setTentativas] = useState({}); // 🆕 tentativas de despacho por OS
    // [hub-falha-alerta-v2] alerta de falha nova. falhaAlerta = a entrega a exibir
    // no modal; falhaVistasRef guarda os ids ja mostrados nesta sessao (evita
    // reabrir o mesmo modal a cada refresh da lista).
    const [falhaAlerta, setFalhaAlerta] = useState(null);
    const falhaVistasRef = useRef(new Set());
    const [loading, setLoading] = useState(true);
    const [filtroStatus, setFiltroStatus] = useState('');
    const [busca, setBusca] = useState('');
    const [filtroMargem, setFiltroMargem] = useState('todas'); // todas | positiva | negativa
    const [filtroProvider, setFiltroProvider] = useState('todos'); // todos | uber | noventanove
    const [filtroCliente, setFiltroCliente] = useState('todos'); // FILTRO_CLIENTE_KANBAN: todos | <nome> | __sem__
    // MP_TOGGLE_VER_V1: mostrar/ocultar moto propria no painel. Lembra a escolha.
    const [verProprios, setVerProprios] = useState(() => {
      try { return localStorage.getItem('tutts_kanban_ver_proprios') !== '0'; } catch (_) { return true; }
    });
    const [ordenacao, setOrdenacao] = useState('recente');     // recente | antiga | margem_maior | margem_menor
    const [viewMode] = useState('kanban');                     // Kanban fixo (Lista removida)
    // Chat 99: contadores de nao-lidas por OS (badge nos cards) + abrir chat na aba propria
    const [unreadChat99, setUnreadChat99] = useState({});
    useEffect(() => {
      let vivo = true;
      const puxar = async () => {
        try {
          const r = await fetchAuth(`${API_URL}/logistics/chat99/unread-counts`);
          if (r && r.ok) { const d = await r.json(); if (vivo) setUnreadChat99(d.unread || {}); }
        } catch (_) {}
      };
      puxar();
      const t = setInterval(puxar, 15000);
      return () => { vivo = false; clearInterval(t); };
    }, [API_URL, fetchAuth]);
    const abrirChat99 = (e) => {
      if (setEstado) setEstado(st => ({ ...st, logisticaTab: 'chat', chat99OS: String(e.codigo_os) }));
    };
    // [periodo-v1] filtro de PERIODO (BRT). modoData 'hoje' = dataDe=dataAte=hoje;
    // 'custom' = intervalo livre (inclui datas retroativas). Padrao: hoje.
    const _hojeBRT = dataLocalBRT(new Date());
    const [modoData, setModoData] = useState('hoje');   // 'hoje' | 'custom'
    const [dataDe, setDataDe] = useState(_hojeBRT);     // APLICADO (dispara a busca)
    const [dataAte, setDataAte] = useState(_hojeBRT);   // APLICADO (dispara a busca)
    // [periodo-aplicar-v1] rascunho dos inputs — NAO dispara a busca. So aplica
    // (dataDe/dataAte) quando o usuario define a data FINAL ou clica em Buscar.
    // Evita disparar uma busca gigante ao escolher so a data inicial.
    const [dDe, setDDe] = useState(_hojeBRT);
    const [dAte, setDAte] = useState(_hojeBRT);
    const aplicarPeriodo = (de, ate) => { setDataDe(de); setDataAte(ate); };
    // tick de 1 min — mantém o indicador de tempo ("atrasado") atualizado sem refetch
    const [, setTickTempo] = useState(0);
    useEffect(() => { const _id = setInterval(() => setTickTempo(t => t + 1), 60000); return () => clearInterval(_id); }, []);
    // carrega a tabela de Prazo Padrão (km → min) uma vez, p/ o SLA dos cards
    const [, setPrazoTick] = useState(0);
    useEffect(() => {
      (async () => {
        try {
          const r = await fetchAuth(`${API_URL}/bi/prazo-padrao`);
          const j = await r.json();
          const fx = Array.isArray(j) ? j : (j && j.faixas ? j.faixas : null);
          if (fx && fx.length) { setPrazoFaixas(fx); setPrazoTick(t => t + 1); }
        } catch (_) {}
      })();
    }, []);
    const [detalhesAberto, setDetalhesAberto] = useState(null); // {entrega, tracking, webhooks, loading}
    const [redespachoAberto, setRedespachoAberto] = useState(null); // {entrega, motivo}
    const [redespachando, setRedespachando] = useState(false);
    // REDESPACHO_MODAL_V1 (state) — o confirm() nativo do "Redespachar" virou modal.
    const [redespachoRapidoModal, setRedespachoRapidoModal] = useState(null); // null | {entrega, erro?}
    const [redespachandoRapido, setRedespachandoRapido] = useState(false);
    const [provDropAberto, setProvDropAberto] = useState(false); // RDA_QUICK_DROPSTATE_V3
    // Modal de cotação manual (Opção C)
    const [cotacaoModal, setCotacaoModal] = useState(null); // null | {state, codigoOS, dados, error}
    const [cancelarModal, setCancelarModal] = useState(null); // CANCEL_MODAL_V3: null | {entrega, jaColetou, enviando, motivoSel, motivoTxt, erroMotivo}
    const [tickClock, setTickClock] = useState(0); // força re-render por segundo pro countdown
    // Mini-modal pra pedir código da OS (substitui prompt() nativo do navegador)
    const [pedirCodigoModal, setPedirCodigoModal] = useState(null); // null | {valor: string}

    // Motoboys frequentes: Set de telefones (so digitos) com > 3 pedidos.
    // Carregado uma vez; usado pra destacar (coroa) os cards.
    const [frequentesSet, setFrequentesSet] = useState(null);
    useEffect(() => {
      let vivo = true;
      (async () => {
        try {
          const res = await fetchAuth(`${API_URL}/logistics/frequentes`);
          const json = await res.json();
          if (vivo && res.ok && Array.isArray(json.frequentes)) {
            setFrequentesSet(new Set(json.frequentes.map(f => String(f.telefone || '').replace(/\D/g, '')).filter(Boolean)));
          }
        } catch (_) { /* silencioso: destaque e cosmetico */ }
      })();
      return () => { vivo = false; };
    }, [fetchAuth, API_URL]);
    const ehFrequente = React.useCallback((tel) => {
      if (!frequentesSet) return false;
      return frequentesSet.has(String(tel || '').replace(/\D/g, ''));
    }, [frequentesSet]);

    // Modal de reportar ocorrencia
    const [reportAberto, setReportAberto] = useState(null); // null | entrega

    const carregar = useCallback(async (silencioso) => {
      if (!silencioso) setLoading(true);
      try {
        // 2026-07: filtro de data vai pro BACKEND (traz o dia inteiro, inclusive
        // datas passadas). Antes so o status ia, e a data era filtrada no front
        // sobre os 50 recentes — datas passadas voltavam vazias.
        const qs = [];
        // FILTRO_STATUS_CLIENTSIDE_V1: status agora e filtrado no client (instantaneo, sem re-fetch)
        if (dataDe)  qs.push(`de=${encodeURIComponent(dataDe)}`);
        if (dataAte) qs.push(`ate=${encodeURIComponent(dataAte)}`);
        qs.push('incluir_proprios=1'); // MOTO_PROPRIA_FRONT_V1
        const url = `${API_URL}/logistics/deliveries${qs.length ? `?${qs.join('&')}` : ''}`;
        const res = await fetchAuth(url);
        const json = await res.json();
        const lista = json.entregas || [];
        setEntregas(lista);

        // [hub-falha-alerta-v2] Detecta falha NOVA que ninguem confirmou ainda.
        // Regra: esta na coluna 'falha' E falha_ciente_em vazio. O ciente e
        // gravado no banco, entao quando um admin confirma, silencia pra TODOS.
        // falhaVistasRef evita reabrir o modal a cada refresh nesta sessao.
        try {
          const novas = (lista || []).filter(e =>
            colunaDoStatus(e) === 'falha' &&
            !e.falha_ciente_em &&
            !falhaVistasRef.current.has(e.id)
          );
          if (novas.length > 0) {
            const alvo = novas[0];
            falhaVistasRef.current.add(alvo.id);
            setFalhaAlerta({ entrega: alvo, restantes: novas.length - 1 });
          }
        } catch (_) { /* deteccao nunca quebra a lista */ }

        // 🆕 2026-07: tentativas de despacho por OS (batch) — alimenta a secao
        // "Tentativas de despacho" do card. Nao bloqueia a lista se falhar.
        try {
          const oss = Array.from(new Set(lista.map(e => e.codigo_os).filter(Boolean)));
          if (oss.length > 0) {
            const rt = await fetchAuth(`${API_URL}/logistics/deliveries/tentativas?os=${oss.join(',')}`);
            const jt = await rt.json();
            setTentativas(jt.porOs || {});
          } else {
            setTentativas({});
          }
        } catch (_) { /* secao de tentativas e best-effort */ }
      } catch { if (!silencioso) showToast('Erro ao carregar entregas', 'error'); }
      finally { if (!silencioso) setLoading(false); }
    }, [fetchAuth, API_URL, dataDe, dataAte]); // FILTRO_STATUS_CLIENTSIDE_V1

    // Carga inicial + auto-refresh a cada 30s — mantém os status em dia
    // sem o operador precisar recarregar a tela na mão (o poller/webhook
    // atualizam o backend; a tela acompanha sozinha).
    useEffect(() => {
      carregar();                                       // 1a carga: com spinner
      const i = setInterval(() => carregar(true), 30000); // refresh silencioso (sem piscar a tela)
      return () => clearInterval(i);
    }, [carregar]);

    // Timer de re-render por segundo enquanto o modal de cotação está aberto.
    // Necessário pra o countdown atualizar visualmente.
    useEffect(() => {
      if (!cotacaoModal || cotacaoModal.state !== 'ok') return;
      const t = setInterval(() => setTickClock(x => x + 1), 1000);
      return () => clearInterval(t);
    }, [cotacaoModal?.state]);

    // Abre o mini-modal pra pedir o código da OS.
    // Substitui o prompt() nativo do navegador que ficava feio no fluxo.
    function despacharOS() {
      setPedirCodigoModal({ valor: '' });
    }

    // 🆕 2026-05 Fase 5 — Cotação comparativa multi-provider.
    // O modal agora cota TODOS os providers ativos em paralelo via o hub
    // (/api/logistics/quotes/multi por provider) e despacha via /api/logistics/deliveries.
    // Substitui o fluxo antigo /uber/entregas/cotar|despachar (Opção A: corte cirúrgico).
    const [providersAtivos, setProvidersAtivos] = useState(null); // null=carregando | [{provider_code,display_name}]

    // Carrega a lista de providers ativos do hub (uma vez).
    useEffect(() => {
      let abortado = false;
      (async () => {
        try {
          const res = await fetchAuth(`${API_URL}/logistics/providers`);
          if (res.status === 404) { if (!abortado) setProvidersAtivos([]); return; }
          const d = await res.json();
          if (abortado) return;
          const ativos = (d && d.providers || []).filter(p => p.ativo);
          setProvidersAtivos(ativos);
        } catch { if (!abortado) setProvidersAtivos([]); }
      })();
      return () => { abortado = true; };
    }, [fetchAuth, API_URL]);

    // Confirma o código digitado no mini-modal e dispara a cotação multi-provider
    async function confirmarCodigoEcotar() {
      const codigoOS = pedirCodigoModal?.valor?.trim();
      if (!codigoOS) { showToast('Digite um código de OS', 'error'); return; }
      const codigoOSNum = parseInt(codigoOS);
      if (isNaN(codigoOSNum) || codigoOSNum <= 0) { showToast('Código inválido', 'error'); return; }
      setPedirCodigoModal(null);
      await cotarMultiProvider(codigoOSNum);
    }

    // Cota a OS em todos os providers ativos, em paralelo.
    // Resultado: cotacaoModal.porProvider = { [code]: { display_name, cotacoes: [...], error } }
    async function cotarMultiProvider(codigoOSNum) {
      const ativos = (providersAtivos && providersAtivos.length > 0)
        ? providersAtivos
        : [{ provider_code: 'uber', display_name: 'Uber Direct' }]; // fallback defensivo

      setCotacaoModal({
        state: 'cotando', codigoOS: codigoOSNum,
        porProvider: null, selecionado: null, error: null,
      });

      try {
        const resultados = await Promise.all(ativos.map(async (prov) => {
          try {
            const res = await fetchAuth(`${API_URL}/logistics/quotes/multi`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                codigoOS: codigoOSNum,
                providerCode: prov.provider_code,
                vehicleTypes: ['motorcycle', 'car'],
              }),
            });
            const json = await res.json();
            if (res.ok && json.success) {
              return { code: prov.provider_code, display_name: prov.display_name, cotacoes: json.cotacoes || [], error: null };
            }
            return { code: prov.provider_code, display_name: prov.display_name, cotacoes: [], error: json.error || 'Erro ao cotar' };
          } catch {
            return { code: prov.provider_code, display_name: prov.display_name, cotacoes: [], error: 'Erro de rede' };
          }
        }));

        const porProvider = {};
        resultados.forEach(r => { porProvider[r.code] = r; });

        // Tem ao menos uma cotação disponível em algum provider?
        const algumDisponivel = resultados.some(r => r.cotacoes.some(c => c.available));
        if (!algumDisponivel) {
          const primErro = resultados.find(r => r.error)?.error;
          setCotacaoModal({
            state: 'erro', codigoOS: codigoOSNum,
            porProvider, selecionado: null,
            error: primErro || 'Nenhum provedor retornou cotação disponível',
          });
          return;
        }

        // Prefill do telefone do destinatario (vem da OS; pode vir vazio -> admin digita).
        let _telPrefill = '';
        for (const r of resultados) {
          const c0 = (r.cotacoes || []).find(x => x.available && x.telefone_entrega);
          if (c0) { _telPrefill = c0.telefone_entrega; break; }
        }
        // Prefill dos nomes (remetente/cliente) — vem da OS; pode vir vazio.
        let _nomeRemPrefill = '', _nomeCliPrefill = '';
        for (const r of resultados) {
          const cN = (r.cotacoes || []).find(x => x.available);
          if (cN) { _nomeRemPrefill = cN.nome_coleta || ''; _nomeCliPrefill = cN.nome_entrega || ''; break; }
        }
        setCotacaoModal({
          state: 'ok', codigoOS: codigoOSNum,
          porProvider,
          selecionado: { veiculo: 'motorcycle' }, // veículo escolhido (provider é por botão)
          telefone: _telPrefill,
          nomeRemetente: _nomeRemPrefill,
          nomeCliente: _nomeCliPrefill,
          error: null,
        });
      } catch (err) {
        setCotacaoModal({
          state: 'erro', codigoOS: codigoOSNum,
          porProvider: null, selecionado: null, error: 'Erro ao cotar',
        });
      }
    }

    // Re-cota — usado no "Tentar de novo" e no "Cotar de novo" (quote expirada)
    async function recotarOS() {
      if (!cotacaoModal?.codigoOS) return;
      await cotarMultiProvider(cotacaoModal.codigoOS);
    }

    // Troca o veículo selecionado (Moto/Carro) — afeta os dois providers
    function selecionarVeiculo(veiculo) {
      if (!cotacaoModal) return;
      setCotacaoModal({ ...cotacaoModal, selecionado: { veiculo } });
    }

    // Despacha pelo provider escolhido (o "Provider Switcher": botão de cada card).
    async function despacharPorProvider(providerCode) {
      if (!cotacaoModal || cotacaoModal.state !== 'ok') return;
      const veiculo = cotacaoModal.selecionado?.veiculo || 'motorcycle';
      const bloco = cotacaoModal.porProvider?.[providerCode];
      const cot = bloco?.cotacoes?.find(c => c.vehicle_type === veiculo && c.available);
      if (!cot) { showToast('Sem cotação válida pra esse provedor/veículo', 'error'); return; }
      const _telDigitos = (cotacaoModal.telefone || '').replace(/\D/g, '');
      if (_telDigitos.length < 10) { showToast('Informe o telefone do cliente (com DDD) antes de despachar', 'error'); return; }
      if (Date.now() > cot.expires_at) {
        showToast('Cotação expirada — cote novamente', 'error');
        return;
      }

      setCotacaoModal({ ...cotacaoModal, state: 'despachando', despachandoProvider: providerCode });
      try {
        const res = await fetchAuth(`${API_URL}/logistics/deliveries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigoOS: cotacaoModal.codigoOS,
            providerCode,
            vehicleType: veiculo,
            quoteId: cot.quote_id,
            telefoneEntrega: cotacaoModal.telefone || '',
            nomeRemetente: cotacaoModal.nomeRemetente || '',
            nomeCliente: cotacaoModal.nomeCliente || '',
            complementoEntrega: cotacaoModal.complementoEntrega || '',
          }),
        });
        const json = await res.json();
        if (res.ok && json.success) {
          showToast(`OS ${cotacaoModal.codigoOS} despachada via ${bloco.display_name}!`, 'success');
          setCotacaoModal(null);
          carregar();
        } else {
          showToast(json.error || 'Erro ao despachar', 'error');
          setCotacaoModal({ ...cotacaoModal, state: 'ok', despachandoProvider: null });
        }
      } catch {
        showToast('Erro de rede ao despachar', 'error');
        setCotacaoModal({ ...cotacaoModal, state: 'ok', despachandoProvider: null });
      }
    }

    function fecharCotacaoModal() {
      if (cotacaoModal?.state === 'cotando' || cotacaoModal?.state === 'despachando' || cotacaoModal?.state === 'disparando_simultaneo') return;
      setCotacaoModal(null);
    }

    // BUSCA_SIMULTANEA_UI_V1: dispara nos providers disponiveis ao MESMO tempo.
    // O primeiro que pegar motoboy vence; o backend cancela os outros (webhook
    // first-wins). Endpoint gated por BUSCA_SIMULTANEA_ATIVA (403 se off).
    async function despacharSimultaneo() {
      if (!cotacaoModal || cotacaoModal.state !== 'ok') return;
      const veiculo = cotacaoModal.selecionado?.veiculo || 'motorcycle';
      const pp = cotacaoModal.porProvider || {};
      const providers = Object.values(pp)
        .filter(b => (b.cotacoes || []).some(c => c.vehicle_type === veiculo && c.available))
        .map(b => b.code);
      if (providers.length === 0) { showToast('Nenhum provedor com cotação válida', 'error'); return; }
      const _telDigitos = (cotacaoModal.telefone || '').replace(/\D/g, '');
      if (_telDigitos.length < 10) { showToast('Informe o telefone do cliente (com DDD) antes de disparar', 'error'); return; }

      setCotacaoModal({ ...cotacaoModal, state: 'disparando_simultaneo', providersDisparo: providers });
      const t0 = Date.now();
      try {
        const res = await fetchAuth(`${API_URL}/logistics/deliveries/simultaneo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigoOS: cotacaoModal.codigoOS,
            providers,
            vehicleType: veiculo,
            telefoneEntrega: cotacaoModal.telefone || '',
            nomeRemetente: cotacaoModal.nomeRemetente || '',
            nomeCliente: cotacaoModal.nomeCliente || '',
            complementoEntrega: cotacaoModal.complementoEntrega || '',
          }),
        });
        const json = await res.json().catch(() => ({}));
        // segura a animacao um minimo (feedback visual do disparo)
        await new Promise(r => setTimeout(r, Math.max(0, 1200 - (Date.now() - t0))));
        if (res.ok && json.success) {
          // BUSCA_SIMULTANEA_FALHAPROV_V1: avisa se algum provedor NAO criou a
          // corrida (erros[] do backend), pra nao achar que buscou nos dois
          // quando so um foi.
          const _nomeProv = (p) => p === 'uber' ? 'Uber' : (p === 'noventanove' || p === '99') ? '99' : String(p || '?');
          const _erros = Array.isArray(json.erros) ? json.erros.filter(e => e && e.provider) : [];
          const _tent = json.tentativas || [];
          const n = _tent.length || providers.length;
          if (_erros.length > 0) {
            const _ok = _tent.map(t => _nomeProv(t.provider_code || t.provider)).filter(Boolean).join(' + ') || `${n}`;
            const _falhas = _erros.map(e => `${_nomeProv(e.provider)} (${String(e.erro || 'falhou').slice(0, 70)})`).join(' · ');
            showToast(`Buscando em ${_ok}. Nao criou: ${_falhas}`, 'error');
          } else {
            showToast(`Disparado em ${n} provedor(es) — buscando entregador`, 'success');
          }
          setCotacaoModal(null);
          carregar();
        } else if (res.status === 409) {
          // BUSCA_SIMULTANEA_409_V1: OS ja tem entrega ativa (ou ja reservada na
          // Mapp). O 409 do backend esta certo — o que faltava era avisar. Fecha
          // o modal e atualiza (a OS esta viva, aparece no kanban).
          const _r = json.resultado || {};
          const _msg = _r.jaAtiva
            ? `OS ${cotacaoModal.codigoOS} já está despachada/ativa — não dá pra disparar de novo`
            : _r.reservaFalhou
              ? `OS ${cotacaoModal.codigoOS} já está reservada na Mapp — não dá pra disparar`
              : (json.error || `OS ${cotacaoModal.codigoOS} já está ativa`);
          showToast(_msg, 'error');
          setCotacaoModal(null);
          carregar();
        } else if (res.status === 403) {
          showToast('Busca simultânea desativada no servidor (BUSCA_SIMULTANEA_ATIVA)', 'error');
          setCotacaoModal({ ...cotacaoModal, state: 'ok', providersDisparo: null });
        } else {
          showToast(json.error || 'Erro ao disparar busca simultânea', 'error');
          setCotacaoModal({ ...cotacaoModal, state: 'ok', providersDisparo: null });
        }
      } catch {
        showToast('Erro de rede na busca simultânea', 'error');
        setCotacaoModal({ ...cotacaoModal, state: 'ok', providersDisparo: null });
      }
    }

    async function cancelarEntrega(entregaOuId) {
      // CANCEL_MODAL_V2: abre o modal de escopo (so central | central + Mapp) no
      // lugar do confirm() nativo. O cancelamento de fato roda em executarCancelamento.
      const entregaObj = (entregaOuId && typeof entregaOuId === 'object') ? entregaOuId : { id: entregaOuId };
      const st = entregaObj.status_canonico || null;
      const JA_COLETOU = ['PICKED_UP', 'DROPOFF_EN_ROUTE', 'ARRIVED_DROPOFF'];
      // CANCEL_MOTIVO_V3: motivo obrigatorio — comeca vazio, o modal valida.
      setCancelarModal({ entrega: entregaObj, jaColetou: !!(st && JA_COLETOU.includes(st)), enviando: false, motivoSel: '', motivoTxt: '', erroMotivo: null });
    }

    // CANCEL_MOTIVO_V3: resolve o motivo final do modal ('Outro' usa o texto livre).
    function motivoDoModal(m) {
      if (!m) return '';
      const sel = String(m.motivoSel || '').trim();
      const txt = String(m.motivoTxt || '').replace(/\s+/g, ' ').trim();
      if (!sel) return '';
      if (sel === '__outro') return txt;
      return txt ? (sel + ' — ' + txt) : sel;
    }

    async function executarCancelamento(entrega, escopo) {
      // CANCEL_MOTIVO_V3: sem motivo nao sai do modal.
      const motivo = motivoDoModal(cancelarModal);
      if (motivo.length < 3) {
        setCancelarModal(function (m) { return m ? Object.assign({}, m, { erroMotivo: 'Informe o motivo do cancelamento.' }) : m; });
        return;
      }
      /* MP_CANCEL_PROPRIO_V4: moto propria nao tem linha no hub — cancela por codigo_os */
      if (entrega && entrega.is_moto_propria) {
        setCancelarModal(function (m) { return m ? Object.assign({}, m, { enviando: true, erroMotivo: null }) : m; });
        try {
          const r = await fetchAuth(`${API_URL}/logistics/moto-propria/${entrega.codigo_os}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ motivo: motivo }) });
          if (r.ok) { showToast('Removida do painel — cancele na Mapp manualmente', 'warning'); setCancelarModal(null); carregar(); } /* MP_TOAST_CENTRAL_V1 */
          else { let er = {}; try { er = await r.json(); } catch (_e) {} showToast(er.error || er.motivo || 'Erro ao cancelar', 'error'); setCancelarModal(function (m) { return m ? Object.assign({}, m, { enviando: false }) : m; }); }
        } catch (_e) { showToast('Erro ao cancelar', 'error'); setCancelarModal(function (m) { return m ? Object.assign({}, m, { enviando: false }) : m; }); }
        return;
      }
      const id = entrega.id;
      setCancelarModal(function (m) { return m ? Object.assign({}, m, { enviando: true, erroMotivo: null }) : m; });
      try {
        const res = await fetchAuth(`${API_URL}/logistics/deliveries/${id}/cancel`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ motivo: motivo, escopo: escopo })
        });
        if (res.ok) {
          let info = {};
          try { info = await res.json(); } catch (_e) {}
          if (info.providerCancelado === false) {
            showToast('Cancelado no painel, mas a 99 NAO confirmou: ' + (info.providerCancelMsg || 'cancele manualmente no app da 99'), 'error');
          } else if (escopo === 'ambos' && info.tutts && info.tutts.ok === false) {
            showToast('Cancelada na central, mas na Tutts nao deu (' + (info.tutts.motivo || 'erro') + '). A OS foi reaberta na Mapp.', 'warning');
          } else if (escopo === 'ambos') {
            showToast('Cancelada na central e na Tutts', 'success');
          } else {
            showToast('Cancelada so na central (segue aberta na Mapp)', 'success');
          }
          setCancelarModal(null);
          carregar();
        } else {
          let err = {};
          try { err = await res.json(); } catch (_e) {}
          showToast(err.error || 'Erro ao cancelar', 'error');
          setCancelarModal(function (m) { return m ? Object.assign({}, m, { enviando: false }) : m; });
        }
      } catch (_e) {
        showToast('Erro ao cancelar', 'error');
        setCancelarModal(function (m) { return m ? Object.assign({}, m, { enviando: false }) : m; });
      }
    }

    // Filtragem + ordenação client-side
    const entregasFiltradas = useMemo(() => {
      let lista = entregas;

      // 🆕 2026-07: consolida por OS. Cada re-despacho cria um registro novo, entao
      // a mesma OS pode aparecer varias vezes (cancelado + falha + atual). Mostra
      // so o registro MAIS RECENTE por codigo_os (o estado atual da corrida); o
      // historico das tentativas ja aparece na trilha do card. Desempata pelo id
      // (incremental — o maior e sempre a tentativa mais nova).
      {
        const maisRecentePorOs = new Map();
        for (const e of lista) {
          const os = e.codigo_os;
          const atual = maisRecentePorOs.get(os);
          // MOTO_PROPRIA_CONSOLIDA_V1: a moto propria (id 'mp-...') vence a linha
          // cancelada do hub (id numerico) — ela e o estado ATUAL da corrida; as
          // tentativas do hub seguem na trilha "Tentativas de despacho".
          // BUSCA_SIMULTANEA_CROSSFIX_V1 + CONSOLIDA_ENTREGUE_V1: entre linhas do
          // mesmo tipo, decide por RANK: entregue/devolvido (2) > em-andamento (1)
          // > cancelado/falhou (0). Cobre o grupo simultaneo cruzado (uma entrega,
          // a irma cancelada) e a corrida viva vs cancelada. So empata por id.
          const _rankSt = (x) => {
            const s = String(x && x.status_canonico || '').toUpperCase();
            if (['CANCELED', 'FAILED', 'FALLBACK_QUEUE'].includes(s)) return 0;
            if (['DELIVERED', 'RETURNED'].includes(s)) return 2;
            return 1;
          };
          const _preferir = !atual
            || (!!e.is_moto_propria && !atual.is_moto_propria)
            || ((!!e.is_moto_propria === !!atual.is_moto_propria) && (
                 (_rankSt(e) !== _rankSt(atual))
                   ? (_rankSt(e) > _rankSt(atual))
                   : ((Number(e.id) || 0) > (Number(atual.id) || 0))
               ));
          if (_preferir) {
            maisRecentePorOs.set(os, e);
          }
        }
        lista = Array.from(maisRecentePorOs.values());
      }

      // Filtro de data (despacho) — por INTERVALO, em BRT. [periodo-v1]
      if (dataDe || dataAte) {
        lista = lista.filter(e => {
          const d = dataLocalBRT(e.created_at);
          if (dataDe && d < dataDe) return false;
          if (dataAte && d > dataAte) return false;
          return true;
        });
      }

      // Busca livre: OS, enderecos, entregador e — BUSCA_CLIENTE_FINAL_NF —
      // nome do cliente final e nota fiscal. A NF casa tanto na forma limpa
      // (1148140) quanto na suja digitada pelo usuario (01-001148140-1),
      // porque comparamos so os digitos dos dois lados.
      if (busca.trim()) {
        const q = busca.trim().toLowerCase();
        const qDigitos = q.replace(/[^0-9]/g, '');
        lista = lista.filter(e => {
          if (String(e.codigo_os).includes(q)) return true;
          if ((e.endereco_coleta || '').toLowerCase().includes(q)) return true;
          if ((e.endereco_entrega || '').toLowerCase().includes(q)) return true;
          if ((e.entregador_nome || '').toLowerCase().includes(q)) return true;
          if ((e.cliente_final || '').toLowerCase().includes(q)) return true;
          if ((e.cliente_nome_regra || '').toLowerCase().includes(q)) return true;
          const nf = String(e.nota_fiscal || '');
          if (nf && qDigitos && nf.replace(/[^0-9]/g, '').includes(qDigitos)) return true;
          return false;
        });
      }

      // Filtro de margem
      if (filtroMargem !== 'todas') {
        lista = lista.filter(e => {
          const m = parseFloat(e.valor_servico || 0) - parseFloat(e.valor_uber || 0);
          return filtroMargem === 'positiva' ? m >= 0 : m < 0;
        });
      }

      // Filtro de provedor (todos | uber | noventanove)
      if (filtroProvider !== 'todos') {
        lista = lista.filter(e => {
          const c = (e.provider_code || e.provider || '');
          const norm = (c === '99') ? 'noventanove' : c;
          return norm === filtroProvider;
        });
      }

      // Filtro de cliente (por cliente_nome_regra; '__sem__' = manual/sem regra)
      if (filtroCliente !== 'todos') {
        lista = lista.filter(e => {
          const nome = e.cliente_nome_regra || '';
          return filtroCliente === '__sem__' ? !nome : nome === filtroCliente;
        });
      }

      // MP_TOGGLE_VER_V1: esconde moto propria quando o toggle esta off (deixa o
      // painel so com Hub). Client-side -> instantaneo, sem refetch.
      if (!verProprios) {
        lista = lista.filter(e => !e.is_moto_propria);
      }

      // FILTRO_STATUS_CLIENTSIDE_V1: filtro de status no client (era re-fetch no servidor)
      if (filtroStatus) {
        lista = lista.filter(e => e.status_canonico === filtroStatus);
      }

      // Ordenação
      const ordenado = [...lista].sort((a, b) => {
        if (ordenacao === 'recente') return new Date(b.created_at) - new Date(a.created_at);
        if (ordenacao === 'antiga')  return new Date(a.created_at) - new Date(b.created_at);
        const ma = parseFloat(a.valor_servico || 0) - parseFloat(a.valor_uber || 0);
        const mb = parseFloat(b.valor_servico || 0) - parseFloat(b.valor_uber || 0);
        if (ordenacao === 'margem_maior') return mb - ma;
        if (ordenacao === 'margem_menor') return ma - mb;
        return 0;
      });

      return ordenado;
    }, [entregas, busca, filtroMargem, ordenacao, dataDe, dataAte, filtroProvider, filtroCliente, filtroStatus, verProprios]);

    // Resumo — total de margem da lista filtrada
    // FILTRO_CLIENTE_KANBAN: lista distinta de clientes presente nas entregas carregadas
    const clientesLista = useMemo(() => {
      const set = new Set();
      (entregas || []).forEach(e => { if (e.cliente_nome_regra) set.add(e.cliente_nome_regra); });
      return Array.from(set).sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));
    }, [entregas]);

    const resumo = useMemo(() => {
      const total = entregasFiltradas.reduce((acc, e) => {
        const m = parseFloat(e.valor_servico || 0) - parseFloat(e.valor_uber || 0);
        return acc + (isNaN(m) ? 0 : m);
      }, 0);
      const negativas = entregasFiltradas.filter(e =>
        parseFloat(e.valor_servico || 0) - parseFloat(e.valor_uber || 0) < 0
      ).length;
      return { total, negativas, qtd: entregasFiltradas.length };
    }, [entregasFiltradas]);

    // Tracking: abre a página oficial de rastreio do provedor em nova aba.
    // O tracking_url vem da resposta do Create Delivery e é salvo no banco no despacho.
    function abrirTracking(e) {
      // Prioriza a pagina de rastreio da Central (Tutts). Cai pro link do
      // provedor so em entregas antigas sem token. Sem nenhum dos dois = ainda
      // nao ha rastreio (entregador nao aceitou).
      if (e.rastreio_token) {
        window.open('https://centraltutts.online/r/' + e.rastreio_token, '_blank', 'noopener,noreferrer');
        return;
      }
      if (e.tracking_url) {
        window.open(e.tracking_url, '_blank', 'noopener,noreferrer');
        return;
      }
      showToast('Rastreio ainda nao disponivel (aguardando o entregador aceitar)', 'error');
    }

    // Detalhes: abre modal com tracking points + webhooks + info completa
    // [hub-falha-alerta-v2] Confirma que o admin viu a falha. Grava no banco
    // (falha_ciente_em/por), entao silencia o alerta pra TODOS os admins e
    // registra QUEM confirmou. O botao so fecha o modal — nao mexe na corrida.
    async function confirmarFalhaCiente(entrega) {
      if (!entrega || !entrega.id) { setFalhaAlerta(null); return; }
      try {
        const res = await fetchAuth(`${API_URL}/logistics/deliveries/${entrega.id}/falha-ciente`, {
          method: 'POST',
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        // atualiza local pra nao reaparecer antes do proximo refresh
        setEntregas(prev => (prev || []).map(e =>
          e.id === entrega.id ? { ...e, falha_ciente_em: new Date().toISOString() } : e
        ));
      } catch (err) {
        showToast('Nao consegui registrar o ciente: ' + err.message, 'error');
      } finally {
        setFalhaAlerta(null);
      }
    }

    async function abrirDetalhes(e) {
      setDetalhesAberto({ entrega: e, tracking: [], webhooks: [], loading: true });
      try {
        const res = await fetchAuth(`${API_URL}/logistics/deliveries/${e.id}`);
        const json = await res.json();
        if (json.success) {
          setDetalhesAberto({
            entrega: json.entrega || e,
            tracking: json.tracking || [],
            webhooks: json.webhooks || [],
            loading: false,
          });
        } else {
          showToast(json.error || 'Erro ao carregar detalhes', 'error');
          setDetalhesAberto({ entrega: e, tracking: [], webhooks: [], loading: false });
        }
      } catch (err) {
        showToast('Erro ao buscar detalhes da entrega', 'error');
        setDetalhesAberto({ entrega: e, tracking: [], webhooks: [], loading: false });
      }
    }

    function fecharDetalhes() {
      setDetalhesAberto(null);
    }

    // Redespacho: cancela a delivery atual no provedor e cria nova com novo endereço
    function abrirRedespacho(e) {
      setRedespachoAberto({ entrega: e, motivo: '', providerCode: '', excluir: true }); // RDA_INIT_V1
    }

    // REDESPACHO_BTN_V1 — cancela a corrida atual e chama outro entregador.
    // Sem modal de edicao: endereco e valor nao mudam, so o motoboy.
    //
    // REDESPACHO_MODAL_V1 (funcao) — o clique agora so ABRE o modal; quem chama
    // a rota e o confirmarRedespachoRapido, depois do OK na tela.
    //
    // POR QUE SAIU DO confirm(): ele nao aceita estilo, estampa "www.centraltutts.online
    // diz" no topo, e — pior — e SINCRONO e bloqueia a aba: sem estado de
    // "enviando", o operador clicava de novo achando que tinha travado. Numa acao
    // que cancela e recontrata corrida, clique duplo custa dinheiro.
    function redespachoRapido(e) {
      setRedespachoRapidoModal({ entrega: e, providerCode: '' }); setProvDropAberto(false); // RDA_QUICK_RESET_V3
    }

    async function confirmarRedespachoRapido() {
      if (!redespachoRapidoModal || redespachandoRapido) return;
      const e = redespachoRapidoModal.entrega;
      setRedespachandoRapido(true);
      try {
        const res = await fetchAuth(`${API_URL}/logistics/deliveries/${e.id}/redispatch`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          // RDA_QUICK_BODY_V2: providerCode so vai quando o operador troca no
          // seletor. Vazio = backend usa o provedor da propria entrega.
          body: JSON.stringify(Object.assign(
            { motivo: 'Redespacho manual', excluirEntregador: true },
            redespachoRapidoModal.providerCode ? { providerCode: redespachoRapidoModal.providerCode } : {}
          )),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.success) {
          setRedespachoRapidoModal(null);
          showToast('Chamando outro entregador', 'success');
          carregar();
        } else {
          // Erro NAO fecha o modal. O backend responde coisas que o operador
          // precisa LER ("ja passou da coleta", "OS nao esta mais na Mapp") —
          // fechar jogaria ele de volta no card sem contexto, e um toast some
          // sozinho. Fica na tela, com o botao livre pra tentar de novo.
          setRedespachoRapidoModal({ entrega: e, erro: json.error || 'Erro ao redespachar' });
        }
      } catch (err) {
        setRedespachoRapidoModal({ entrega: e, erro: 'Erro de rede ao redespachar' });
      } finally {
        setRedespachandoRapido(false);
      }
    }

    // Dados derivados do modal — nulos quando ele esta fechado.
    // Calculados aqui (corpo do componente) e nao dentro do h(...): componente
    // definido em IIFE dentro do render vira tipo novo a cada render, e o React
    // desmonta/remonta ele — o clique no botao morreria no meio.
    const _rrEnt  = redespachoRapidoModal ? redespachoRapidoModal.entrega : null;
    const _rrProv = _rrEnt ? provedorInfo(_rrEnt) : null;

    function fecharRedespacho() {
      if (redespachando) return; // não fecha enquanto está rolando
      setRedespachoAberto(null);
    }

    async function confirmarRedespacho() {
      setRedespachando(true);
      try {
        // 🆕 Fase 6 — repontado pro hub. O /redispatch do hub cancela a
        // entrega atual e redespacha a MESMA OS (endereço vem da Mapp).
        const res = await fetchAuth(`${API_URL}/logistics/deliveries/${redespachoAberto.entrega.id}/redispatch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(Object.assign(
            { // RDA_BODY_V1
              motivo: (redespachoAberto.motivo || '').trim() || 'Redespacho solicitado',
              excluirEntregador: redespachoAberto.excluir !== false,
            },
            redespachoAberto.providerCode ? { providerCode: redespachoAberto.providerCode } : {}
          )),
        });
        const json = await res.json();
        if (res.ok && json.success) {
          showToast('Entrega redespachada', 'success');
          setRedespachoAberto(null);
          carregar();
        } else {
          showToast(json.error || 'Erro ao redespachar', 'error');
        }
      } catch (err) {
        showToast('Erro de rede ao redespachar', 'error');
      } finally {
        setRedespachando(false);
      }
    }

    // HUB_CLEAN_V1: cabeçalho + barra de filtros no padrão clean (mesmos estados/handlers)
    const _ctl = 'h-[38px] px-3 border border-gray-200 rounded-[10px] bg-white text-[13px] text-gray-700 hover:bg-gray-50 focus:outline-none focus:border-purple-400';
    return h('div', { className: (viewMode === 'kanban' ? 'max-w-full' : 'max-w-7xl' /* HUB_MARGEM_V1 */) + ' mx-auto px-4 py-5 md:px-6 md:py-6 space-y-4' },

      // ── Header ──
      h('div', { className: 'flex items-end justify-between flex-wrap gap-3' },
        h('div', null,
          h('h1', { className: 'text-2xl font-bold text-gray-900', style: { fontFamily: 'Sora, Inter, sans-serif', letterSpacing: '-0.01em' } }, 'Entregas'),
          h('p', { className: 'text-[13px] text-gray-500 mt-1' },
            `${resumo.qtd} entrega${resumo.qtd !== 1 ? 's' : ''}${modoData === 'hoje' ? ' hoje' : ''} · margem `,
            h('b', { className: resumo.total >= 0 ? 'text-green-800' : 'text-red-800', style: { fontWeight: 800 } },
              `${resumo.total >= 0 ? '+' : '−'}${fmtMoney(Math.abs(resumo.total))}`),
            resumo.negativas > 0 && ' · ',
            resumo.negativas > 0 && h('b', { className: 'text-red-800', style: { fontWeight: 800 } }, `${resumo.negativas} no prejuízo`),
          )
        ),
        h('div', { className: 'flex gap-2 items-center' },
          h('button', {
            type: 'button', onClick: carregar, 'aria-label': 'Atualizar entregas', title: 'Atualizar',
            className: 'w-10 h-10 rounded-[10px] border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 grid place-items-center',
          }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-refresh' }))),
          h('button', {
            type: 'button', onClick: despacharOS,
            className: 'h-10 px-4 rounded-[10px] bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800',
          }, 'Despachar OS'),
        )
      ),

      // ── Filtros ──
      h('div', { className: 'bg-white rounded-[14px] border border-gray-200 p-2.5 flex flex-wrap items-center gap-2' },
        h('label', { className: 'flex items-center gap-2 h-[38px] px-3 border border-gray-200 rounded-[10px] text-gray-400 focus-within:border-purple-400', style: { flex: '1 1 280px', minWidth: 0 } },
          h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-search' })),
          h('input', {
            type: 'search', value: busca, 'aria-label': 'Buscar entrega',
            onChange: e => setBusca(e.target.value),
            placeholder: 'Buscar OS, NF, cliente, endereço ou entregador',
            className: 'flex-1 min-w-0 border-0 outline-none bg-transparent text-[13px] text-gray-900',
          })),
        // [periodo-v1] Hoje | Período
        h('div', { role: 'group', 'aria-label': 'Período', className: 'inline-flex bg-gray-100 rounded-[10px] p-[3px]' },
          h('button', {
            type: 'button', 'aria-pressed': modoData === 'hoje',
            onClick: () => { const hj = dataLocalBRT(new Date()); setModoData('hoje'); setDDe(hj); setDAte(hj); aplicarPeriodo(hj, hj); },
            className: 'px-3 py-[7px] rounded-lg text-[13px] ' + (modoData === 'hoje' ? 'bg-white text-gray-900 font-semibold' : 'text-gray-500 hover:text-gray-800'),
          }, 'Hoje'),
          h('button', {
            type: 'button', 'aria-pressed': modoData === 'custom',
            onClick: () => setModoData('custom'),
            className: 'px-3 py-[7px] rounded-lg text-[13px] ' + (modoData === 'custom' ? 'bg-white text-gray-900 font-semibold' : 'text-gray-500 hover:text-gray-800'),
          }, 'Período'),
        ),
        // [periodo-aplicar-v1] os inputs mexem no RASCUNHO (dDe/dAte). A busca so
        // dispara quando o usuario define a data FINAL (Ate) ou clica em "Buscar".
        modoData === 'custom' && h('div', { className: 'inline-flex items-center gap-1.5' },
          h('label', { className: 'text-xs text-gray-500', htmlFor: 'hub-ent-de' }, 'De'),
          h('input', {
            id: 'hub-ent-de', type: 'date', value: dDe, max: dAte || undefined,
            onChange: e => setDDe(e.target.value),   // so rascunho — nao busca
            className: _ctl,
          }),
          h('label', { className: 'text-xs text-gray-500', htmlFor: 'hub-ent-ate' }, 'até'),
          h('input', {
            id: 'hub-ent-ate', type: 'date', value: dAte, min: dDe || undefined,
            // definir a data FINAL aplica o periodo e dispara a busca
            onChange: e => { const v = e.target.value; setDAte(v); if (dDe && v) aplicarPeriodo(dDe, v); },
            className: _ctl,
          }),
          // botao Buscar — util quando so o "De" mudou (aplica dDe/dAte na mao)
          (dDe !== dataDe || dAte !== dataAte) && h('button', {
            type: 'button', onClick: () => aplicarPeriodo(dDe, dAte),
            className: 'h-[38px] px-3 rounded-[10px] text-[13px] font-semibold bg-purple-700 text-white hover:bg-purple-800',
          }, 'Buscar período'),
        ),
        h('select', {
          value: filtroStatus, 'aria-label': 'Status',
          onChange: e => setFiltroStatus(e.target.value),
          className: _ctl,
        },
          h('option', { value: '' }, 'Status: todos'),
          // Só os status canônicos (UPPER) — o backend casa status_canonico
          // OU status_native, e as chaves legadas só duplicariam labels.
          STATUS_FILTRO_OPCOES.map(s => h('option', { key: s, value: s }, STATUS_LABELS[s].label))
        ),
        h('select', {
          value: filtroProvider, 'aria-label': 'Provedor',
          onChange: e => setFiltroProvider(e.target.value),
          className: _ctl,
          title: 'Filtrar por provedor logístico',
        },
          h('option', { value: 'todos' }, 'Provedor: todos'),
          h('option', { value: 'uber' }, 'Uber'),
          h('option', { value: 'noventanove' }, '99'),
        ),
        h('select', {
          value: filtroCliente, 'aria-label': 'Cliente',
          onChange: e => setFiltroCliente(e.target.value),
          className: _ctl + ' max-w-[220px]',
          title: 'Filtrar por cliente',
        },
          h('option', { value: 'todos' }, 'Cliente: todos'),
          clientesLista.map(nome => h('option', { key: nome, value: nome }, nome)),
          h('option', { value: '__sem__' }, 'Manual / sem regra'),
        ),
        h('select', {
          value: filtroMargem, 'aria-label': 'Margem',
          onChange: e => setFiltroMargem(e.target.value),
          className: _ctl,
        },
          h('option', { value: 'todas' }, 'Margem: todas'),
          h('option', { value: 'positiva' }, 'Margem: positiva'),
          h('option', { value: 'negativa' }, 'Margem: negativa (prejuízo)'),
        ),
        h('select', {
          value: ordenacao, 'aria-label': 'Ordenação',
          onChange: e => setOrdenacao(e.target.value),
          className: _ctl,
        },
          h('option', { value: 'recente' }, 'Mais recente'),
          h('option', { value: 'antiga' }, 'Mais antiga'),
          h('option', { value: 'margem_menor' }, 'Margem: menor primeiro'),
          h('option', { value: 'margem_maior' }, 'Margem: maior primeiro'),
        ),
        // MP_TOGGLE_VER_V1: liga/desliga a exibicao de moto propria no painel.
        h('button', {
          type: 'button', role: 'switch', 'aria-checked': !!verProprios,
          onClick: () => setVerProprios(v => {
            const nv = !v;
            try { localStorage.setItem('tutts_kanban_ver_proprios', nv ? '1' : '0'); } catch (_) {}
            return nv;
          }),
          title: 'Mostrar ou ocultar as corridas de moto propria no painel',
          className: 'inline-flex items-center gap-2 h-[38px] px-1.5 text-[13px] text-gray-700',
        },
          h('span', { 'aria-hidden': 'true', className: 'relative inline-block rounded-full transition-colors', style: { width: 32, height: 18, background: verProprios ? '#770fa8' : '#d1d5db' } },
            h('span', { className: 'absolute rounded-full bg-white transition-all', style: { top: 2, left: verProprios ? 16 : 2, width: 14, height: 14 } })),
          'Moto própria'),
      ),

      // ── Lista de cards ──
      (loading && entregas.length === 0)
        ? h('div', { className: 'text-center py-12' },
            h('div', { className: 'animate-spin w-8 h-8 border-4 border-purple-700 border-t-transparent rounded-full mx-auto' })
          )
        : viewMode === 'kanban'
          ? h(KanbanEntregas, {
              entregas: entregasFiltradas,
              tentativas,
              onCancelar: cancelarEntrega,
              onVerTracking: abrirTracking,
              onVerDetalhes: abrirDetalhes,
              onRedespachar: abrirRedespacho,
              onRedespachoRapido: redespachoRapido, // REDESPACHO_BTN_V1
              onReportar: (e) => setReportAberto(e),
              // EXTRAVIADOS_HANDLER_V1
              onExtraviar: async (e) => {
                const motivo = window.prompt(`Marcar OS ${e.codigo_os} como EXTRAVIADA?\n\nMotivo (opcional):`, '');
                if (motivo === null) return; // cancelou o prompt
                try {
                  const res = await fetchAuth(`${API_URL}/logistics/deliveries/${e.id}/extraviar`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ motivo: motivo || null }),
                  });
                  const json = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(json.error || 'falhou');
                  showToast(`OS ${e.codigo_os} marcada como extraviada`, 'success');
                  carregar(true);
                } catch (err) {
                  showToast(`Nao foi possivel marcar: ${err.message}`, 'error');
                }
              },
              onDesfazerExtravio: async (e) => {
                if (!window.confirm(`Desfazer o extravio da OS ${e.codigo_os}?`)) return;
                try {
                  const res = await fetchAuth(`${API_URL}/logistics/deliveries/${e.id}/extraviar/desfazer`, { method: 'POST' });
                  const json = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(json.error || 'falhou');
                  showToast(`Extravio da OS ${e.codigo_os} desfeito`, 'success');
                  carregar(true);
                } catch (err) {
                  showToast(`Nao foi possivel desfazer: ${err.message}`, 'error');
                }
              },
              onChat: abrirChat99,
              unreadMap: unreadChat99,
              ehFrequente,
              showToast,
            })
          : entregasFiltradas.length === 0
          ? h('div', { className: 'bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400' },
              'Nenhuma entrega encontrada com esses filtros'
            )
          : h('div', { className: 'space-y-3' },
              entregasFiltradas.map(e => h(CardEntrega, {
                key: e.id,
                entrega: e,
                tentativas: tentativas[e.codigo_os],
                onCancelar: cancelarEntrega,
                onVerTracking: abrirTracking,
                onVerDetalhes: abrirDetalhes,
                onRedespachar: abrirRedespacho,
                onRedespachoRapido: redespachoRapido, // REDESPACHO_BTN_V1
                showToast,
              }))
            ),

      // ── [hub-falha-alerta-v2] Modal de alerta de falha nova ──
      // Aparece uma vez por falha (o ciente e gravado no banco). Mostra o
      // essencial pro admin decidir: OS, cliente, enderecos, motivo do erro.
      falhaAlerta && h('div', {
        className: 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4',
        onClick: (ev) => { if (ev.target === ev.currentTarget) setFalhaAlerta(null); }
      },
        h('div', { role: 'alertdialog', 'aria-modal': 'true', className: 'bg-white rounded-[14px] border border-gray-200 w-full max-w-md overflow-hidden' },
          // cabecalho limpo — HUB_CLEAN_V1
          h('div', { className: 'border-b border-gray-100 px-5 pt-5 pb-3 flex items-center gap-3' },
            h('div', null,
              h('p', { className: 'inline-flex items-center gap-2 text-[15px] font-semibold text-red-800' }, h('span', { className: 'w-2 h-2 rounded-full bg-red-600' }), 'Nova falha na entrega'),
              h('p', { className: 'text-[13px] text-gray-500 mt-0.5' }, 'Uma corrida precisa de atenção')
            )
          ),
          // corpo
          h('div', { className: 'px-5 py-4 space-y-3' },
            h('div', { className: 'flex items-center gap-2' },
              h('span', { className: 'text-[17px] font-bold text-gray-900' }, 'OS ' + (falhaAlerta.entrega.codigo_os || '—')),
              falhaAlerta.entrega.provider_code && h('span', {
                className: 'ml-auto text-[10px] font-bold text-white bg-gray-800 rounded-full px-2 py-0.5'
              }, falhaAlerta.entrega.provider_code === 'noventanove' ? '99' : falhaAlerta.entrega.provider_code)
            ),
            h('div', { className: 'space-y-2 text-[12px]' },
              falhaAlerta.entrega.cliente_nome_regra && h('div', { className: 'flex gap-2' },
                h('span', { className: 'text-gray-400 w-16 flex-shrink-0' }, 'Cliente'),
                h('span', { className: 'text-gray-800 font-semibold' }, falhaAlerta.entrega.cliente_nome_regra)
              ),
              h('div', { className: 'flex gap-2' },
                h('span', { className: 'text-gray-400 w-16 flex-shrink-0' }, 'Coleta'),
                h('span', { className: 'text-gray-700' }, falhaAlerta.entrega.endereco_coleta || '—')
              ),
              h('div', { className: 'flex gap-2' },
                h('span', { className: 'text-gray-400 w-16 flex-shrink-0' }, 'Entrega'),
                h('span', { className: 'text-gray-700' }, falhaAlerta.entrega.endereco_entrega || '—')
              ),
              falhaAlerta.entrega.erro_ultimo && h('div', { className: 'flex gap-2' },
                h('span', { className: 'text-gray-400 w-16 flex-shrink-0' }, 'Motivo'),
                h('span', { className: 'text-red-600 font-medium' }, falhaAlerta.entrega.erro_ultimo)
              ),
              falhaAlerta.entrega.updated_at && h('div', { className: 'flex gap-2' },
                h('span', { className: 'text-gray-400 w-16 flex-shrink-0' }, 'Falhou às'),
                h('span', { className: 'text-gray-600' }, (() => {
                  try {
                    const d = new Date(falhaAlerta.entrega.updated_at);
                    return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' +
                           String(d.getFullYear()).slice(2) + ', ' +
                           String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
                  } catch (_) { return '—'; }
                })())
              )
            )
          ),
          // rodape: acoes
          h('div', { className: 'px-5 pb-5 flex gap-2' },
            h('button', {
              onClick: () => { const alvo = falhaAlerta.entrega; setFalhaAlerta(null); abrirDetalhes(alvo); },
              className: 'flex-1 h-10 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-[10px] hover:bg-gray-50'
            }, 'Ver detalhes'),
            h('button', {
              onClick: () => confirmarFalhaCiente(falhaAlerta.entrega),
              className: 'flex-1 h-10 text-sm font-semibold text-white bg-purple-700 rounded-[10px] hover:bg-purple-800'
            }, h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-check' })), 'Confirmar ciente'))
          ),
          falhaAlerta.restantes > 0 && h('p', {
            className: 'text-center text-[11px] text-gray-400 pb-4 -mt-2'
          }, 'Mais ' + falhaAlerta.restantes + ' falha(s) nova(s) em seguida')
        )
      ),

      // ── Modal de detalhes ──
      detalhesAberto && h(ModalDetalhesEntrega, {
        data: detalhesAberto,
        onClose: fecharDetalhes,
        showToast,
        fetchAuth,
        API_URL,
      }),

      // ── Modal de reportar ocorrencia / bloquear ──
      reportAberto && h(ModalReportarOcorrencia, {
        entrega: reportAberto,
        API_URL,
        fetchAuth,
        showToast,
        onClose: () => setReportAberto(null),
        onSucesso: carregar,
      }),

      // ── REDESPACHO_MODAL_V1 (markup) — confirmacao do botao "Redespachar" ──
      // Roxo de proposito: e a cor do botao que abriu. Ambar ja e "Editar
      // endereco" e vermelho e "Cancelar" — tres acoes diferentes, tres cores.
      cancelarModal && h('div', {
        className: 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4',
        onClick: (ev) => { if (ev.target === ev.currentTarget && !cancelarModal.enviando) setCancelarModal(null); },
      },
        h('div', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'hub-cancel-tit', className: 'bg-white rounded-[14px] border border-gray-200 max-w-md w-full overflow-hidden' },
          /* HUB_CLEAN_V1: cabeçalho branco (sem gradiente) */
          h('div', { className: 'px-5 pt-5 pb-3 border-b border-gray-100' },
            h('div', { className: 'min-w-0' },
              h('h3', { id: 'hub-cancel-tit', className: 'text-base font-semibold text-gray-900 leading-tight' }, `Cancelar OS ${cancelarModal.entrega.codigo_os || ''}`),
              h('p', { className: 'text-[13px] text-gray-500 mt-1' }, cancelarModal.entrega.is_moto_propria ? 'Confirmar cancelamento da moto própria?' : 'Como tu quer cancelar essa corrida?')), /* MP_MODAL_SUB_V5 */
          ),
          h('div', { className: 'p-5 space-y-3' },
            /* CANCEL_MOTIVO_V3: motivo obrigatorio — fica registrado no historico (aba Cancelamentos). */
            h('div', { className: 'space-y-2' },
              h('label', { htmlFor: 'hub-cancel-motivo', className: 'block text-[11px] font-semibold text-gray-500 uppercase tracking-wide' }, 'Motivo do cancelamento'),
              h('select', {
                id: 'hub-cancel-motivo',
                value: cancelarModal.motivoSel || '',
                disabled: cancelarModal.enviando,
                autoFocus: true,
                onChange: (ev) => { const v = ev.target.value; setCancelarModal(m => m ? Object.assign({}, m, { motivoSel: v, erroMotivo: null }) : m); },
                className: 'w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100',
              },
                h('option', { value: '' }, 'Selecione um motivo...'),
                MOTIVOS_CANCELAMENTO.map(mo => h('option', { key: mo, value: mo }, mo)),
                h('option', { value: '__outro' }, 'Outro (descrever)'),
              ),
              h('textarea', {
                value: cancelarModal.motivoTxt || '',
                disabled: cancelarModal.enviando,
                rows: 2,
                maxLength: 500,
                onChange: (ev) => { const v = ev.target.value; setCancelarModal(m => m ? Object.assign({}, m, { motivoTxt: v, erroMotivo: null }) : m); },
                placeholder: cancelarModal.motivoSel === '__outro' ? 'Descreva o motivo (obrigatorio)' : 'Detalhes (opcional)',
                className: 'w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 resize-none',
              }),
              cancelarModal.erroMotivo && h('div', { role: 'alert', className: 'text-[12px] text-red-600 flex items-center gap-1' },
                h('svg', { className: 'ico', style: { width: 14, height: 14 }, 'aria-hidden': 'true' }, h('use', { href: '#i-alert' })), cancelarModal.erroMotivo),
              h('div', { className: 'text-[11px] text-gray-400' }, 'O motivo e quem cancelou ficam no historico (aba Cancelamentos).'),
            ),
            /* MP_MODAL_ENXUTO_V5: moto propria tem modal simples (1 botao); hub mantem os 2 escopos */
            cancelarModal.entrega.is_moto_propria && h('div', { className: 'bg-amber-50 border border-amber-200 rounded-xl p-3 text-[12px] text-amber-800' }, /* MP_MODAL_AVISO_MAPP_V1 */
              h('b', null, 'Atenção: '), 'a moto própria já tem entregador. Aqui a corrida só sai do painel (central) — ela ', h('b', null, 'não é cancelada na Mapp'), '. Se precisar, ', h('b', null, 'cancele na Mapp manualmente'), '.'),
            cancelarModal.entrega.is_moto_propria && h('button', {
              type: 'button', disabled: cancelarModal.enviando,
              onClick: () => executarCancelamento(cancelarModal.entrega, 'proprio'),
              className: 'w-full text-center bg-white border border-red-200 text-red-800 rounded-[10px] h-10 hover:bg-red-50 disabled:opacity-50 font-semibold text-sm',
            }, cancelarModal.enviando ? 'Removendo...' : 'Cancelar no painel'), /* MP_BTN_CENTRAL_V1 */
            !cancelarModal.entrega.is_moto_propria && cancelarModal.jaColetou && h('div', { className: 'bg-amber-50 border border-amber-200 rounded-xl p-3 text-[12px] text-amber-800' },
              h('b', null, 'Atencao: '), 'o entregador da 99 ja coletou. A 99 nao cancela depois da coleta -- a corrida segue viva e cobrada. Aqui so marca como cancelada no painel.'),
            !cancelarModal.entrega.is_moto_propria && h('button', {
              type: 'button', disabled: cancelarModal.enviando,
              onClick: () => executarCancelamento(cancelarModal.entrega, 'central'),
              className: 'w-full text-left border border-gray-200 rounded-[10px] p-3 hover:bg-gray-50 disabled:opacity-50',
            },
              h('div', { className: 'text-sm font-semibold text-gray-800' }, 'Cancelar so na central'),
              h('div', { className: 'text-[12px] text-gray-500 mt-0.5' }, 'A OS volta a ficar aberta na Mapp pra um motoboy pegar. O Hub nao re-aciona.')),
            !cancelarModal.entrega.is_moto_propria && h('button', {
              type: 'button', disabled: cancelarModal.enviando,
              onClick: () => executarCancelamento(cancelarModal.entrega, 'ambos'),
              className: 'w-full text-left border border-red-200 rounded-[10px] p-3 hover:bg-red-50 disabled:opacity-50',
            },
              h('div', { className: 'text-sm font-semibold text-red-800' }, 'Cancelar na central e na Mapp'),
              h('div', { className: 'text-[12px] text-gray-500 mt-0.5' }, 'Cancela tambem na Tutts -- a OS some de vez (nao fica na Mapp).')),
            h('div', { className: 'flex justify-end pt-1' },
              h('button', {
                type: 'button', disabled: cancelarModal.enviando,
                onClick: () => setCancelarModal(null),
                className: 'h-10 px-4 text-sm text-gray-700 bg-white border border-gray-200 rounded-[10px] hover:bg-gray-50 disabled:opacity-50',
              }, cancelarModal.enviando ? 'Cancelando...' : 'Voltar')),
          ),
        )),

      redespachoRapidoModal && h('div', {
        className: 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4',
        onClick: (ev) => { if (ev.target === ev.currentTarget && !redespachandoRapido) setRedespachoRapidoModal(null); },
      },
        h('div', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'hub-rr-tit', className: 'bg-white rounded-[14px] border border-gray-200 max-w-md w-full overflow-hidden' },
          /* HUB_CLEAN_V1: cabeçalho branco (sem gradiente) */
          h('div', { className: 'px-5 pt-5 pb-3 border-b border-gray-100 flex items-start gap-3' },
            h('div', { className: 'min-w-0' },
              h('h3', { id: 'hub-rr-tit', className: 'text-base font-semibold text-gray-900 leading-tight' },
                `Redespachar OS ${_rrEnt.codigo_os}`),
              h('p', { className: 'text-[13px] text-gray-500 mt-1' },
                'Chama outro entregador. Da pra trocar de provedor.'), // RDA_QUICK_SUB_V2
            ),
            _rrProv && h('span', {
              className: 'ml-auto flex-shrink-0',
              title: _rrProv.nome,
            }, h(ProviderLogo, { code: _rrProv.code, size: 22 })),
          ),

          h('div', { className: 'p-5 space-y-3' },
            // RDA_QUICK_DROP_V3: dropdown com o logo oficial de cada provedor.
            h('div', null,
              h('label', { className: 'block text-[11px] font-semibold text-gray-500 mb-1 uppercase' }, 'Provedor'),
              (function () {
                var _cur = redespachoRapidoModal.providerCode || '';
                // RDA_FILTRO_V4: so oferece provedores validos pra esta corrida
                // (permitidos pela regra E ativos no Hub). "Mesmo da corrida" sempre entra.
                var _regraProvs = (Array.isArray(_rrEnt.regra_providers_preferidos) && _rrEnt.regra_providers_preferidos.length) ? _rrEnt.regra_providers_preferidos : null;
                var _ativosCodes = Array.isArray(providersAtivos) ? providersAtivos.map(function (p) { return p.provider_code; }) : null;
                var _permite = function (code) {
                  if (_regraProvs && _regraProvs.indexOf(code) === -1) return false;
                  if (_ativosCodes && _ativosCodes.indexOf(code) === -1) return false;
                  return true;
                };
                var _opts = [{ value: '', code: (_rrProv ? _rrProv.code : null), label: 'Mesmo da corrida' + (_rrProv ? ' (' + _rrProv.nome + ')' : '') }];
                if (_permite('uber')) _opts.push({ value: 'uber', code: 'uber', label: 'Uber Direct' });
                if (_permite('noventanove')) _opts.push({ value: 'noventanove', code: 'noventanove', label: '99Entrega' });
                var _sel = _opts.filter(function (o) { return o.value === _cur; })[0] || _opts[0];
                var _logo = function (code) { return code ? h(ProviderLogo, { code: code, size: 24 }) : h('span', { className: 'w-6 h-6 flex-shrink-0' }); };
                var _chev = h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', style: { width: 16, height: 16, color: '#9ca3af', flexShrink: 0, transform: provDropAberto ? 'rotate(180deg)' : 'none' }, 'aria-hidden': 'true' }, h('path', { d: 'm6 9 6 6 6-6' }));
                return h('div', { className: 'border border-gray-300 rounded-lg bg-white overflow-hidden' },
                  h('button', { type: 'button', onClick: function () { setProvDropAberto(function (v) { return !v; }); }, className: 'w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50' },
                    _logo(_sel.code),
                    h('span', { className: 'flex-1 text-sm text-gray-800 truncate' }, _sel.label),
                    _chev,
                  ),
                  provDropAberto && h('div', { className: 'border-t border-gray-200' },
                    _opts.map(function (o) {
                      return h('button', { key: o.value || 'mesmo', type: 'button', onClick: function () { setRedespachoRapidoModal(Object.assign({}, redespachoRapidoModal, { providerCode: o.value })); setProvDropAberto(false); }, className: 'w-full flex items-center gap-2.5 px-3 py-2 text-left ' + (o.value === _cur ? 'bg-purple-50' : 'hover:bg-gray-50') },
                        _logo(o.code),
                        h('span', { className: 'flex-1 text-sm ' + (o.value === _cur ? 'text-purple-700 font-medium' : 'text-gray-700') }, o.label),
                        o.value === _cur && h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', style: { width: 16, height: 16, color: '#770fa8', flexShrink: 0 }, 'aria-hidden': 'true' }, h('path', { d: 'M20 6 9 17l-5-5' }))
                      );
                    })
                  )
                );
              })(),
            ),
            // Quem sai. E o unico efeito irreversivel do botao, entao vem primeiro
            // e com cara e nome — nao como texto solto no meio de um paragrafo.
            _rrEnt.entregador_nome && h('div', {
              className: 'flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-[10px] p-3',
            },
              _rrEnt.entregador_foto
                ? h('img', {
                    src: _rrEnt.entregador_foto, alt: '',
                    className: 'w-9 h-9 rounded-full object-cover flex-shrink-0',
                    onError: (ev) => { ev.target.style.display = 'none'; },
                  })
                : h('span', {
                    className: 'w-9 h-9 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-sm flex-shrink-0',
                  }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-user' }))),
              h('div', { className: 'min-w-0' },
                h('div', { className: 'text-sm font-semibold text-gray-800 truncate' }, _rrEnt.entregador_nome),
                h('div', { className: 'text-[11px] text-gray-500' },
                  'Fica de fora ', h('b', null, 'desta OS'), ' — segue pegando outras'),
              ),
            ),

            h('ul', { className: 'space-y-2 text-[13px] text-gray-700' },
              [
                ['', 'A corrida atual é cancelada no provedor'],
                ['', 'A mesma OS é despachada de novo — endereço e valor não mudam'],
                ['', 'Se a nova cotação vier mais cara, o custo sobe'],
              ].map((it, i) => h('li', { key: i, className: 'flex gap-2 items-start' },
                h('span', { className: 'flex-shrink-0 w-1.5 h-1.5 rounded-full bg-purple-700 mt-[7px]', 'aria-hidden': 'true' }),
                h('span', null, it[1]),
              )),
            ),

            // Custo atual: a decisao fica com numero na frente, nao com sensacao.
            _rrEnt.valor_provider != null && h('div', {
              className: 'flex items-center justify-between bg-gray-50 border border-gray-200 rounded-[10px] px-3 py-2',
            },
              h('span', { className: 'text-xs text-gray-500' }, 'Custo atual'),
              h('span', { className: 'text-sm font-bold text-gray-900 tabular-nums' }, fmtMoney(parseFloat(_rrEnt.valor_provider))),
            ),

            redespachoRapidoModal.erro && h('div', { role: 'alert',
              className: 'bg-red-50 border border-red-200 rounded-[10px] px-3 py-2 text-xs text-red-800',
            }, redespachoRapidoModal.erro),
          ),

          h('div', { className: 'border-t border-gray-100 px-5 py-3 flex justify-end gap-2' },
            h('button', {
              type: 'button',
              onClick: () => setRedespachoRapidoModal(null),
              disabled: redespachandoRapido,
              className: 'h-10 px-4 bg-white border border-gray-200 rounded-[10px] text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50',
            }, 'Voltar'),
            h('button', {
              type: 'button',
              onClick: confirmarRedespachoRapido,
              disabled: redespachandoRapido,
              className: 'h-10 px-4 bg-purple-700 text-white rounded-[10px] text-sm font-semibold hover:bg-purple-800 disabled:opacity-60',
            }, redespachandoRapido ? 'Redespachando…' : 'Sim, redespachar'),
          ),
        )
      ),

      // ── Modal de redespacho ──
      redespachoAberto && h('div', {
        className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4',
        onClick: (ev) => { if (ev.target === ev.currentTarget) fecharRedespacho(); },
      },
        h('div', { role: 'dialog', 'aria-modal': 'true', className: 'bg-white rounded-[14px] border border-gray-200 max-w-lg w-full' }, /* HUB_CLEAN_V1 */
          h('div', { className: 'border-b border-gray-100 px-5 pt-5 pb-3' },
            h('h3', { className: 'text-base font-semibold text-gray-900' },
              `Redespachar OS ${redespachoAberto.entrega.codigo_os}`),
            h('p', { className: 'text-xs text-gray-500 mt-1' },
              'A entrega atual será cancelada e a OS será redespachada.'),
          ),
          h('div', { className: 'p-5 space-y-3' },
            h('div', { className: 'bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800' },
              h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16, color: "#d97706" }, "aria-hidden": "true" }, h("use", { href: "#i-alert" })), "Esta ação cancela a delivery atual no provedor (perdendo qualquer progresso de courier) e redespacha a mesma OS. O endereço vem da Mapp — se ele estiver errado, corrija na Mapp antes.")),

            h('div', null,
              h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1 uppercase' }, 'Endereço de entrega'),
              h('div', { className: 'text-sm text-gray-500 bg-gray-50 rounded p-2 border border-gray-200' },
                redespachoAberto.entrega.endereco_entrega || '—'),
            ),

            // RDA_RENDER_V1 - escolha do provedor + exclusao do entregador atual
            h('div', null,
              h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1 uppercase' }, 'Provedor'),
              h('select', {
                value: redespachoAberto.providerCode || '',
                onChange: e => setRedespachoAberto({ ...redespachoAberto, providerCode: e.target.value }),
                className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white',
              },
                h('option', { value: '' }, 'Mesmo da corrida' + (provedorInfo(redespachoAberto.entrega) ? ' (' + provedorInfo(redespachoAberto.entrega).nome + ')' : '')),
                h('option', { value: 'uber' }, 'Uber Direct'),
                h('option', { value: 'noventanove' }, '99Entrega'),
              ),
              h('p', { className: 'text-[11px] text-gray-500 mt-1' }, 'Em "Mesmo da corrida", mantem o provedor atual.'),
            ),

            h('label', { className: 'flex items-center gap-2 text-sm text-gray-600' },
              h('input', { type: 'checkbox', className: 'w-4 h-4', checked: redespachoAberto.excluir !== false, onChange: e => setRedespachoAberto({ ...redespachoAberto, excluir: e.target.checked }) }),
              'Excluir o entregador atual desta OS'),

            h('div', null,
              h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1 uppercase' }, 'Motivo (opcional)'),
              h('input', {
                type: 'text',
                value: redespachoAberto.motivo || '',
                onChange: e => setRedespachoAberto({ ...redespachoAberto, motivo: e.target.value }),
                placeholder: 'ex: courier não apareceu',
                className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm',
              }),
            ),
          ),
          h('div', { className: 'border-t border-gray-200 px-5 py-3 flex justify-end gap-2' },
            h('button', {
              type: 'button',
              onClick: fecharRedespacho,
              disabled: redespachando,
              className: 'h-10 px-4 bg-white border border-gray-200 rounded-[10px] text-sm text-gray-700 hover:bg-gray-50',
            }, 'Voltar'),
            h('button', {
              type: 'button',
              onClick: confirmarRedespacho,
              disabled: redespachando,
              className: 'h-10 px-4 bg-purple-700 text-white rounded-[10px] text-sm font-semibold hover:bg-purple-800 disabled:opacity-50',
            }, redespachando ? 'Redespachando…' : 'Confirmar redespacho'),
          ),
        )
      ),

      // ── Mini-modal pra pedir código da OS (substitui prompt() nativo) ──
      pedirCodigoModal && h('div', {
        className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4',
        onClick: (ev) => { if (ev.target === ev.currentTarget) setPedirCodigoModal(null); },
      },
        h('div', { role: 'dialog', 'aria-modal': 'true', className: 'bg-white rounded-[14px] border border-gray-200 max-w-sm w-full' }, /* HUB_CLEAN_V1 */
          h('div', { className: 'border-b border-gray-100 px-5 pt-5 pb-3' },
            h('h3', { className: 'text-base font-semibold text-gray-900' }, 'Despachar OS'),
            h('p', { className: 'text-xs text-gray-500 mt-0.5' }, 'Digite o código da OS pra cotar')
          ),
          h('div', { className: 'p-5' },
            h('input', {
              type: 'number',
              autoFocus: true,
              value: pedirCodigoModal.valor,
              onChange: (e) => setPedirCodigoModal({ valor: e.target.value }),
              onKeyDown: (e) => {
                if (e.key === 'Enter') confirmarCodigoEcotar();
                if (e.key === 'Escape') setPedirCodigoModal(null);
              },
              placeholder: 'ex: 1129725',
              'aria-label': 'Código da OS', className: 'w-full h-11 px-3 border border-gray-200 rounded-[10px] text-base font-mono focus:border-purple-700 focus:outline-none',
            }),
          ),
          h('div', { className: 'border-t border-gray-100 px-5 py-3 flex justify-end gap-2' },
            h('button', {
              type: 'button',
              onClick: () => setPedirCodigoModal(null),
              className: 'h-10 px-4 bg-white border border-gray-200 rounded-[10px] text-sm text-gray-700 hover:bg-gray-50',
            }, 'Voltar'),
            h('button', {
              type: 'button',
              onClick: confirmarCodigoEcotar,
              className: 'h-10 px-4 bg-purple-700 text-white rounded-[10px] text-sm font-semibold hover:bg-purple-800',
            }, 'Cotar OS'),
          )
        )
      ),

      // ── Modal de cotação manual com seleção de veículo (Opção C + Desenho 1) ──
      // 🆕 2026-05 Fase 5 — Modal de cotação COMPARATIVA multi-provider.
      cotacaoModal && (function () {
        const m = cotacaoModal;
        const veiculo = m.selecionado?.veiculo || 'motorcycle';
        const porProvider = m.porProvider || {};
        const blocos = Object.values(porProvider);

        function labelVeiculo(t) {
          return t === 'motorcycle' ? 'Moto' : t === 'car' ? 'Carro'
               : t === 'van' ? 'Van' : t === 'bicycle' ? 'Bike' : t === 'walker' ? 'A pé' : t;
        }
        const fmt = (v) => 'R$ ' + (parseFloat(v || 0)).toFixed(2).replace('.', ',');

        // Cotação de um provider pro veículo selecionado.
        const cotacaoDe = (bloco) => (bloco.cotacoes || []).find(c => c.vehicle_type === veiculo);

        // Recomendado = entre os disponíveis, o de MAIOR margem (estratégia "menor custo").
        let codeRecomendado = null;
        if (m.state === 'ok') {
          let melhor = -Infinity;
          blocos.forEach(b => {
            const c = cotacaoDe(b);
            if (c && c.available && parseFloat(c.margem || 0) > melhor) {
              melhor = parseFloat(c.margem || 0);
              codeRecomendado = b.code;
            }
          });
        }

        // Countdown: menor expires_at entre as cotações disponíveis do veículo.
        let segRestantes = 0;
        if (m.state === 'ok') {
          let menorExp = Infinity;
          blocos.forEach(b => {
            const c = cotacaoDe(b);
            if (c && c.available && c.expires_at) menorExp = Math.min(menorExp, c.expires_at);
          });
          if (menorExp !== Infinity) segRestantes = Math.max(0, Math.floor((menorExp - Date.now()) / 1000));
        }
        const expirou = m.state === 'ok' && segRestantes === 0;
        const mmss = `${Math.floor(segRestantes / 60)}:${String(segRestantes % 60).padStart(2, '0')}`;

        // Endereços (de qualquer cotação disponível).
        let endColeta = '—', endEntrega = '—', obsOS = '', kmRota = null;
        for (const b of blocos) {
          const c = (b.cotacoes || []).find(x => x.available);
          if (c) {
            endColeta = c.endereco_coleta || '—';
            endEntrega = c.endereco_entrega || '—';
            obsOS = c.observacao || '';
            kmRota = (c.distancia_km != null) ? parseFloat(c.distancia_km) : null;
            break;
          }
        }

        // Card de um provider.
        function CardProvider(bloco) {
          const c = cotacaoDe(bloco);
          const disp = c && c.available;
          const ehRecomendado = bloco.code === codeRecomendado;
          const margem = disp ? parseFloat(c.margem || 0) : 0;
          const margemNeg = disp && margem < 0;
          const despachandoEste = m.state === 'despachando' && m.despachandoProvider === bloco.code;

          return h('div', {
            key: bloco.code,
            className: `rounded-xl p-3.5 border ${ehRecomendado ? 'border-2 border-purple-400' : 'border-gray-200'}`,
          },
            h('div', { className: 'flex items-center gap-2 mb-1' },
              h(ProviderLogo, { code: bloco.code, size: 24 }),
              h('span', { className: 'font-semibold text-sm text-gray-800' }, bloco.display_name),
              ehRecomendado && h('span', {
                className: 'ml-auto text-[10px] px-2 py-0.5 rounded-md bg-purple-100 text-purple-700',
              }, 'Recomendado'),
            ),
            !disp
              ? h('div', { className: 'py-6 text-center text-xs text-gray-400' },
                  bloco.error || (c && c.error) || 'Sem cotação disponível')
              : h('div', null,
                  h('div', { className: 'flex items-baseline gap-1.5 mt-1' },
                    h('span', { className: 'text-2xl font-bold text-gray-900' }, fmt(c.valor_provider)),
                    h('span', { className: 'text-[11px] text-gray-500' }, 'custo provedor'),
                  ),
                  h('div', { className: 'mt-2 pt-2 border-t border-gray-100 text-xs space-y-1' },
                    h('div', { className: 'flex justify-between' },
                      h('span', { className: 'text-gray-500' }, 'Cobrado do cliente'),
                      h('span', null, fmt(c.valor_cliente))),
                    h('div', { className: 'flex justify-between' },
                      h('span', { className: 'text-gray-500' }, 'Margem'),
                      h('span', {
                        className: `font-medium ${margemNeg ? 'text-red-600' : 'text-green-600'}`,
                      }, `${margem >= 0 ? '+' : ''}${fmt(margem)} · ${parseFloat(c.margem_pct || 0).toFixed(0)}%`)),
                    h('div', { className: 'flex justify-between' },
                      h('span', { className: 'text-gray-500' }, 'ETA'),
                      h('span', null, c.eta_minutos != null ? `~ ${c.eta_minutos} min` : '—')),
                  ),
                  h('button', {
                    onClick: () => despacharPorProvider(bloco.code),
                    disabled: m.state !== 'ok' || expirou,
                    className: `w-full mt-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${
                      ehRecomendado
                        ? (margemNeg ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-purple-600 text-white hover:bg-purple-700')
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`,
                  }, despachandoEste ? 'Despachando…'
                     : margemNeg ? `Despachar mesmo assim`
                     : `Despachar pela ${bloco.display_name}`),
                ),
          );
        }

        return h('div', {
          className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4',
          onClick: (ev) => { if (ev.target === ev.currentTarget) fecharCotacaoModal(); },
        },
          h('div', { role: 'dialog', 'aria-modal': 'true', className: 'bg-white rounded-[14px] border border-gray-200 max-w-2xl w-full' },

            // Header
            h('div', { className: 'border-b border-gray-200 px-5 py-4 flex items-start justify-between' },
              h('div', null,
                h('h3', { className: 'text-base font-bold text-gray-800' }, `Cotar OS ${m.codigoOS}`),
                m.state === 'ok'
                  ? h('div', { className: 'mt-1 space-y-0.5' },
                      h('p', { className: 'text-xs text-gray-600' },
                        h('span', { className: 'font-semibold text-gray-500' }, h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-pin' })), 'Coleta: ')), endColeta),
                      h('p', { className: 'text-xs text-gray-600' },
                        h('span', { className: 'font-semibold text-purple-600' }, h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-target' })), 'Entrega: ')), endEntrega),
                      (kmRota != null) && h('p', { className: 'text-[11px] text-gray-400' },
                        `Distância da rota: ${kmRota.toFixed(1)} km`))
                  : h('p', { className: 'text-xs text-gray-500 mt-0.5' }, 'comparando provedores'),
              ),
              h('button', {
                onClick: fecharCotacaoModal,
                className: 'text-gray-400 hover:text-gray-700 text-xl leading-none',
              }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-x' }))),
            ),

            // Body
            (m.state === 'cotando')
              ? h('div', { className: 'p-12 text-center' },
                  h('div', { className: 'animate-spin w-10 h-10 border-4 border-purple-700 border-t-transparent rounded-full mx-auto mb-3' }),
                  h('p', { className: 'text-sm text-gray-500' }, 'Cotando nos provedores ativos…'))

            : (m.state === 'erro')
              ? h('div', { className: 'p-8 text-center' },
                  h('div', { className: 'text-3xl mb-2' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-alert' }))),
                  h('p', { className: 'text-sm text-gray-700 mb-4' }, m.error || 'Erro ao cotar'),
                  h('button', {
                    onClick: recotarOS,
                    className: 'px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700',
                  }, 'Tentar de novo'))

            : (m.state === 'disparando_simultaneo')
              ? h('div', { className: 'p-8' },
                  h('div', { className: 'text-center mb-6' },
                    h('div', { className: 'inline-flex items-center gap-2 text-sm font-bold text-purple-700' },
                      h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', className: 'w-4 h-4 text-orange-500' },
                        h('path', { d: 'M13 2 3 14h9l-1 8 10-12h-9l1-8z' })),
                      `Buscando entregador \u2014 ${(m.providersDisparo || []).length} provedores`),
                    h('p', { className: 'text-[11px] text-gray-400 mt-1' }, 'O primeiro que aceitar leva; os outros s\u00e3o cancelados')),
                  h('div', { className: 'flex gap-4 justify-center' },
                    (m.providersDisparo || []).map(code => {
                      const disp = (m.porProvider && m.porProvider[code]) || {};
                      const nome = disp.display_name || (code === 'uber' ? 'Uber Direct' : code === 'noventanove' ? '99Entrega' : code);
                      return h('div', { key: code, className: 'relative flex flex-col items-center gap-2 border border-purple-100 rounded-xl px-6 py-4 bg-purple-50/40' },
                        h('div', { className: 'relative' },
                          h('span', { className: 'absolute inset-0 rounded-full bg-purple-400 opacity-60 animate-ping' }),
                          h('div', { className: 'relative w-10 h-10 rounded-full bg-gray-900 text-white text-[10px] font-extrabold grid place-items-center' }, code === 'uber' ? 'Uber' : '99')),
                        h('div', { className: 'text-xs font-bold text-gray-700 mt-1' }, nome),
                        h('div', { className: 'text-[10px] font-semibold text-purple-600 animate-pulse' }, 'chamando\u2026'));
                    })))

            : h('div', { className: 'p-5' },
                // Seletor de veículo + countdown
                h('div', { className: 'flex items-center gap-2 mb-4' },
                  h('span', { className: 'text-[11px] font-semibold text-gray-500 uppercase' }, 'Veículo'),
                  ['motorcycle', 'car'].map(vt => h('button', {
                    key: vt,
                    onClick: () => selecionarVeiculo(vt),
                    className: `text-xs px-3 py-1 rounded-md ${
                      veiculo === vt ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`,
                  }, labelVeiculo(vt))),
                  h('div', { className: 'flex-1' }),
                  h('span', {
                    className: `text-[11px] ${expirou ? 'text-red-600 font-medium' : 'text-gray-500'}`,
                  }, expirou ? 'cotação expirada' : `expira em ${mmss}`),
                ),

                // Observacao da OS (read-only) — e o que o motoboy ve no app do provedor.
                obsOS && h('div', { className: 'mb-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2' },
                  h('div', { className: 'text-[10px] uppercase tracking-wider text-amber-700 font-semibold mb-0.5' }, h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-filetext' })), 'Observação (vai pro motoboy)')),
                  h('div', { className: 'text-xs text-gray-700 leading-relaxed' }, obsOS)),

                // Telefone do cliente — prefill da OS, editavel, obrigatorio.
                h('div', { className: 'mb-4' },
                  h('label', { className: 'block text-[11px] font-semibold text-gray-500 uppercase mb-1' },
                    h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-phone" })), "Telefone do cliente (recebe o código por WhatsApp)")),
                  h('input', {
                    type: 'tel',
                    value: m.telefone || '',
                    onChange: (ev) => setCotacaoModal(prev => ({ ...prev, telefone: ev.target.value })),
                    placeholder: 'Ex: 71993908345',
                    className: 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400',
                  }),
                  h('p', { className: 'text-[10px] text-gray-400 mt-1' },
                    'Obrigatório. O código de entrega da 99 será enviado para este número.')),

                // Nome do remetente (loja/coleta) e do cliente final — prefill da OS,
                // editaveis. Viram o remetente e o cliente que o motoboy ve no app.
                h('div', { className: 'grid grid-cols-2 gap-2 mb-4' },
                  h('div', {},
                    h('label', { className: 'block text-[11px] font-semibold text-gray-500 uppercase mb-1' },
                      h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-building" })), "Nome do remetente (loja)")),
                    h('input', {
                      type: 'text',
                      value: m.nomeRemetente || '',
                      onChange: (ev) => setCotacaoModal(prev => ({ ...prev, nomeRemetente: ev.target.value })),
                      placeholder: 'Ex: Loja Centro',
                      className: 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400',
                    })),
                  h('div', {},
                    h('label', { className: 'block text-[11px] font-semibold text-gray-500 uppercase mb-1' },
                      h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-target" })), "Nome do cliente final")),
                    h('input', {
                      type: 'text',
                      value: m.nomeCliente || '',
                      onChange: (ev) => setCotacaoModal(prev => ({ ...prev, nomeCliente: ev.target.value })),
                      placeholder: 'Ex: Oficina JF',
                      className: 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400',
                    }))),

                // Complemento / observação da entrega -> dropoff_notes (Uber) / obs (99)
                h('div', { className: 'mb-4' },
                  h('label', { className: 'block text-[11px] font-semibold text-gray-500 uppercase mb-1' },
                    h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-filetext" })), "Complemento / observação da entrega")),
                  h('input', {
                    type: 'text',
                    value: m.complementoEntrega || '',
                    onChange: (ev) => setCotacaoModal(prev => ({ ...prev, complementoEntrega: ev.target.value })),
                    placeholder: 'Ex: Sala 302, portaria azul, falar com João',
                    maxLength: 280,
                    className: 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400',
                  }),
                  h('p', { className: 'text-[10px] text-gray-400 mt-1' },
                    'Opcional. Vai como observação de entrega pro entregador (Uber/99).')),

                // Cards lado a lado
                h('div', {
                  className: `grid gap-3 ${blocos.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`,
                }, blocos.map(CardProvider)),

                // Nota da estratégia
                h('div', { className: 'mt-4 bg-gray-50 rounded-lg px-3 py-2 text-[11px] text-gray-600 flex items-center gap-1.5' },
                  h('svg', { className: 'ico', 'aria-hidden': 'true', style: { color: '#9ca3af' } }, h('use', { href: '#i-info' })), /* HUB_CLEAN_V1 */
                  h('span', null, 'Recomendado = maior margem para o veículo selecionado. O despacho automático do worker usa a estratégia configurada.')),

                // Rodapé
                h('div', { className: 'flex items-center gap-2 mt-4 pt-3 border-t border-gray-100' },
                  // BUSCA_SIMULTANEA_UI_V1: dispara nos 2 ao mesmo tempo (so com 2+ providers)
                  (blocos.length > 1 && !expirou) && h('button', {
                    onClick: despacharSimultaneo,
                    title: 'Dispara nos provedores ao mesmo tempo; o primeiro que aceitar leva, os outros s\u00e3o cancelados',
                    className: 'inline-flex items-center gap-1.5 h-10 px-4 rounded-[10px] text-sm font-semibold text-white bg-purple-700 hover:bg-purple-800',
                  },
                    h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', className: 'w-4 h-4' },
                      h('path', { d: 'M13 2 3 14h9l-1 8 10-12h-9l1-8z' })),
                    'Chamada simult\u00e2nea'),
                  h('div', { className: 'flex-1' }),
                  expirou && h('button', {
                    onClick: recotarOS,
                    className: 'px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200',
                  }, 'Cotar de novo'),
                  h('button', {
                    onClick: fecharCotacaoModal,
                    className: 'px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200',
                  }, 'Cancelar')),
              )
          )
        );
      })()
    );
  }

  // ════════════════════════════════════════════════════════
  // MODAL: Detalhes de uma entrega
  // ════════════════════════════════════════════════════════
  function ModalDetalhesEntrega({ data, onClose, showToast, fetchAuth, API_URL }) {
    const { entrega: e, tracking, webhooks, loading } = data;
    // Valores p/ os cards do modal (mesma logica do CardEntrega — antes ausentes
    // neste escopo, o que quebrava o modal com ReferenceError: valorUber).
    const valorUber    = parseFloat(e.valor_uber || e.valor_provider || 0);
    const valorHub     = parseFloat(e.valor_servico || 0);
    const margemHub    = Math.round((valorHub - valorUber) * 100) / 100;
    const margemHubPct = valorUber > 0 ? Math.round((margemHub / valorUber) * 1000) / 10 : null;
    const margemPos    = margemHub >= 0;
    const [showDebug, setShowDebug] = useState(false);

    // CLIENTE_MANUAL_V1 — atribuir a corrida a um cliente (= uma REGRA).
    //
    // Serve pra corrida manual cujo endereco nao casou com regra nenhuma: o
    // trecho e o identificador sao os DOIS substring do endereco de coleta,
    // entao quando o endereco vem digitado diferente, falham juntos. Aqui e
    // na mao, sem depender do endereco.
    const [regras, setRegras] = useState(null);   // null = ainda nao buscou
    const [regraSel, setRegraSel] = useState(e.regra_id_manual || '');
    const [salvandoCliente, setSalvandoCliente] = useState(false);
    const [clienteAtual, setClienteAtual] = useState(e.cliente_nome_regra || null);
    const [manualAtivo, setManualAtivo] = useState(!!e.regra_id_manual);

    async function carregarRegras() {
      if (regras !== null) return;
      try {
        const res = await fetchAuth(`${API_URL}/logistics/dispatch-rules`);
        const json = await res.json();
        const lista = Array.isArray(json) ? json : (json.regras || json.rules || json.data || []);
        setRegras(lista.filter(r => r && r.cliente_nome));
      } catch { setRegras([]); showToast && showToast('Erro ao carregar clientes', 'error'); }
    }

    async function salvarCliente(novoId) {
      setSalvandoCliente(true);
      try {
        const res = await fetchAuth(`${API_URL}/logistics/deliveries/${e.id}/cliente`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ regraId: novoId === '' ? null : parseInt(novoId, 10) }),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.success) {
          setClienteAtual(json.regra ? json.regra.cliente_nome : null);
          setManualAtivo(!!json.regra);
          showToast && showToast(
            json.regra
              ? (json.tem_tabela ? 'Cliente atribuído — o valor passa a seguir a tabela dele' : 'Cliente atribuído')
              : 'Atribuição removida',
            'success');
        } else {
          showToast && showToast(json.error || 'Erro ao atribuir cliente', 'error');
          setRegraSel(e.regra_id_manual || '');
        }
      } catch {
        showToast && showToast('Erro de rede ao atribuir cliente', 'error');
        setRegraSel(e.regra_id_manual || '');
      } finally { setSalvandoCliente(false); }
    }

    const [comprovante, setComprovante] = useState(null);      // proof_of_delivery
    const [loadingComprovante, setLoadingComprovante] = useState(false);
    const [erroComprovante, setErroComprovante] = useState(null);

    // Carrega comprovante de entrega (só Uber + DELIVERED)
    async function carregarComprovante() {
      setLoadingComprovante(true);
      setErroComprovante(null);
      try {
        const res = await fetchAuth(`${API_URL}/logistics/deliveries/${e.id}/comprovante`);
        const json = await res.json();
        if (json.success) {
          setComprovante(json.comprovante);
        } else {
          setErroComprovante(json.detalhe || json.error || 'Comprovante não disponível');
        }
      } catch (err) {
        setErroComprovante('Erro ao buscar comprovante');
      } finally {
        setLoadingComprovante(false);
      }
    }

    // Monta src de imagem a partir do campo do comprovante Uber
    // Uber retorna: { document: { type, base64_contents }, signature: { type, base64_contents }, pictures: [...] }
    function imgSrc(campo) {
      if (!campo) return null;
      // 99Entrega: a foto vem como URL direta (string http...).
      if (typeof campo === 'string') {
        return /^https?:\/\//i.test(campo) ? campo : null;
      }
      // Uber: base64 dentro de { type, base64_contents }.
      const tipo = campo.type || 'image/jpeg';
      const b64  = campo.base64_contents || campo.data || null;
      if (b64) return `data:${tipo};base64,${b64}`;
      // fallback: objeto com url
      if (campo.url && /^https?:\/\//i.test(campo.url)) return campo.url;
      return null;
    }

    function copiarDeliveryId() {
      if (!e.uber_delivery_id) return;
      navigator.clipboard?.writeText(e.uber_delivery_id).then(
        () => showToast('ID da entrega copiado', 'success'),
        () => showToast('Erro ao copiar', 'error')
      );
    }

    return h('div', {
      className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4',
      onClick: (ev) => { if (ev.target === ev.currentTarget) onClose(); },
    },
      h('div', { className: 'bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto' },

        // Header do modal — OS + status + banner Uber ID (quando for Uber)
        h('div', { className: 'sticky top-0 bg-white border-b border-gray-200' },
          // Banner roxo "numero de entrega" — so exibe para entregas Uber
          e.uber_delivery_id && e.provider_code === 'uber' && h('div', {
            className: 'flex items-center justify-center gap-2 bg-purple-600 text-white text-sm font-medium px-5 py-2',
          },
            h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 20 20', fill: 'currentColor', className: 'w-4 h-4 flex-shrink-0' },
              h('path', { fillRule: 'evenodd', d: 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z', clipRule: 'evenodd' })
            ),
            h('span', null,
              'O numero de entrega do pedido e ',
              h('strong', null, `#${e.codigo_os}`),
              ' (Uber ID: ',
              h('span', { className: 'font-mono' },
                (function(){
                  // 🔧 2026-06: Uber ID = ultimos 5 do UUID do tracking_url (apos /orders/),
                  // nao do del_... (que dava "WDRUW"/"BDBVA"). Fallback pro del_ se faltar URL.
                  try {
                    if (e.tracking_url) {
                      var m = String(e.tracking_url).match(/\/orders\/([0-9a-fA-F-]{36})/);
                      if (m && m[1]) return m[1].slice(-5).toUpperCase();
                      var any = String(e.tracking_url).match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
                      if (any) return any[0].slice(-5).toUpperCase();
                    }
                  } catch (err) {}
                  return e.uber_delivery_id ? String(e.uber_delivery_id).slice(-5).toUpperCase() : '-----';
                })()
              ),
              ')'
            ),
          ),
          h('div', { className: 'px-5 py-4 flex items-center justify-between' },
            h('div', null,
              h('h3', { className: 'text-xl font-bold text-gray-800' }, `OS ${e.codigo_os}`),
              h('div', { className: 'flex items-center gap-2 mt-1' },
                h(Badge, { entrega: e }),
              )
            ),
            h('button', {
              onClick: onClose,
              className: 'text-gray-400 hover:text-gray-600 text-2xl leading-none px-2',
            }, '×')
          ),
        ),

        // Body
        loading
          ? h('div', { className: 'p-12 text-center' },
              h('div', { className: 'animate-spin w-8 h-8 border-4 border-purple-700 border-t-transparent rounded-full mx-auto' })
            )
          : h('div', { className: 'p-5 space-y-5' },

              // CLIENTE_MANUAL_V1 — atribuicao de cliente.
              // Fica no topo de proposito: quando a corrida esta sem cliente,
              // e a primeira coisa que o operador quer resolver.
              h('div', { className: `rounded-xl border p-3 ${clienteAtual ? 'border-gray-200 bg-white' : 'border-amber-200 bg-amber-50'}` },
                h('div', { className: 'flex items-center justify-between mb-2' },
                  h('span', { className: 'text-xs uppercase tracking-wider text-gray-400 font-semibold' }, 'Cliente'),
                  manualAtivo && h('span', {
                    className: 'text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold',
                    title: `Atribuído manualmente${e.regra_manual_por ? ' por ' + e.regra_manual_por : ''}`,
                  }, 'manual'),
                ),
                h('div', { className: `text-sm font-semibold mb-2 ${clienteAtual ? 'text-gray-800' : 'text-amber-700'}` },
                  clienteAtual || 'Sem cliente — o endereço não casou com nenhuma regra'),
                h('div', { className: 'flex items-center gap-2' },
                  h('select', {
                    value: regraSel,
                    disabled: salvandoCliente,
                    onFocus: carregarRegras,
                    onMouseDown: carregarRegras,
                    onChange: (ev) => { setRegraSel(ev.target.value); salvarCliente(ev.target.value); },
                    className: 'flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 bg-white',
                  },
                    h('option', { value: '' }, regras === null ? 'Escolher cliente...' : '— sem atribuição —'),
                    (regras || []).map(r => h('option', { key: r.id, value: r.id }, r.cliente_nome)),
                  ),
                  salvandoCliente && h('span', { className: 'text-[11px] text-gray-400' }, 'salvando...'),
                ),
                // O aviso importa: no Hub "cliente" e uma REGRA, e a regra
                // carrega a tabela de preco. Nao da pra atribuir so o nome.
                h('div', { className: 'text-[10px] text-gray-500 mt-1.5' },
                  'Atribuir um cliente faz a tabela de preço dele valer nesta corrida — o valor no relatório muda.'),
              ),

              // Endereços completos
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
                h('div', null,
                  h('div', { className: 'text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1' }, h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-package' })), 'Coleta')),
                  h('div', { className: 'text-sm text-gray-800 leading-relaxed' }, e.endereco_coleta || '—'),
                  e.latitude_coleta && h('div', { className: 'text-[11px] text-gray-400 mt-1 font-mono' },
                    `${e.latitude_coleta}, ${e.longitude_coleta}`)
                ),
                h('div', null,
                  h('div', { className: 'text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1' }, h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-pin' })), 'Entrega')),
                  h('div', { className: 'text-sm text-gray-800 leading-relaxed' }, e.endereco_entrega || '—'),
                  e.latitude_entrega && h('div', { className: 'text-[11px] text-gray-400 mt-1 font-mono' },
                    `${e.latitude_entrega}, ${e.longitude_entrega}`)
                ),
              ),

              // ── 3 cards operacionais no modal ──
              h('div', { className: 'grid grid-cols-3 gap-2' },
                h('div', { className: 'bg-gray-50 rounded-lg px-3 py-2.5' },
                  h('div', { className: 'text-[11px] text-gray-500 mb-0.5' }, 'Custo do provedor'),
                  h('div', { className: 'text-base font-semibold' }, fmtMoney(valorUber)),
                  e.distancia_km && h('div', { className: 'text-[10px] text-gray-400 mt-0.5' },
                    `${parseFloat(e.distancia_km).toFixed(1)} km`)
                ),
                h('div', { className: 'bg-purple-50 rounded-lg px-3 py-2.5' },
                  h('div', { className: 'text-[11px] text-purple-600 mb-0.5' }, 'Valor pela regra (km)'),
                  h('div', { className: 'text-base font-semibold text-purple-800' }, fmtMoney(valorHub))
                ),
                h('div', { className: `rounded-lg px-3 py-2.5 ${margemPos ? 'bg-green-50' : 'bg-red-50'}` },
                  h('div', { className: `text-[11px] mb-0.5 ${margemPos ? 'text-green-700' : 'text-red-700'}` }, 'Margem'),
                  h('div', { className: `text-base font-semibold ${margemPos ? 'text-green-800' : 'text-red-800'}` },
                    `${margemPos ? '+ ' : '− '}${fmtMoney(Math.abs(margemHub))}`),
                  margemHubPct !== null && h('div', { className: `text-[10px] mt-0.5 ${margemPos ? 'text-green-600' : 'text-red-600'}` },
                    `${margemPos ? '+' : ''}${margemHubPct.toFixed(1)}%`)
                ),
              ),

              // Entregador completo
              e.entregador_nome && h('div', { className: 'bg-gray-50 rounded-lg p-4' },
                h('div', { className: 'text-xs uppercase tracking-wider text-gray-400 font-semibold mb-3' }, h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-bike' })), 'Entregador')),
                h('div', { className: 'flex gap-4 items-start' },
                  // Foto grande à esquerda
                  e.entregador_foto && h('img', {
                    src: e.entregador_foto,
                    alt: e.entregador_nome,
                    className: 'w-20 h-20 rounded-full object-cover bg-purple-100 flex-shrink-0',
                    onError: (ev) => { ev.target.style.display = 'none'; },
                  }),
                  // Dados ao lado
                  h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2 text-sm flex-1 min-w-0' },
                    h('div', null, h('span', { className: 'text-gray-500' }, 'Nome: '), h('span', { className: 'font-semibold' }, e.entregador_nome)),
                    e.entregador_rating && h('div', null, h('span', { className: 'text-gray-500' }, 'Rating: '), `${e.entregador_rating}`),
                    e.entregador_telefone && h('div', null, h('span', { className: 'text-gray-500' }, 'Telefone: '), fmtTelefoneBR(e.entregador_telefone)),
                    e.entregador_placa && h('div', null, h('span', { className: 'text-gray-500' }, 'Placa: '), e.entregador_placa),
                    e.entregador_veiculo && h('div', null, h('span', { className: 'text-gray-500' }, 'Veículo: '), e.entregador_veiculo),
                    e.entregador_documento && h('div', null, h('span', { className: 'text-gray-500' }, 'Doc: '), e.entregador_documento),
                    e.id_motoboy_mapp && h('div', null, h('span', { className: 'text-gray-500' }, 'id Mapp: '), e.id_motoboy_mapp),
                  ),
                ),
              ),

              // Tracking URL oficial do provedor
              e.tracking_url && h('div', { className: 'bg-purple-50 border border-purple-200 rounded-lg p-3' },
                h('div', { className: 'text-xs uppercase tracking-wider text-purple-700 font-semibold mb-2' }, h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-link' })), 'Rastreio da entrega')),
                h('div', { className: 'flex items-center gap-2 flex-wrap' },
                  h('a', {
                    href: e.tracking_url,
                    target: '_blank',
                    rel: 'noopener noreferrer',
                    className: 'text-sm text-purple-700 hover:text-purple-900 underline break-all flex-1 min-w-0',
                  }, e.tracking_url),
                  h('button', {
                    onClick: () => navigator.clipboard?.writeText(e.tracking_url).then(
                      () => showToast('Link de rastreio copiado', 'success')
                    ),
                    className: 'text-xs px-2.5 py-1.5 border border-purple-200 rounded-md hover:bg-purple-100 text-purple-700 flex-shrink-0',
                  }, 'Copiar'),
                )
              ),

              // Erro último, com traducao PT-BR dos erros mais comuns
              e.erro_ultimo && (function() {
                const ERROS_MAP = {
                  // Uber Direct
                  'pickup_address_not_serviceable':      'Endereco de coleta fora da area de cobertura da Uber',
                  'dropoff_address_not_serviceable':     'Endereco de entrega fora da area de cobertura da Uber',
                  'address_not_found':                   'Endereco nao encontrado (verifique o CEP ou logradouro)',
                  'geocode_failed':                      'Nao foi possivel geocodificar o endereco',
                  'invalid_address':                     'Endereco invalido ou incompleto',
                  'quote_expired':                       'Cotacao expirou — tente redespachar',
                  'quote_not_found':                     'Cotacao nao encontrada (pode ter expirado)',
                  'delivery_not_found':                  'Entrega nao encontrada na Uber',
                  'no_couriers_available':               'Nenhum entregador disponivel na regiao no momento',
                  'courier_unavailable':                 'Entregador indisponivel — tentando reatribuir',
                  'cannot_cancel':                       'Cancelamento nao permitido neste status (entregador ja coletou)',
                  'payment_failed':                      'Falha no pagamento junto a Uber — verifique credito da conta',
                  'rate_limited':                        'Muitas requisicoes — aguarde alguns segundos e tente novamente',
                  'unauthorized':                        'Credenciais Uber invalidas ou expiradas',
                  'forbidden':                           'Sem permissao — verifique configuracao do provider Uber',
                  'service_unavailable':                 'Servico Uber temporariamente indisponivel — tente novamente',
                  // 99Entrega
                  'cancel too frequently':               '99Entrega: muitos cancelamentos seguidos — aguarde antes de cancelar novamente',
                  'errno=-1':                            '99Entrega: erro interno no sistema deles — tente novamente em instantes',
                  'errno=1001':                          '99Entrega: limite de cancelamentos atingido — aguarde',
                  'estimate_id':                         '99Entrega: cotacao invalida ou expirada — tente redespachar',
                  'order_not_found':                     '99Entrega: pedido nao encontrado na plataforma deles',
                  'invalid_pickup':                      '99Entrega: ponto de coleta invalido (CEP ou coordenada)',
                  'invalid_dropoff':                     '99Entrega: ponto de entrega invalido (CEP ou coordenada)',
                  // Generico
                  'timeout':                             'Timeout na comunicacao com o provedor — tente novamente',
                  'network':                             'Falha de rede ao comunicar com o provedor',
                  'auth_failed':                         'Falha de autenticacao com o provedor — verifique as credenciais',
                };
                const raw = String(e.erro_ultimo || '').toLowerCase();
                const traducao = Object.entries(ERROS_MAP).find(([k]) => raw.includes(k.toLowerCase()));
                return h('div', { className: 'bg-red-50 border border-red-200 rounded-lg p-3 space-y-1' },
                  h('div', { className: 'text-xs uppercase tracking-wider text-red-700 font-semibold' }, h('span', { className: 'inline-flex items-center gap-1' }, Icon('alert'), '\u00daltimo erro')),
                  traducao && h('div', { className: 'text-sm text-red-900 font-medium' }, traducao[1]),
                  h('div', { className: 'text-xs text-red-700 font-mono break-words opacity-70 pt-1 border-t border-red-100' }, e.erro_ultimo),
                );
              })(),

              // ── Códigos de verificação (coleta + entrega) ───────────────────────
              (e.pickup_code || e.dropoff_code) &&
              h('div', { className: 'border border-gray-200 rounded-xl overflow-hidden' },
                h('div', { className: 'bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between' },
                  h('span', { className: 'text-sm font-semibold text-gray-700' }, h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-key' })), 'Códigos de verificação')),
                  h('span', { className: 'text-xs text-gray-400' }, 'Apresente ao entregador / destinatário'),
                ),
                h('div', { className: 'p-4 space-y-3' },

                  // Código de COLETA
                  e.pickup_code && h('div', { className: 'flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3' },
                    h('div', null,
                      h('div', { className: 'text-xs uppercase tracking-wider text-amber-700 font-semibold mb-1' }, h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-package' })), 'Código de coleta')),
                      h('div', { className: 'text-xs text-amber-600 mb-1' }, 'Atendente da loja informa ao motoboy ao entregar o pacote'),
                      h('div', { className: 'text-2xl font-bold tracking-widest text-amber-800 font-mono' }, e.pickup_code),
                    ),
                    h('div', { className: 'flex flex-col gap-1.5 ml-4' },
                      h('button', {
                        onClick: () => navigator.clipboard?.writeText(e.pickup_code).then(() => showToast('Código copiado', 'success')),
                        className: 'text-xs px-2.5 py-1.5 border border-amber-200 rounded-md hover:bg-amber-100 text-amber-700',
                      }, 'Copiar'),
                      h('button', {
                        onClick: async () => {
                          try {
                            const r = await fetchAuth(`${API_URL}/logistics/deliveries/${e.id}/reenviar-codigo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'coleta' }) });
                            const j = await r.json();
                            showToast(j.ok ? 'WhatsApp enviado para a loja!' : `Não enviado: ${j.motivo || j.error}`, j.ok ? 'success' : 'error');
                          } catch (_) { showToast('Erro ao enviar', 'error'); }
                        },
                        className: 'text-xs px-2.5 py-1.5 border border-amber-200 rounded-md hover:bg-amber-100 text-amber-700',
                      }, h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-phone' })), 'Reenviar WPP')),
                    ),
                  ),

                  // Código de ENTREGA
                  e.dropoff_code && h('div', { className: 'flex items-center justify-between bg-purple-50 border border-purple-200 rounded-lg px-4 py-3' },
                    h('div', null,
                      h('div', { className: 'text-xs uppercase tracking-wider text-purple-700 font-semibold mb-1' }, h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-pin' })), 'Código de entrega')),
                      h('div', { className: 'text-xs text-purple-600 mb-1' },
                        e.codigo_wpp_enviado
                          ? h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, h("use", { href: "#i-check" })), "WhatsApp enviado ao destinatário")
                          : h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16, color: "#d97706" }, "aria-hidden": "true" }, h("use", { href: "#i-alert" })), "WhatsApp ainda não enviado ao destinatário")
                      ),
                      h('div', { className: 'text-2xl font-bold tracking-widest text-purple-800 font-mono' }, e.dropoff_code),
                    ),
                    h('div', { className: 'flex flex-col gap-1.5 ml-4' },
                      h('button', {
                        onClick: () => navigator.clipboard?.writeText(e.dropoff_code).then(() => showToast('Código copiado', 'success')),
                        className: 'text-xs px-2.5 py-1.5 border border-purple-200 rounded-md hover:bg-purple-100 text-purple-700',
                      }, 'Copiar'),
                      h('button', {
                        onClick: async () => {
                          try {
                            const r = await fetchAuth(`${API_URL}/logistics/deliveries/${e.id}/reenviar-codigo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'entrega' }) });
                            const j = await r.json();
                            showToast(j.ok ? 'WhatsApp enviado ao destinatário!' : `Não enviado: ${j.motivo || j.error}`, j.ok ? 'success' : 'error');
                          } catch (_) { showToast('Erro ao enviar', 'error'); }
                        },
                        className: 'text-xs px-2.5 py-1.5 border border-purple-200 rounded-md hover:bg-purple-100 text-purple-700',
                      }, h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-phone' })), 'Reenviar WPP')),
                    ),
                  ),

                  // Código de DEVOLUÇÃO (99 — quando o item retorna ao remetente).
                  // So aparece quando ha codigo; fica so aqui nos detalhes.
                  e.return_code && h('div', { className: 'flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-4 py-3' },
                    h('div', null,
                      h('div', { className: 'text-xs uppercase tracking-wider text-orange-700 font-semibold mb-1' }, h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-corner' })), 'Código de devolução')),
                      h('div', { className: 'text-xs text-orange-600 mb-1' }, 'Apresente ao remetente ao devolver o pacote'),
                      h('div', { className: 'text-2xl font-bold tracking-widest text-orange-800 font-mono' }, e.return_code),
                    ),
                    h('button', {
                      onClick: () => navigator.clipboard?.writeText(e.return_code).then(() => showToast('Código copiado', 'success')),
                      className: 'text-xs px-2.5 py-1.5 border border-orange-200 rounded-md hover:bg-orange-100 text-orange-700 ml-4',
                    }, 'Copiar'),
                  ),

                  // Devolvido SEM codigo = verificacao por FOTO (return_handover_method=2).
                  // Direciona o operador pro comprovante em vez de deixar o campo vazio.
                  !e.return_code && (e.status_canonico === 'RETURNED' || /sendback|devolv/i.test(String(e.status_native || ''))) &&
                  h('div', { className: 'flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm text-orange-800' },
                    h('span', { className: 'text-base' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-camera' }))),
                    h('span', null, 'Devolução verificada por foto — veja o comprovante abaixo.'),
                  ),
                ),
              ),

              // ── Comprovante de entrega (Uber + 99Entrega, pós DELIVERED) ──────
              ((e.provider_code === 'uber' || e.provider_code === 'noventanove') && (['PICKED_UP','DROPOFF_EN_ROUTE','ARRIVED_DROPOFF','DELIVERED'].includes(e.status_canonico) || e.status_uber === 'delivered')) &&
              h('div', { className: 'border border-gray-200 rounded-xl overflow-hidden' },

                // Header do bloco
                h('div', { className: 'bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between' },
                  h('div', { className: 'flex items-center gap-2' },
                    h('span', { className: 'text-sm font-semibold text-gray-700' }, h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-camera' })), 'Comprovante de entrega')),
                    h('span', { className: 'text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full' }, e.provider_code === 'noventanove' ? '99Entrega' : 'Uber Direct'),
                  ),
                  !comprovante && !loadingComprovante && h('button', {
                    onClick: carregarComprovante,
                    className: 'text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold',
                  }, 'Carregar comprovante'),
                ),

                h('div', { className: 'p-4' },

                  // Loading
                  loadingComprovante && h('div', { className: 'flex items-center justify-center gap-2 py-6 text-gray-500 text-sm' },
                    h('div', { className: 'w-5 h-5 border-2 border-purple-700 border-t-transparent rounded-full animate-spin' }),
                    'Buscando comprovante na Uber...'
                  ),

                  // Erro
                  erroComprovante && !loadingComprovante && h('div', { className: 'bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800' },
                    h('div', { className: 'font-semibold mb-1' }, 'Comprovante não disponível'),
                    erroComprovante,
                  ),

                  // Comprovante carregado
                  comprovante && !loadingComprovante && h('div', { className: 'space-y-4' },

                    // Foto(s) da entrega
                    (function() {
                      const fotos = [];
                      // Campo principal: document (Uber)
                      const srcDoc = imgSrc(comprovante.document);
                      if (srcDoc) fotos.push({ src: srcDoc, label: 'Foto do local de entrega' });
                      // Campo pictures (array, Uber)
                      if (Array.isArray(comprovante.pictures)) {
                        comprovante.pictures.forEach((p, i) => {
                          const s = imgSrc(p.document || p);
                          if (s) fotos.push({ src: s, label: `Foto ${i + 2}` });
                        });
                      }
                      // 🆕 99Entrega: arrays de URL por tipo (entrega/coleta/devolucao)
                      (comprovante.fotos_entrega || []).forEach((u, i) => {
                        const s = imgSrc(u); if (s) fotos.push({ src: s, label: `Entrega ${i + 1}` });
                      });
                      (comprovante.fotos_coleta || []).forEach((u, i) => {
                        const s = imgSrc(u); if (s) fotos.push({ src: s, label: `Coleta ${i + 1}` });
                      });
                      (comprovante.fotos_devolucao || []).forEach((u, i) => {
                        const s = imgSrc(u); if (s) fotos.push({ src: s, label: `Devolucao ${i + 1}` });
                      });
                      // fallback generico: comprovante.fotos[]
                      if (fotos.length === 0 && Array.isArray(comprovante.fotos)) {
                        comprovante.fotos.forEach((u, i) => {
                          const s = imgSrc(u); if (s) fotos.push({ src: s, label: `Foto ${i + 1}` });
                        });
                      }
                      if (fotos.length === 0) return null;
                      return h('div', null,
                        h('div', { className: 'text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2' },
                          `${fotos.length === 1 ? 'Foto da entrega' : `Fotos (${fotos.length})`}`),
                        h('div', { className: `grid gap-2 ${fotos.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}` },
                          fotos.map(({ src, label }, i) =>
                            h('div', { key: i },
                              h('img', {
                                src,
                                alt: label,
                                className: 'w-full rounded-lg border border-gray-200 object-cover max-h-64',
                                onError: (ev) => {
                                  ev.target.parentElement.innerHTML = '<div class="text-xs text-gray-400 text-center py-6 border border-gray-200 rounded-lg">Imagem não disponível</div>';
                                },
                              }),
                              h('div', { className: 'text-[11px] text-gray-400 mt-1 text-center' }, label),
                            )
                          )
                        )
                      );
                    })(),

                    // Assinatura
                    (function() {
                      const srcSig = imgSrc(comprovante.signature);
                      if (!srcSig) return null;
                      return h('div', null,
                        h('div', { className: 'text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2' }, h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-pencil' })), 'Assinatura do recebedor')),
                        h('div', { className: 'bg-gray-50 rounded-lg border border-gray-200 p-3 flex justify-center' },
                          h('img', {
                            src: srcSig,
                            alt: 'Assinatura',
                            className: 'max-h-24 object-contain',
                            style: { filter: 'invert(0)' },
                          })
                        )
                      );
                    })(),

                    // Rodapé com botão de download
                    h('div', { className: 'flex items-center justify-between pt-2 border-t border-gray-100' },
                      h('div', { className: 'text-xs text-gray-400' },
                        e.finalizado_at ? `Entrega concluída em ${fmtDT(e.finalizado_at)}` : 'Entrega concluída'
                      ),
                      h('button', {
                        onClick: () => {
                          const dataStr = JSON.stringify(comprovante, null, 2);
                          const blob = new Blob([dataStr], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `comprovante-OS${e.codigo_os}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        },
                        className: 'text-xs px-2.5 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600',
                      }, h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-download' })), 'Baixar dados brutos')),
                    ),
                  ),

                  // Estado inicial — antes de clicar em "Carregar"
                  !comprovante && !loadingComprovante && !erroComprovante &&
                  h('div', { className: 'text-center py-5 text-gray-400 text-sm' },
                    h('div', { className: 'text-2xl mb-2' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-filetext' }))),
                    'Clique em "Carregar comprovante" para buscar a foto e assinatura coletadas pelo entregador da Uber.'
                  ),
                ),
              ),

              // Timestamps
              h('div', { className: 'text-xs text-gray-500 pt-3 border-t border-gray-100 space-y-0.5' },
                h('div', null, `Despachada: ${fmtDT(e.created_at)}`),
                e.finalizado_at && h('div', null, `Finalizada: ${fmtDT(e.finalizado_at)}`),
                h('div', null, `Tentativas: ${e.tentativas || 0}`),
                e.cancelado_por && h('div', null, `Cancelada por: ${e.cancelado_por}${e.cancelado_motivo ? ' — ' + e.cancelado_motivo : ''}`),
              ),

              // ID da entrega (rotulado, com botão copiar) — último item antes do debug
              e.uber_delivery_id && h('div', { className: 'flex items-center justify-between gap-2 text-xs pt-2 border-t border-gray-100' },
                h('div', { className: 'min-w-0 flex-1' },
                  h('span', { className: 'text-gray-500' }, 'ID da entrega: '),
                  h('span', { className: 'font-mono text-gray-700 break-all' }, e.uber_delivery_id),
                ),
                h('button', {
                  onClick: copiarDeliveryId,
                  className: 'text-xs px-2 py-1 border border-gray-200 rounded hover:bg-gray-50 text-gray-600 flex-shrink-0',
                  title: 'Copiar ID',
                }, h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-clipboard' })), 'Copiar')),
              ),

              // ── 🔧 Dados técnicos (colapsável) ──
              // 🆕 Trilha da entrega (criação → coleta → entrega + troca de moto / devolução)
              h(TrilhaEntrega, { entrega: e, webhooks: webhooks }),

              // Pra debug. Mostra tracking points brutos + webhooks recebidos.
              // Quase nunca é necessário no dia-a-dia, mas é vital quando algo dá errado.
              ((tracking && tracking.length > 0) || (webhooks && webhooks.length > 0)) && h('div', { className: 'pt-3 border-t border-gray-100' },
                h('button', {
                  onClick: () => setShowDebug(!showDebug),
                  className: 'w-full flex items-center justify-between text-xs text-gray-500 hover:text-gray-800 py-2 px-3 rounded-lg hover:bg-gray-50',
                },
                  h('span', { className: 'font-semibold' },
                    `Dados técnicos (${(tracking?.length || 0)} pts · ${(webhooks?.length || 0)} webhooks)`),
                  h('span', { className: 'text-base' }, showDebug ? '' : ''),
                ),
                showDebug && h('div', { className: 'mt-2 space-y-3' },
                  // Tracking points
                  tracking && tracking.length > 0 && h('div', null,
                    h('div', { className: 'text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1' },
                      `Pontos de tracking (${tracking.length})`),
                    h('div', { className: 'bg-gray-50 rounded-lg p-2 max-h-40 overflow-y-auto space-y-0.5' },
                      tracking.map((t, i) => h('div', { key: i, className: 'text-[11px] flex justify-between font-mono text-gray-600' },
                        h('span', null, `${parseFloat(t.latitude).toFixed(5)}, ${parseFloat(t.longitude).toFixed(5)}`),
                        h('span', { className: 'text-gray-400' }, `${t.status_uber || '—'} · ${fmtDT(t.created_at)}`)
                      ))
                    )
                  ),
                  // Webhooks recebidos
                  webhooks && webhooks.length > 0 && h('div', null,
                    h('div', { className: 'text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1' },
                      `Webhooks recebidos (${webhooks.length})`),
                    h('div', { className: 'bg-gray-50 rounded-lg p-2 max-h-40 overflow-y-auto space-y-0.5' },
                      webhooks.map((w, i) => h('div', { key: i, className: 'text-[11px] flex justify-between text-gray-600' },
                        h('span', { className: 'font-semibold' }, w.tipo),
                        h('span', { className: 'text-gray-400' },
                          `${w.processado ? h("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, h("use", { href: "#i-check" })) : h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-x" }))} ${fmtDT(w.created_at)}`,
                          w.erro && h('span', { className: 'text-red-600 ml-2' }, w.erro)
                        )
                      ))
                    )
                  ),
                ),
              )
            )
      )
    );
  }

  // ════════════════════════════════════════════════════════
  // ABA 4: CONFIG - configuração da integração
  // ════════════════════════════════════════════════════════
  // ════════════════════════════════════════════════════════
  // ════════════════════════════════════════════════════════
  // CardGuardrailGlobal — precificação por distância (tabela global configurável).
  // Piso de margem aplicado pelo despacho automático quando a OS
  // não casa com uma regra de cliente que defina margem própria.
  // global = default: a regra do cliente, quando configurada,
  // sobrescreve este padrão.
  // ════════════════════════════════════════════════════════
  // ──────────────────────────────────────────────────────────────────────
  // Liga/desliga o despacho automatico (PollingWorker) pela tela.
  // Estado em logistics_worker_state via /logistics/worker-state.
  // ──────────────────────────────────────────────────────────────────────
  function CardWorkerControl({ API_URL, fetchAuth, showToast }) {
    const [estado, setEstado] = useState(null);
    const [salvando, setSalvando] = useState(false);
    const apiRef = useRef(API_URL);
    const fetchRef = useRef(fetchAuth);
    const toastRef = useRef(showToast);
    useEffect(() => { apiRef.current = API_URL; fetchRef.current = fetchAuth; toastRef.current = showToast; });

    const carregar = useCallback(async () => {
      try {
        const res = await fetchRef.current(`${apiRef.current}/logistics/worker-state`);
        const json = await res.json();
        if (json && json.success) setEstado(json.estado);
      } catch (e) { /* silencioso */ }
    }, []);

    useEffect(() => {
      carregar();
      const t = setInterval(carregar, 20000);
      return () => clearInterval(t);
    }, [carregar]);

    async function setLigado(ligar) {
      setSalvando(true);
      try {
        const res = await fetchRef.current(`${apiRef.current}/logistics/worker-state`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ativo: ligar, auto_despacho: ligar }),
        });
        const json = await res.json();
        if (res.ok && json.success) {
          setEstado(json.estado);
          toastRef.current(ligar ? 'Despacho automatico LIGADO' : 'Despacho automatico desligado', ligar ? 'success' : 'info');
        } else {
          toastRef.current((json && json.error) || 'Erro ao alterar o worker', 'error');
        }
      } catch (e) { toastRef.current('Erro de rede', 'error'); }
      finally { setSalvando(false); }
    }

    const ligado = !!(estado && estado.ativo && estado.auto_despacho);
    const ultimoCiclo = (estado && estado.ultimo_ciclo_em)
      ? new Date(estado.ultimo_ciclo_em).toLocaleString('pt-BR')
      : '\u2014';

    // HUB_ABAS_V1: card branco no padrão; estado em pílula, switch roxo
    return h('section', { 'aria-label': 'Despacho automático', className: HX.card + ' p-4 md:p-5' },
      h('div', { className: 'flex items-start justify-between gap-4' },
        h('div', { className: 'min-w-0' },
          h('div', { className: 'flex items-center gap-2 flex-wrap' },
            h('h2', { className: 'text-[15px] font-semibold text-gray-900' }, 'Despacho automático'),
            h(HxPilula, { tom: ligado ? 'verde' : 'cinza' }, ligado ? 'Ligado' : 'Desligado')
          ),
          h('p', { className: 'text-[13px] text-gray-500 mt-1' },
            ligado
              ? 'O worker está varrendo a Mapp e despachando as OS que casam com as regras ativas.'
              : 'O worker está parado \u2014 nenhuma OS é despachada automaticamente.'),
          h('p', { className: 'text-xs text-gray-500 mt-1', style: { fontVariantNumeric: 'tabular-nums' } }, `Último ciclo: ${ultimoCiclo}`)
        ),
        h(HxSwitch, { on: ligado, onClick: () => setLigado(!ligado), disabled: salvando || !estado, label: 'Despacho automático' })
      ),
      ligado
        ? h('p', { className: 'text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded-[10px] px-3 py-2 mt-3 inline-flex items-center gap-1.5' },
            hxIco('alert', 14, { color: '#d97706' }),
            'Ligado: cada OS que casar com uma regra é despachada de verdade na 99/Uber (gera custo).')
        : null
    );
  }

  function CardGuardrailGlobal({ API_URL, fetchAuth, showToast }) {
    const { useState, useEffect, useCallback } = React;
    const [cfg, setCfg]         = useState(null);
    const [salvando, setSalvando] = useState(false);
    const [simKm, setSimKm]     = useState(8);

    const carregar = useCallback(async () => {
      try {
        const res  = await fetchAuth(`${API_URL}/logistics/config-global`);
        const json = await res.json();
        if (json && json.success && json.config) {
          setCfg({
            tabela_preco_ativa:       !!json.config.tabela_preco_ativa,
            alterar_valor_mapp_ativo: json.config.alterar_valor_mapp_ativo !== false,
            preco_valor_fixo:         json.config.preco_valor_fixo != null ? String(json.config.preco_valor_fixo) : '',
            preco_km_base:            json.config.preco_km_base != null ? String(json.config.preco_km_base) : '',
            preco_valor_km_adicional: json.config.preco_valor_km_adicional != null ? String(json.config.preco_valor_km_adicional) : '',
          });
        } else {
          setCfg({ tabela_preco_ativa: false, preco_valor_fixo: '', preco_km_base: '', preco_valor_km_adicional: '' });
        }
      } catch {
        showToast('Erro ao carregar configuração de preço', 'error');
        setCfg({ tabela_preco_ativa: false, preco_valor_fixo: '', preco_km_base: '', preco_valor_km_adicional: '' });
      }
    }, [fetchAuth, API_URL]);

    useEffect(() => { carregar(); }, [carregar]);

    function up(k, v) { setCfg(prev => ({ ...prev, [k]: v })); }

    async function salvar() {
      setSalvando(true);
      try {
        const res = await fetchAuth(`${API_URL}/logistics/config-global`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tabela_preco_ativa:       cfg.tabela_preco_ativa,
            preco_valor_fixo:         cfg.preco_valor_fixo         === '' ? null : Number(cfg.preco_valor_fixo),
            preco_km_base:            cfg.preco_km_base             === '' ? null : Number(cfg.preco_km_base),
            preco_valor_km_adicional: cfg.preco_valor_km_adicional  === '' ? null : Number(cfg.preco_valor_km_adicional),
          }),
        });
        const json = await res.json();
        if (res.ok && json.success) {
          showToast('Tabela de preço salva', 'success');
          carregar();
        } else {
          showToast((json && json.error) || 'Erro ao salvar', 'error');
        }
      } catch { showToast('Erro de rede ao salvar', 'error'); }
      finally  { setSalvando(false); }
    }

    if (!cfg) {
      return h('div', { className: 'bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-center' },
        h('div', { className: 'animate-spin w-5 h-5 border-2 border-purple-700 border-t-transparent rounded-full' })
      );
    }

    // Cálculo do simulador — reativo aos campos da configuração
    const vf  = parseFloat(cfg.preco_valor_fixo)         || 0;
    const kb  = parseFloat(cfg.preco_km_base)             || 0;
    const vkm = parseFloat(cfg.preco_valor_km_adicional)  || 0;
    const excedente    = Math.max(0, simKm - kb);
    const totalSim     = Math.round((vf + excedente * vkm) * 100) / 100;
    const tabelaOk     = vf > 0 && kb > 0 && vkm > 0;
    const ativa        = cfg.tabela_preco_ativa;

    return h('div', { className: 'bg-white rounded-xl border border-gray-200 overflow-hidden' },

      // ── Header ──
      h('div', { className: 'flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100' },
        h('div', null,
          h('div', { className: 'flex items-center gap-2' },
            h('span', { className: 'text-base' }, h("svg", { className: "ico", style: { width: 18, height: 18 }, "aria-hidden": "true" }, h("use", { href: "#i-ruler" }))),
            h('span', { className: 'font-semibold text-gray-800 text-sm' }, 'Precificação por distância'),
            ativa
              ? h('span', { className: 'text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700' }, 'ATIVA')
              : h('span', { className: 'text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500' }, 'DESATIVADA'),
          ),
          h('p', { className: 'text-xs text-gray-500 mt-1' },
            'Valor fixo até a distância base + R$/km excedente. Sobrescrito por cliente nas Regras abaixo.')
        ),
        h('button', {
          onClick: () => up('tabela_preco_ativa', !ativa),
          className: `relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${ativa ? 'bg-purple-600' : 'bg-gray-300'}`,
        }, h('span', { className: `absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${ativa ? 'right-0.5' : 'left-0.5'}` }))
      ),

      h('div', { className: 'p-5 space-y-5' },

        // ── Campos de configuração ──
        h('div', { className: 'grid grid-cols-3 gap-4' },
          h('div', null,
            h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1 uppercase' }, 'Valor fixo (R$)'),
            h('input', {
              type: 'number', step: '0.50', min: '0',
              value: cfg.preco_valor_fixo,
              onChange: e => up('preco_valor_fixo', e.target.value),
              placeholder: 'ex: 11,90',
              className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500',
            }),
            h('p', { className: 'text-[11px] text-gray-400 mt-1' }, 'cobrado até a distância base'),
          ),
          h('div', null,
            h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1 uppercase' }, 'Distância base (km)'),
            h('input', {
              type: 'number', step: '0.5', min: '1',
              value: cfg.preco_km_base,
              onChange: e => up('preco_km_base', e.target.value),
              placeholder: 'ex: 2',
              className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500',
            }),
            h('p', { className: 'text-[11px] text-gray-400 mt-1' }, 'km incluídos no valor fixo'),
          ),
          h('div', null,
            h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1 uppercase' }, 'Por km adicional (R$)'),
            h('input', {
              type: 'number', step: '0.10', min: '0',
              value: cfg.preco_valor_km_adicional,
              onChange: e => up('preco_valor_km_adicional', e.target.value),
              placeholder: 'ex: 1,90',
              className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500',
            }),
            h('p', { className: 'text-[11px] text-gray-400 mt-1' }, 'a partir do km excedente'),
          ),
        ),

        // ── Simulador interativo ──
        tabelaOk && h('div', { className: 'bg-gray-50 rounded-xl border border-gray-200 p-4' },
          h('div', { className: 'flex items-center gap-2 mb-3' },
            h('span', { className: 'text-xs font-semibold text-gray-600 uppercase' }, h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-hash" })), "Simulador")),
          ),
          // Slider de distância
          h('div', { className: 'flex items-center gap-3 mb-4' },
            h('span', { className: 'text-xs text-gray-500 whitespace-nowrap' }, 'Distância:'),
            h('input', {
              type: 'range', min: '1', max: '60', step: '1',
              value: simKm,
              onChange: e => setSimKm(parseInt(e.target.value, 10)),
              style: { flex: 1 },
            }),
            h('span', { className: 'text-sm font-semibold text-gray-800 min-w-[52px] text-right' }, `${simKm} km`),
          ),
          // Resultado
          h('div', { className: 'bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-1.5' },
            h('div', { className: 'flex justify-between items-center' },
              h('span', { className: 'text-xs text-purple-700' }, `Valor fixo (até ${kb} km)`),
              h('span', { className: 'text-xs font-semibold text-purple-800' },
                `R$ ${vf.toFixed(2).replace('.', ',')}`)
            ),
            excedente > 0 && h('div', { className: 'flex justify-between items-center' },
              h('span', { className: 'text-xs text-purple-700' },
                `+ ${excedente} km adicionais × R$ ${vkm.toFixed(2).replace('.', ',')}`),
              h('span', { className: 'text-xs font-semibold text-purple-800' },
                `R$ ${(excedente * vkm).toFixed(2).replace('.', ',')}`)
            ),
            h('div', { className: 'flex justify-between items-center pt-1.5 border-t border-purple-200 mt-1' },
              h('span', { className: 'text-xs font-semibold text-purple-900' }, 'Total cobrado do cliente'),
              h('span', { className: 'text-base font-bold text-purple-900' },
                `R$ ${totalSim.toFixed(2).replace('.', ',')}`)
            ),
          ),
        ),

        // ── Botão salvar ──
        h('div', { className: 'flex justify-end pt-1' },
          h('button', {
            onClick: salvar, disabled: salvando,
            className: 'px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-50',
          }, salvando ? 'Salvando...' : 'Salvar tabela de preço'),
        ),
      ),
    );
  }


  function TabRegras({ API_URL, fetchAuth, showToast }) {
    const [regras, setRegras] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editando, setEditando] = useState(null); // null | 'novo' | {id, ...}
    const [abaRegra, setAbaRegra] = useState('ident'); // REGRAS_ABAS_V1
    useEffect(function () { if (editando) setAbaRegra('ident'); }, [editando && editando.id]);

    const carregar = useCallback(async () => {
      setLoading(true);
      try {
        const res = await fetchAuth(`${API_URL}/logistics/dispatch-rules`);
        const json = await res.json();
        setRegras(json.regras || []);
      } catch { showToast('Erro ao carregar regras', 'error'); }
      finally { setLoading(false); }
    }, [fetchAuth, API_URL]);

    useEffect(() => { carregar(); }, []);

    function novoForm() {
      setEditando({
        cliente_nome: '',
        trecho_endereco: '',
        cliente_identificador: '',
        usar_uber: true,
        providers_preferidos: ['uber'], // PROV_A_NOVOFORM_V1
        estrategia: 'provider_unico',
        vehicle_type_preferido: '',
        regioes_permitidas_csv: '',
        horario_inicio: '',
        horario_fim: '',
        valor_minimo: '',
        valor_maximo: '',
        preco_valor_fixo: '',
        preco_km_base: '',
        cod_cliente_tutts: '', // COD_CLIENTE_TUTTS_NOVOFORM_V1
        preco_valor_km_adicional: '',
        preco_faixas_km: [], // FAIXAS_NOVOFORM_V1
        ativo: true,
        alterar_valor_mapp_ativo: true,
        restaurar_valor_cancel_ativo: true,
        mapp_carencia_ativa: false, /* MAPP_CARENCIA_UI_V1 */
        mapp_carencia_minutos: 10, /* MAPP_CARENCIA_UI_V1 */
        forcar_geocode_google: false, /* REGRA_GEOCODE_GOOGLE_FRONT_V1 */
        apenas_moto_propria: false, /* APENAS_MOTO_PROPRIA_UI_V1 */
        nome_remetente: '',
        package_type: '',
        package_weight: '',
        aviso_entregador: '',
        // PORTAL_CLIENTE_NOVOFORM: acesso da loja
        portal_login: '',
        portal_ativo: false,
        portal_tem_senha: false,
        portal_senha: '',
      });
    }

    function editarRegra(r) {
      setEditando({
        ...r,
        // usar_uber nao e coluna real — deriva de providers_preferidos pro checkbox
        // refletir certo e NAO zerar os providers ao salvar.
        usar_uber: (r.providers_preferidos || []).includes('uber'),
        providers_preferidos: (r.providers_preferidos && r.providers_preferidos.length) ? r.providers_preferidos : ['uber'], // PROV_B_EDITAR_V1
        estrategia: r.estrategia || 'provider_unico',
        vehicle_type_preferido: r.vehicle_type_preferido || '',
        mapp_carencia_ativa: r.mapp_carencia_ativa === true, /* MAPP_CARENCIA_UI_V1 */
        mapp_carencia_minutos: (r.mapp_carencia_minutos != null ? r.mapp_carencia_minutos : 10), /* MAPP_CARENCIA_UI_V1 */
        // Compat: regras antigas só tinham cliente_nome (que era o trecho).
        // Se trecho_endereco estiver vazio, preenche com cliente_nome pra não perder o match.
        trecho_endereco: r.trecho_endereco || r.cliente_nome || '',
        regioes_permitidas_csv: (r.regioes_permitidas || []).join(', '),
        horario_inicio: r.horario_inicio || '',
        horario_fim: r.horario_fim || '',
        valor_minimo: r.valor_minimo || '',
        valor_maximo: r.valor_maximo || '',
        preco_valor_fixo: r.preco_valor_fixo ?? '',
        preco_km_base: r.preco_km_base ?? '',
        cod_cliente_tutts: r.cod_cliente_tutts ?? '', // COD_CLIENTE_TUTTS_EDITAR_V1
        preco_valor_km_adicional: r.preco_valor_km_adicional ?? '',
        preco_faixas_km: (Array.isArray(r.preco_faixas_km) ? r.preco_faixas_km : []).map(function (f) { return { inicio_km: f.inicio_km == null ? '' : String(f.inicio_km), valor_km: f.valor_km == null ? '' : String(f.valor_km) }; }), // FAIXAS_EDITAR_V2
        nome_remetente: r.nome_remetente || '',
        package_type: r.package_type || '',
        package_weight: r.package_weight || '',
        aviso_entregador: r.aviso_entregador || '',
        // PORTAL_CLIENTE_EDITFORM: acesso da loja (1 login por regra)
        portal_login: r.portal_login || '',
        portal_ativo: !!r.portal_ativo,
        portal_tem_senha: !!r.portal_tem_senha,
        portal_senha: '',
        apenas_moto_propria: r.apenas_moto_propria === true, /* APENAS_MOTO_PROPRIA_UI_V1 */
      });
    }

    async function salvar() {
      if (!editando?.cliente_nome?.trim()) {
        showToast('Nome do cliente é obrigatório', 'error');
        return;
      }
      if (!editando?.trecho_endereco?.trim() || editando.trecho_endereco.trim().length < 5) {
        showToast('Trecho do endereço deve ter no mínimo 5 caracteres', 'error');
        return;
      }
      const payload = {
        cliente_nome: editando.cliente_nome.trim(),
        trecho_endereco: editando.trecho_endereco.trim(),
        // IDENT_ALT_SALVAR_V1: o campo existia no form e no banco, mas NUNCA
        // era enviado no payload. O backend recebia undefined, caia no
        // COALESCE($3, cliente_identificador) e mantinha o valor antigo (vazio).
        // Resultado: "Regra atualizada" no toast e nada gravado — por isso o
        // match alternativo nunca casava. String vazia limpa o campo.
        cliente_identificador: (editando.cliente_identificador || '').trim(),
        usar_uber: !!editando.usar_uber,
        providers_preferidos: (editando.providers_preferidos && editando.providers_preferidos.length) ? editando.providers_preferidos : (editando.usar_uber ? ['uber'] : []), // PROV_C_SALVAR_V1
        estrategia: editando.estrategia || 'provider_unico',
        vehicle_type_preferido: editando.vehicle_type_preferido || null,
        usar_uber: !!editando.usar_uber,
        regioes_permitidas: editando.regioes_permitidas_csv,
        horario_inicio: editando.horario_inicio || null,
        horario_fim: editando.horario_fim || null,
        valor_minimo: editando.valor_minimo === '' ? null : parseFloat(editando.valor_minimo),
        valor_maximo: editando.valor_maximo === '' ? null : parseFloat(editando.valor_maximo),
        preco_valor_fixo: editando.preco_valor_fixo === '' ? null : parseFloat(editando.preco_valor_fixo || ''),
        preco_km_base: editando.preco_km_base === '' ? null : parseFloat(editando.preco_km_base || ''),
        cod_cliente_tutts: (editando.cod_cliente_tutts && String(editando.cod_cliente_tutts).trim()) || null, // COD_CLIENTE_TUTTS_SALVAR_V1
        preco_valor_km_adicional: editando.preco_valor_km_adicional === '' ? null : parseFloat(editando.preco_valor_km_adicional || ''),
        preco_faixas_km: (Array.isArray(editando.preco_faixas_km) ? editando.preco_faixas_km : []).map(function (f) { return { inicio_km: (f.inicio_km === '' || f.inicio_km == null) ? null : parseInt(String(f.inicio_km).replace(',', '.'), 10), valor_km: (f.valor_km === '' || f.valor_km == null) ? null : parseFloat(String(f.valor_km).replace(',', '.')) }; }).filter(function (f) { return f.inicio_km != null && f.valor_km != null && f.valor_km >= 0; }), // FAIXAS_SALVAR_V2
        // [preco-retorno-v1] adicional fixo cobrado quando a corrida vira devolução
        preco_retorno_valor: editando.preco_retorno_modo === 'pct' ? null
          : (editando.preco_retorno_valor === '' || editando.preco_retorno_valor == null
              ? null : parseFloat(editando.preco_retorno_valor)),
        // [retorno-percentual-v1] radio: manda UM ou OUTRO, nunca os dois
        preco_retorno_percentual: editando.preco_retorno_modo === 'pct'
          ? (editando.preco_retorno_percentual === '' || editando.preco_retorno_percentual == null
              ? null : parseFloat(editando.preco_retorno_percentual))
          : null,
        ativo: !!editando.ativo,
        alterar_valor_mapp_ativo: editando.alterar_valor_mapp_ativo !== false,
        restaurar_valor_cancel_ativo: editando.restaurar_valor_cancel_ativo !== false,
        mapp_carencia_ativa: editando.mapp_carencia_ativa === true, /* MAPP_CARENCIA_UI_V1 */
        mapp_carencia_minutos: (function () { var n = parseInt(editando.mapp_carencia_minutos, 10); return (isFinite(n) && n > 0) ? n : 10; })(), /* MAPP_CARENCIA_UI_V1 */
        forcar_geocode_google: editando.forcar_geocode_google === true, /* REGRA_GEOCODE_GOOGLE_FRONT_V1 */
        nome_remetente: (editando.nome_remetente || '').trim(),
        package_type: editando.package_type || '',
        package_weight: editando.package_weight || '',
        aviso_entregador: (editando.aviso_entregador || '').trim(),
        // PORTAL_CLIENTE_PAYLOAD: acesso da loja
        portal_login: (editando.portal_login || '').trim(),
        portal_ativo: !!editando.portal_ativo,
        apenas_moto_propria: editando.apenas_moto_propria === true, /* APENAS_MOTO_PROPRIA_UI_V1 */
      };
      // senha so vai se digitada (vazio = mantem a atual no backend)
      if ((editando.portal_senha || '').length > 0) payload.portal_senha = editando.portal_senha;
      const metodo = editando.id ? 'PUT' : 'POST';
      const url = editando.id ? `${API_URL}/logistics/dispatch-rules/${editando.id}` : `${API_URL}/logistics/dispatch-rules`;
      try {
        const res = await fetchAuth(url, {
          method: metodo,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          showToast(editando.id ? 'Regra atualizada' : 'Regra criada', 'success');
          setEditando(null);
          carregar();
        } else {
          const j = await res.json().catch(() => ({}));
          showToast(j.error || 'Erro ao salvar', 'error');
        }
      } catch { showToast('Erro de rede', 'error'); }
    }

    async function toggleAtivo(r) {
      try {
        const res = await fetchAuth(`${API_URL}/logistics/dispatch-rules/${r.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ativo: !r.ativo }),
        });
        if (res.ok) { showToast(r.ativo ? 'Regra desativada' : 'Regra ativada', 'success'); carregar(); }
      } catch { showToast('Erro', 'error'); }
    }

    async function excluir(r) {
      if (!confirm(`Excluir a regra do cliente "${r.cliente_nome}"?`)) return;
      try {
        const res = await fetchAuth(`${API_URL}/logistics/dispatch-rules/${r.id}`, { method: 'DELETE' });
        if (res.ok) { showToast('Regra excluída', 'success'); carregar(); }
      } catch { showToast('Erro ao excluir', 'error'); }
    }

    if (loading) return h(HxSpinner); // HUB_ABAS_V1

    const up = (k, v) => setEditando(e => ({ ...e, [k]: v }));

    // HUB_ABAS_V1: Regras no padrão clean — cabeçalho, card do worker, lista de regras em cards brancos
    const nAtivas = regras.filter(r => r.ativo).length;
    return h('div', { className: 'max-w-7xl mx-auto px-4 py-5 md:px-6 md:py-6 space-y-4' },
      h(HxCabecalho, {
        titulo: 'Regras de despacho',
        sub: 'O worker só despacha OS cujo endereço de coleta casa com algum trecho cadastrado aqui. A Mapp não retorna nome do cliente — o match é por trecho do endereço. Sem regra ativa = sem despacho automático.',
        acoes: [h('button', { key: 'n', type: 'button', onClick: novoForm, className: HX.btnPri }, hxIco('plus'), 'Nova regra')],
      }),

      // Liga/desliga o despacho automático
      h(CardWorkerControl, { API_URL, fetchAuth, showToast }),

      // Lista de regras
      // REGRAS_CARDS_V1: lista de regras em cards (era tabela inline)
      h('div', { className: 'flex items-baseline justify-between gap-3 pt-1' },
        h('h2', { className: 'text-[15px] font-semibold text-gray-900' }, 'Regras por endereço de coleta'),
        h('span', { className: 'text-xs text-gray-500', style: { fontVariantNumeric: 'tabular-nums' } }, `${regras.length} regra${regras.length !== 1 ? 's' : ''} · ${nAtivas} ativa${nAtivas !== 1 ? 's' : ''}`)),
      regras.length === 0
        ? h('div', { className: HX.card },
            h(HxVazio, { titulo: 'Nenhuma regra cadastrada', texto: 'Enquanto não houver regras, o worker não despacha nada automaticamente.',
              acao: h('button', { type: 'button', onClick: novoForm, className: HX.btnPri }, hxIco('plus'), 'Nova regra') }))
        : h('div', { className: 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5' },
            regras.map(function (r) {
              var fmt = function (v) { var n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? v : n.toFixed(2).replace('.', ','); };
              var temFaixas = Array.isArray(r.preco_faixas_km) && r.preco_faixas_km.length > 0;
              var temRetorno = (r.preco_retorno_valor != null && r.preco_retorno_valor !== '') || (r.preco_retorno_percentual != null && r.preco_retorno_percentual !== '');
              var provs = (r.providers_preferidos && r.providers_preferidos.length > 0) ? r.providers_preferidos : ['todos'];
              var provNome = function (p) { return (p === '99' || p === 'noventanove') ? '99' : (p === 'uber' ? 'Uber' : (p === 'tutts' ? 'Tutts' : p)); };
              var linha = function (rot, val) { return h('div', { className: 'flex gap-3 text-[12.5px] items-baseline' }, h('span', { className: 'text-gray-500 w-16 flex-shrink-0' }, rot), h('span', { className: 'text-gray-800 min-w-0 truncate' }, val)); };
              return h('article', { key: r.id, className: HX.card + ' overflow-hidden flex flex-col' },
                h('div', { className: 'px-4 pt-4 pb-2 flex items-start gap-2' },
                  h('h3', { className: 'font-semibold text-[15px] leading-snug flex-1 min-w-0 ' + (r.ativo ? 'text-gray-900' : 'text-gray-500') }, r.cliente_nome),
                  h('button', { type: 'button', onClick: function () { toggleAtivo(r); }, title: r.ativo ? 'Clique para desativar' : 'Clique para ativar', 'aria-label': (r.ativo ? 'Desativar' : 'Ativar') + ' a regra ' + r.cliente_nome, className: 'flex-shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-300' },
                    h(HxPilula, { tom: r.ativo ? 'verde' : 'cinza' }, r.ativo ? 'Ativa' : 'Inativa'))
                ),
                h('div', { className: 'px-4 pb-4 flex flex-col gap-2 flex-1' },
                  h('div', { className: 'flex gap-2 text-[12.5px] text-gray-700 items-start' },
                    hxIco('pin', 15, { color: '#9ca3af', marginTop: 1, flexShrink: 0 }),
                    h('span', { className: 'leading-snug' }, r.trecho_endereco || r.cliente_nome)),
                  r.cliente_identificador && h('div', { className: 'text-[11.5px] text-gray-500 pl-6 -mt-1' }, 'Alternativo: ' + r.cliente_identificador),
                  linha('Região', (r.regioes_permitidas && r.regioes_permitidas.length > 0)
                    ? r.regioes_permitidas.join(', ')
                    : h(HxPilula, { tom: 'ambar' }, 'Qualquer região')),
                  linha('Horário', (r.horario_inicio && r.horario_fim) ? (r.horario_inicio + ' – ' + r.horario_fim) : 'Sempre'),
                  (r.preco_valor_fixo != null && r.preco_valor_fixo !== '') && h('div', { className: 'rounded-[10px] bg-gray-50 px-3 py-2 mt-0.5' },
                    h('div', { className: 'flex justify-between items-baseline gap-2' },
                      h('span', { className: 'font-semibold text-gray-900 text-[15px]', style: { fontVariantNumeric: 'tabular-nums' } }, 'R$ ' + fmt(r.preco_valor_fixo)),
                      h('span', { className: 'text-[11.5px] text-gray-500' }, 'fixo até ' + (r.preco_km_base || 0) + ' km')),
                    h('div', { className: 'text-[11.5px] text-gray-500' }, temFaixas ? 'Faixas por km' : ('+ R$ ' + fmt(r.preco_valor_km_adicional) + ' por km excedente'))),
                  h('div', { className: 'flex gap-1.5 flex-wrap mt-0.5' },
                    temFaixas && h(HxPilula, { tom: 'roxo', semPonto: true }, 'Faixas'),
                    temRetorno && h(HxPilula, { tom: 'azul', semPonto: true }, 'Retorno'),
                    provs.map(function (p) { return h('span', { key: p, className: 'text-[11.5px] font-semibold px-2 py-0.5 rounded-full border border-gray-200 text-gray-700' }, provNome(p)); }))
                ),
                h('div', { className: 'border-t border-gray-100 flex' },
                  h('button', { type: 'button', onClick: function () { editarRegra(r); }, className: 'flex-1 h-10 text-[13px] font-semibold text-purple-800 hover:bg-gray-50 inline-flex items-center justify-center gap-1.5' }, hxIco('pencil', 14), 'Editar'),
                  h('button', { type: 'button', onClick: function () { excluir(r); }, className: 'flex-1 h-10 text-[13px] font-semibold text-red-800 hover:bg-red-50 border-l border-gray-100 inline-flex items-center justify-center gap-1.5' }, hxIco('trash', 14), 'Excluir'))
              );
            })
          ),

      // Modal de edição — HUB_ABAS_V1: cabeçalho branco, abas internas no padrão, campos em grupos
      editando && h('div', {
        className: 'fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3 md:p-4',
        onClick: e => { if (e.target === e.currentTarget) setEditando(null); },
      },
        h('div', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'regra-modal-titulo', className: 'bg-white rounded-[14px] border border-gray-200 w-full max-w-3xl max-h-[92vh] overflow-y-auto' },
          h('div', { className: 'sticky top-0 bg-white z-10' },
            h('div', { className: 'px-5 pt-4 pb-3 flex items-start justify-between gap-3' },
              h('div', { className: 'min-w-0' },
                h('h3', { id: 'regra-modal-titulo', className: 'text-base font-semibold text-gray-900' }, editando.id ? 'Editar regra' : 'Nova regra'),
                h('p', { className: 'text-[13px] text-gray-500 mt-0.5 truncate' }, editando.id ? (editando.cliente_nome || 'Regra de despacho') : 'Defina o cliente, a cobertura, o preço e como despachar.')),
              h('button', { type: 'button', onClick: () => setEditando(null), 'aria-label': 'Fechar', className: 'w-8 h-8 grid place-items-center rounded-lg text-gray-500 hover:bg-gray-100 flex-shrink-0' }, hxIco('x'))
            ),
            // REGRAS_ABAS_BAR_V1
            h('div', { role: 'tablist', 'aria-label': 'Seções da regra', className: 'flex gap-1 px-3 border-b border-gray-200 overflow-x-auto' },
              [['ident', 'Identificação'], ['cobertura', 'Cobertura'], ['preco', 'Preço'], ['despacho', 'Despacho']].map(function (t) {
                var on = abaRegra === t[0];
                return h('button', { key: t[0], type: 'button', role: 'tab', 'aria-selected': on, onClick: function () { setAbaRegra(t[0]); },
                  className: 'px-3 py-2.5 text-[13px] whitespace-nowrap -mb-px border-b-2 ' + (on ? 'text-purple-800 font-semibold border-purple-700' : 'text-gray-500 border-transparent hover:text-gray-800') },
                  t[1]);
              }))
          ),
          h('div', { className: 'p-5 space-y-4' },

            (abaRegra === 'ident') && h('div', null,
              h('label', { className: 'block text-xs font-semibold text-gray-700 mb-1' }, 'Nome do cliente *'),
              h('input', {
                type: 'text', value: editando.cliente_nome || '',
                onChange: e => up('cliente_nome', e.target.value),
                placeholder: 'ex: Auto Peças Pereira',
                className: 'w-full h-[38px] px-3 border border-gray-200 rounded-[10px] bg-white text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100',
              }),
              h('p', { className: 'text-[11.5px] text-gray-500 mt-1 leading-snug' },
                'Nome de exibição do cliente — usado nos cards e no dashboard de margem por cliente.')
            ),

            // [regras-modal-v4] os dois trechos de match ficam lado a lado: sao
            // irmaos (principal + alternativa), e juntos encurtam o modal.
            (abaRegra === 'ident') && h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
              h('div', null,
                h('label', { className: 'block text-xs font-semibold text-gray-700 mb-1' }, 'Trecho do endereço de coleta *'),
                h('input', {
                  type: 'text', value: editando.trecho_endereco || '',
                  onChange: e => up('trecho_endereco', e.target.value),
                  placeholder: 'ex: pernambuco, 1500',
                  className: 'w-full h-[38px] px-3 border border-gray-200 rounded-[10px] bg-white text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100',
                }),
                h('p', { className: 'text-[11.5px] text-gray-500 mt-1 leading-snug' },
                  h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16, color: "#d97706" }, "aria-hidden": "true" }, h("use", { href: "#i-alert" })), "A Mapp não retorna nome de cliente — match é feito contra o ENDEREÇO de coleta da OS. "),
                  'Trecho ÚNICO do endereço (mín. 5 caracteres, lowercase).')
              ),
              h('div', null,
                h('label', { className: 'block text-xs font-semibold text-gray-700 mb-1' }, 'Identificador alternativo (opcional)'),
                h('input', {
                  type: 'text', value: editando.cliente_identificador || '',
                  onChange: e => up('cliente_identificador', e.target.value),
                  placeholder: 'outro trecho de endereço (alternativa)',
                  className: 'w-full h-[38px] px-3 border border-gray-200 rounded-[10px] bg-white text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100',
                }),
                h('p', { className: 'text-[11.5px] text-gray-500 mt-1 leading-snug' },
                  'Segunda opção de match — se este trecho aparecer no endereço de coleta, também casa.')
              ),
            ),

            (abaRegra === 'cobertura') && h('div', null,
              h('label', { className: 'block text-xs font-semibold text-gray-700 mb-1' }, 'Regiões permitidas (CSV)'),
              h('input', {
                type: 'text', value: editando.regioes_permitidas_csv || '',
                onChange: e => up('regioes_permitidas_csv', e.target.value),
                placeholder: 'salvador, lauro de freitas, simões filho',
                className: 'w-full h-[38px] px-3 border border-gray-200 rounded-[10px] bg-white text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100',
              }),
              h('p', { className: 'text-[11.5px] text-amber-800 mt-1.5' },
                h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16, color: "#d97706" }, "aria-hidden": "true" }, h("use", { href: "#i-alert" })), "Deixar vazio = aceita qualquer região (não recomendado). Preencher evita que OS fora da cobertura sejam travadas na Mapp."))
            ),

            (abaRegra === 'cobertura') && h('div', { className: 'grid grid-cols-2 gap-3' },
              h('div', null,
                h('label', { className: 'block text-xs font-semibold text-gray-700 mb-1' }, 'Horário início'),
                h('input', { type: 'time', value: editando.horario_inicio || '', onChange: e => up('horario_inicio', e.target.value), className: 'w-full h-[38px] px-3 border border-gray-200 rounded-[10px] bg-white text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100' })),
              h('div', null,
                h('label', { className: 'block text-xs font-semibold text-gray-700 mb-1' }, 'Horário fim'),
                h('input', { type: 'time', value: editando.horario_fim || '', onChange: e => up('horario_fim', e.target.value), className: 'w-full h-[38px] px-3 border border-gray-200 rounded-[10px] bg-white text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100' })),
            ),

            (abaRegra === 'preco') && h('div', { className: 'grid grid-cols-2 gap-3' },
              h('div', null,
                h('label', { className: 'block text-xs font-semibold text-gray-700 mb-1' }, 'Valor mínimo (R$)'),
                h('input', { type: 'number', step: '0.01', value: editando.valor_minimo || '', onChange: e => up('valor_minimo', e.target.value), placeholder: 'sem limite', className: 'w-full h-[38px] px-3 border border-gray-200 rounded-[10px] bg-white text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100' })),
              h('div', null,
                h('label', { className: 'block text-xs font-semibold text-gray-700 mb-1' }, 'Valor máximo (R$)'),
                h('input', { type: 'number', step: '0.01', value: editando.valor_maximo || '', onChange: e => up('valor_maximo', e.target.value), placeholder: 'sem limite', className: 'w-full h-[38px] px-3 border border-gray-200 rounded-[10px] bg-white text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100' })),
            ),

            // Tabela de preço por distância — override do cliente
            (abaRegra === 'preco') && h('div', { className: 'border border-gray-200 rounded-[14px] p-4' },
              h('div', { className: 'mb-3' }, // COD_CLIENTE_TUTTS_RENDER_V1
                h('label', { className: 'block text-xs font-semibold text-gray-700 mb-1' }, 'Cód. cliente na Tutts (cancelar OS da Mapp)'),
                h('input', {
                  type: 'text',
                  value: editando.cod_cliente_tutts || '',
                  onChange: (e) => setEditando(function (prev) { return Object.assign({}, prev, { cod_cliente_tutts: e.target.value }); }),
                  placeholder: 'ex: 6ea2ef73...',
                  className: 'w-full h-[38px] px-3 border border-gray-200 rounded-[10px] bg-white text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100',
                }),
                h('p', { className: 'text-[11.5px] text-gray-500 mt-1 leading-snug' }, 'Só para OS que vem direto da Mapp (sem portal). O token vem da env TUTTS_CANCEL_TOKEN.')),
              h('div', { className: 'text-[15px] font-semibold text-gray-900 mb-3' }, h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-ruler" })), "Tabela de preço por distância — override deste cliente")),
              h('div', { className: 'grid grid-cols-3 gap-3 mb-2' },
                h('div', null,
                  h('label', { className: 'block text-xs font-semibold text-gray-700 mb-1' }, 'Valor fixo (R$)'),
                  h('input', { type: 'number', step: '0.5', min: '0',
                    value: editando.preco_valor_fixo ?? '',
                    onChange: e => up('preco_valor_fixo', e.target.value),
                    placeholder: 'deixe vazio = usa global',
                    className: 'w-full h-[38px] px-3 border border-gray-200 rounded-[10px] bg-white text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100' }),
                ),
                h('div', null,
                  h('label', { className: 'block text-xs font-semibold text-gray-700 mb-1' }, 'Distância base (km)'),
                  h('input', { type: 'number', step: '0.5', min: '1',
                    value: editando.preco_km_base ?? '',
                    onChange: e => up('preco_km_base', e.target.value),
                    placeholder: 'ex: 5',
                    className: 'w-full h-[38px] px-3 border border-gray-200 rounded-[10px] bg-white text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100' }),
                ),
                h('div', null,
                  h('label', { className: 'block text-xs font-semibold text-gray-700 mb-1' }, 'Por km adicional (R$)'),
                  h('input', { type: 'number', step: '0.1', min: '0',
                    value: editando.preco_valor_km_adicional ?? '',
                    onChange: e => up('preco_valor_km_adicional', e.target.value),
                    placeholder: 'ex: 2,50',
                    className: 'w-full h-[38px] px-3 border border-gray-200 rounded-[10px] bg-white text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100' }),
                ),
              ),
              h('p', { className: 'text-[11.5px] text-gray-500' },
                'Deixe todos em branco pra usar a tabela padrão global. Se preenchido, substitui o padrão inteiramente pra este cliente.'),

              (function () { // FAIXAS_RENDER_V2
                var faixas = Array.isArray(editando.preco_faixas_km) ? editando.preco_faixas_km : [];
                var setFaixas = function (arr) { setEditando(function (prev) { return Object.assign({}, prev, { preco_faixas_km: arr }); }); };
                var upFaixa = function (i, campo, val) { var c = faixas.map(function (x) { return Object.assign({}, x); }); c[i][campo] = val; setFaixas(c); };
                var addFaixa = function () { setFaixas(faixas.concat([{ inicio_km: '', valor_km: '' }])); };
                var rmFaixa = function (i) { setFaixas(faixas.filter(function (_x, j) { return j !== i; })); };
                return h('div', { className: 'mt-4 pt-4 border-t border-gray-100' },
                  h('div', { className: 'flex items-center justify-between mb-2' },
                    h('span', { className: 'text-[13.5px] font-semibold text-gray-900' }, 'Faixas por km (opcional)'),
                    h('span', { className: 'text-[11.5px] text-gray-500' }, 'vazio = usa "por km adicional" acima')),
                  faixas.map(function (f, i) {
                    return h('div', { key: i, className: 'flex items-center gap-2 mb-2' },
                      h('span', { className: 'text-[12px] text-gray-600' }, 'a partir de'),
                      h('input', { type: 'number', step: '1', min: '0', value: f.inicio_km == null ? '' : f.inicio_km, onChange: function (e) { upFaixa(i, 'inicio_km', e.target.value); }, placeholder: 'km', className: 'w-20 text-center h-[38px] px-3 border border-gray-200 rounded-[10px] bg-white text-[13px] text-gray-900 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100' }),
                      h('span', { className: 'text-[11.5px] text-gray-500' }, 'km'),
                      h('span', { className: 'text-[12px] text-gray-600', style: { marginLeft: 'auto' } }, 'R$'),
                      h('input', { type: 'number', step: '0.1', min: '0', value: f.valor_km == null ? '' : f.valor_km, onChange: function (e) { upFaixa(i, 'valor_km', e.target.value); }, className: 'w-20 text-center h-[38px] px-3 border border-gray-200 rounded-[10px] bg-white text-[13px] text-gray-900 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100' }),
                      h('span', { className: 'text-[11.5px] text-gray-500' }, '/km'),
                      h('button', { type: 'button', onClick: function () { rmFaixa(i); }, className: 'w-8 h-8 grid place-items-center rounded-lg hover:bg-red-50', title: 'Remover faixa', 'aria-label': 'Remover faixa' }, h('svg', { className: 'ico', style: { width: 14, height: 14, color: '#991b1b' }, 'aria-hidden': 'true' }, h('use', { href: '#i-trash' }))));
                  }),
                  h('button', { type: 'button', onClick: addFaixa, className: 'mt-1 h-8 px-3 rounded-[10px] border border-gray-200 bg-white text-[13px] font-semibold text-gray-700 hover:bg-gray-50' }, h('svg', { className: 'ico', style: { width: 13, height: 13, display: 'inline', verticalAlign: '-2px', marginRight: 3 }, 'aria-hidden': 'true' }, h('use', { href: '#i-plus' })), 'Adicionar faixa'),
                  h('p', { className: 'text-[11.5px] text-gray-500 mt-1 leading-snug' }, 'Cada faixa vale do km informado em diante, até a próxima começar. Ex.: a partir de 3 = 1,50; de 7 = 1,80. Distância quebrada sobe para o km de cima.'));
              })(),

              // [preco-retorno-v1] Adicional cobrado quando a corrida vira devolução.
              // Fica separado da tabela por distância: é um valor fixo, aplicado
              // só se a entrega retornar — não entra no cálculo por km.
              // [retorno-percentual-v1] radio fixo/percentual + previa do calculo.
              // Modo derivado do estado salvo: se veio percentual, abre em '%'.
              (function () {
                var modo = editando.preco_retorno_modo
                  || (editando.preco_retorno_percentual != null && editando.preco_retorno_percentual !== '' ? 'pct' : 'fixo');
                var vf = parseFloat(editando.preco_valor_fixo) || 0;
                var pct = parseFloat(editando.preco_retorno_percentual) || 0;
                var fix = parseFloat(editando.preco_retorno_valor) || 0;
                var adic = modo === 'pct' ? Math.round(vf * (pct / 100) * 100) / 100 : fix;
                var brl = function (n) { return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
                var opt = function (val, rotulo) {
                  return h('label', { key: val, className: 'flex items-center gap-1.5 cursor-pointer text-[13px] text-gray-700' },
                    h('input', { type: 'radio', checked: modo === val,
                      onChange: function () { up('preco_retorno_modo', val); },
                      style: { accentColor: '#770fa8' } }),
                    rotulo);
                };
                return h('div', { className: 'mt-4 pt-4 border-t border-gray-100' },
                  h('label', { className: 'block text-[13.5px] font-semibold text-gray-900 mb-2' }, h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-corner' })), 'Adicional por retorno')),
                  h('div', { className: 'flex items-center gap-4 mb-2' }, opt('fixo', 'Valor fixo'), opt('pct', 'Percentual')),
                  modo === 'pct'
                    ? h('div', { className: 'flex items-center gap-2' },
                        h('input', { type: 'number', step: '1', min: '0', max: '100',
                          value: editando.preco_retorno_percentual ?? '',
                          onChange: function (e) { up('preco_retorno_percentual', e.target.value); },
                          placeholder: 'ex: 50',
                          className: 'w-28 h-[38px] px-3 border border-gray-200 rounded-[10px] bg-white text-[13px] text-gray-900 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100' }),
                        h('span', { className: 'text-[13px] text-gray-600' }, '% do valor da corrida'))
                    : h('div', { className: 'flex items-center gap-2' },
                        h('input', { type: 'number', step: '0.5', min: '0',
                          value: editando.preco_retorno_valor ?? '',
                          onChange: function (e) { up('preco_retorno_valor', e.target.value); },
                          placeholder: 'ex: 8,00',
                          className: 'w-28 h-[38px] px-3 border border-gray-200 rounded-[10px] bg-white text-[13px] text-gray-900 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100' }),
                        h('span', { className: 'text-[13px] text-gray-600' }, 'R$')),
                  adic > 0 && vf > 0
                    ? h('p', { className: 'text-[12px] text-gray-700 mt-2 bg-gray-50 border border-gray-200 rounded-[10px] px-2.5 py-1.5 inline-block' },
                        'Corrida de ' + brl(vf) + '  →  +' + brl(adic) + '  →  total ' + brl(Math.round((vf + adic) * 100) / 100))
                    : null,
                  h('p', { className: 'text-[11.5px] text-gray-500 mt-2' },
                    'Somado ao valor da corrida quando a entrega vira devolução. Em branco = não cobra retorno.')
                );
              })(),
            ),

            // PROV_D_RENDER_V1 - bloco multi-provider (substitui o checkbox Usar Uber)
            (abaRegra === 'despacho') && h('div', { className: 'space-y-4' },
              h('div', null,
                h('label', { className: 'block text-xs font-semibold text-gray-700 mb-1' }, 'Provedores do Hub'),
                h('div', { className: 'flex flex-wrap gap-2' },
                  h('label', { className: 'inline-flex items-center gap-2 text-[13px] font-medium border rounded-[10px] px-3 h-[38px] cursor-pointer ' + ((editando.providers_preferidos || ['uber']).includes('uber') ? 'border-purple-400 bg-purple-50 text-purple-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50') },
                    h('input', { type: 'checkbox', className: 'w-4 h-4 accent-purple-700', checked: (editando.providers_preferidos || ['uber']).includes('uber'),
                      onChange: e => setEditando(prev => { const cur = Array.isArray(prev.providers_preferidos) ? prev.providers_preferidos.slice() : ['uber']; const next = e.target.checked ? (cur.includes('uber') ? cur : cur.concat('uber')) : cur.filter(p => p !== 'uber'); return { ...prev, providers_preferidos: next, usar_uber: next.includes('uber') }; }) }),
                    'Uber Direct'),
                  h('label', { className: 'inline-flex items-center gap-2 text-[13px] font-medium border rounded-[10px] px-3 h-[38px] cursor-pointer ' + ((editando.providers_preferidos || []).includes('noventanove') ? 'border-purple-400 bg-purple-50 text-purple-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50') },
                    h('input', { type: 'checkbox', className: 'w-4 h-4 accent-purple-700', checked: (editando.providers_preferidos || []).includes('noventanove'),
                      onChange: e => setEditando(prev => { const cur = Array.isArray(prev.providers_preferidos) ? prev.providers_preferidos.slice() : []; const next = e.target.checked ? (cur.includes('noventanove') ? cur : cur.concat('noventanove')) : cur.filter(p => p !== 'noventanove'); return { ...prev, providers_preferidos: next }; }) }),
                    '99Entrega'),
                ),
                h('p', { className: 'text-[11.5px] text-gray-500 mt-1 leading-snug' }, 'Marque um ou mais. Sem nenhum marcado, a regra não despacha no Hub.'),
              ),
              h('div', { className: 'grid grid-cols-2 gap-3' },
                h('div', null,
                  h('label', { className: 'block text-xs font-semibold text-gray-700 mb-1' }, 'Estratégia'),
                  h('select', { value: editando.estrategia || 'provider_unico', onChange: e => up('estrategia', e.target.value), className: 'w-full h-[38px] px-3 border border-gray-200 rounded-[10px] bg-white text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100' },
                    h('option', { value: 'provider_unico' }, 'Provedor único'),
                    h('option', { value: 'melhor_preco' }, 'Melhor preço'),
                    h('option', { value: 'melhor_eta' }, 'Melhor ETA'),
                    h('option', { value: 'fallback' }, 'Fallback'),
                    h('option', { value: 'disparo_simultaneo' }, 'Disparo simultâneo (99 + Uber juntos)'), /* BUSCA_SIMULTANEA_REGRA_UI_V1 */
                  ),
                  h('p', { className: 'text-[11.5px] text-gray-500 mt-1 leading-snug' },
                    editando.estrategia === 'disparo_simultaneo'
                      ? 'Disparo simultâneo: chama TODOS os provedores preferidos ao mesmo tempo — o primeiro que aceitar leva. Precisa de 2+ provedores; com 1 (ou flag desligada) vira melhor preço.' /* BUSCA_SIMULTANEA_REGRA_UI_V1 */
                      : 'Com 1 provedor, qualquer estratégia vira provedor único.'),
                ),
                h('div', null,
                  h('label', { className: 'block text-xs font-semibold text-gray-700 mb-1' }, 'Veículo'),
                  h('select', { value: editando.vehicle_type_preferido || '', onChange: e => up('vehicle_type_preferido', e.target.value), className: 'w-full h-[38px] px-3 border border-gray-200 rounded-[10px] bg-white text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100' },
                    h('option', { value: '' }, 'Padrão do provedor'),
                    h('option', { value: 'motorcycle' }, 'Moto'),
                    h('option', { value: 'car' }, 'Carro'),
                  ),
                ),
              ),
              h('label', { className: 'inline-flex items-center text-[13px] text-gray-800 font-medium' },
                h('input', { type: 'checkbox', checked: !!editando.ativo, onChange: e => up('ativo', e.target.checked), className: 'mr-2 w-4 h-4 accent-purple-700' }),
                'Regra ativa'),
            ),

            (abaRegra === 'despacho') && h('div', { className: 'flex items-center justify-between gap-3 pt-3 border-t border-gray-100' },
              h('div', null,
                h('div', { className: 'text-[13.5px] font-semibold text-gray-900' }, 'Alterar valores na Mapp (cliente + motoboy)'),
                h('p', { className: 'text-[12px] text-gray-500 mt-0.5 leading-snug' },
                  'Ligado: o Hub envia para a Mapp o valor do cliente (preço da tabela) e o do motoboy (custo do provedor). Desligado: não altera nada na Mapp.')
              ),
              h('button', {
                type: 'button',
                onClick: () => up('alterar_valor_mapp_ativo', editando.alterar_valor_mapp_ativo === false),
                className: `relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${editando.alterar_valor_mapp_ativo !== false ? 'bg-purple-700' : 'bg-gray-300'}`,
              }, h('span', { className: `absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${editando.alterar_valor_mapp_ativo !== false ? 'right-0.5' : 'left-0.5'}` })),
            ),
            (abaRegra === 'despacho') && h('div', { className: 'flex items-center justify-between gap-3 pt-3 border-t border-gray-100' }, // RESTAURAR_CANCEL_TOGGLE_FRONT_V1
              h('div', null,
                h('div', { className: 'text-[13.5px] font-semibold text-gray-900' }, 'Devolver valores originais ao cancelar'),
                h('p', { className: 'text-[12px] text-gray-500 mt-0.5 leading-snug' },
                  'Ligado: ao cancelar a corrida, a Mapp volta aos valores originais (loja + motoboy). Desligado: mantém os valores do Hub.')
              ),
              h('button', {
                type: 'button',
                onClick: () => up('restaurar_valor_cancel_ativo', editando.restaurar_valor_cancel_ativo === false),
                className: `relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${editando.restaurar_valor_cancel_ativo !== false ? 'bg-purple-700' : 'bg-gray-300'}`,
              }, h('span', { className: `absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${editando.restaurar_valor_cancel_ativo !== false ? 'right-0.5' : 'left-0.5'}` })),
            ),
            (abaRegra === 'despacho') && h('div', { className: 'pt-3 border-t border-gray-100' }, // MAPP_CARENCIA_UI_V1
              h('div', { className: 'flex items-center justify-between gap-3' },
                h('div', null,
                  h('div', { className: 'text-[13.5px] font-semibold text-gray-900' }, 'Carência na Mapp antes do Hub'),
                  h('p', { className: 'text-[12px] text-gray-500 mt-0.5 leading-snug' },
                    'Ligado: a corrida fica um tempo na fila da Mapp (buscando entregador próprio). Só vai pro Hub se continuar sem entregador depois desse tempo. Desligado: vai pro Hub assim que elegível.')
                ),
                h('button', {
                  type: 'button',
                  onClick: () => up('mapp_carencia_ativa', editando.mapp_carencia_ativa !== true),
                  className: `relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${editando.mapp_carencia_ativa === true ? 'bg-purple-700' : 'bg-gray-300'}`,
                }, h('span', { className: `absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${editando.mapp_carencia_ativa === true ? 'right-0.5' : 'left-0.5'}` })),
              ),
              (editando.mapp_carencia_ativa === true) && h('div', { className: 'mt-3 flex items-center gap-2' },
                h('span', { className: 'text-[13px] text-gray-700' }, 'Esperar'),
                h('input', {
                  type: 'number', min: 1, max: 120,
                  value: editando.mapp_carencia_minutos == null ? '' : editando.mapp_carencia_minutos,
                  onChange: e => up('mapp_carencia_minutos', e.target.value),
                  className: 'w-20 text-center h-[38px] px-3 border border-gray-200 rounded-[10px] bg-white text-[13px] text-gray-900 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100',
                }),
                h('span', { className: 'text-[13px] text-gray-700' }, 'minuto(s) na Mapp antes de mandar pro Hub'),
              ),
            ),
            (abaRegra === 'despacho') && h('div', { className: 'flex items-center justify-between gap-3 pt-3 border-t border-gray-100' }, // REGRA_GEOCODE_TOGGLE_UI_V1
              h('div', null,
                h('div', { className: 'text-[13.5px] font-semibold text-gray-900' }, 'Forçar geocode do Google'),
                h('p', { className: 'text-[12px] text-gray-500 mt-0.5 leading-snug' },
                  'Ligado: o Hub ignora a lat/lng que a Mapp manda e geocodifica o endereço no Google pra cotar. Use quando a coord da Mapp desse cliente vier errada.')
              ),
              h('button', {
                type: 'button',
                onClick: () => up('forcar_geocode_google', editando.forcar_geocode_google !== true),
                className: `relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${editando.forcar_geocode_google === true ? 'bg-purple-700' : 'bg-gray-300'}`,
              }, h('span', { className: `absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${editando.forcar_geocode_google === true ? 'right-0.5' : 'left-0.5'}` })),
            ),

            // APENAS_MOTO_PROPRIA_UI_V1: regra so-moto-propria (nao despacha no Hub)
            (abaRegra === 'despacho') && h('div', { className: `flex items-center justify-between gap-3 pt-3 border-t ${editando.apenas_moto_propria === true ? 'bg-purple-50 -mx-3 px-3 py-3 rounded-[10px]' : ''}` },
              h('div', null,
                h('div', { className: 'text-[13.5px] font-semibold text-gray-900 inline-flex items-center gap-1.5' },
                  h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-bike' })),
                  'Apenas moto própria (não despachar no Hub)'),
                h('p', { className: 'text-[12px] text-gray-500 mt-0.5 leading-snug' },
                  'Ligado: a regra fica ativa só pra IDENTIFICAR as moto próprias deste cliente no painel — o Hub NUNCA despacha estas OS em 99/Uber. Use pra cliente que só usa motoboy próprio.')
              ),
              h('button', {
                type: 'button',
                onClick: () => up('apenas_moto_propria', editando.apenas_moto_propria !== true),
                className: `relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${editando.apenas_moto_propria === true ? 'bg-purple-700' : 'bg-gray-300'}`,
              }, h('span', { className: `absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${editando.apenas_moto_propria === true ? 'right-0.5' : 'left-0.5'}` })),
            ),

            // PORTAL_CLIENTE_ACESSO_UI: acesso da loja ao painel (1 login por regra)
            (abaRegra === 'despacho') && h('div', { className: 'pt-3 border-t border-gray-100' },
              h('div', { className: 'flex items-center justify-between gap-3 mb-2' },
                h('div', null,
                  h('span', { className: 'text-[13.5px] font-semibold text-gray-900' }, h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-lock' })), 'Acesso do cliente ao painel')),
                  h('p', { className: 'text-[12px] text-gray-500 mt-0.5 leading-snug' },
                    'A loja vê só as entregas desta regra, em tempo real. Sem chat, editar, cancelar ou valores.')),
                h('button', {
                  type: 'button',
                  onClick: () => up('portal_ativo', !editando.portal_ativo),
                  className: `relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${editando.portal_ativo ? 'bg-purple-700' : 'bg-gray-300'}`,
                }, h('span', { className: `absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${editando.portal_ativo ? 'right-0.5' : 'left-0.5'}` })),
              ),
              h('div', { className: 'grid grid-cols-2 gap-3' },
                h('div', null,
                  h('label', { className: 'block text-xs font-semibold text-gray-700 mb-1' }, 'Login da loja'),
                  h('input', {
                    type: 'text', value: editando.portal_login || '',
                    onChange: e => up('portal_login', e.target.value.toLowerCase().replace(/\s+/g, '')),
                    placeholder: 'ex: kampeao', autoComplete: 'off',
                    className: 'w-full h-[38px] px-3 border border-gray-200 rounded-[10px] bg-white text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100',
                  })),
                h('div', null,
                  h('label', { className: 'block text-xs font-semibold text-gray-700 mb-1' },
                    editando.portal_tem_senha ? 'Senha (vazio = manter)' : 'Senha'),
                  h('input', {
                    type: 'text', value: editando.portal_senha || '',
                    onChange: e => up('portal_senha', e.target.value),
                    placeholder: editando.portal_tem_senha ? 'senha definida' : 'defina uma senha',
                    autoComplete: 'new-password',
                    className: 'w-full h-[38px] px-3 border border-gray-200 rounded-[10px] bg-white text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100',
                  })),
              ),
              h('div', { className: 'mt-3 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-[10px] px-3 py-2' },
                h('span', { className: 'text-[12px] text-gray-600 flex-1 truncate inline-flex items-center gap-1.5' },
                  h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-link" })), (typeof window !== 'undefined' ? window.location.origin : ''), '/loja'),
                h('button', {
                  type: 'button',
                  onClick: () => {
                    const _u = (typeof window !== 'undefined' ? window.location.origin : '') + '/loja';
                    try { navigator.clipboard.writeText(_u); showToast('Link do painel copiado', 'success'); }
                    catch (_) { showToast('Nao foi possivel copiar', 'error'); }
                  },
                  className: 'h-8 px-3 rounded-[10px] border border-gray-200 bg-white text-[12.5px] font-semibold text-gray-700 hover:bg-gray-50 flex-shrink-0',
                }, 'Copiar link'),
              ),
            ),

            (abaRegra === 'despacho') && h('div', { className: 'pt-3 border-t border-gray-100' },
              h('div', { className: 'flex items-center gap-2 mb-1' },
                h('span', { className: 'text-[13.5px] font-semibold text-gray-900' }, h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-message' })), 'Mensagem pro entregador (99)'))),
              h('p', { className: 'text-[12px] text-gray-500 mb-3' },
                'Em branco usa a configuração global. Preenchido, sobrescreve só para este cliente.'),
              h('div', { className: 'mb-3' },
                h('label', { className: 'block text-xs font-semibold text-gray-700 mb-1' }, 'Nome do remetente'),
                h('input', {
                  type: 'text', value: editando.nome_remetente || '',
                  onChange: e => up('nome_remetente', e.target.value),
                  maxLength: 100, placeholder: 'vazio = usa o global',
                  className: 'w-full h-[38px] px-3 border border-gray-200 rounded-[10px] bg-white text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100',
                })),
              h('div', { className: 'grid grid-cols-2 gap-3 mb-3' },
                h('div', null,
                  h('label', { className: 'block text-xs font-semibold text-gray-700 mb-1' }, 'Tipo de transporte'),
                  h('select', {
                    value: editando.package_type || '',
                    onChange: e => up('package_type', e.target.value),
                    className: 'w-full h-[38px] px-3 border border-gray-200 rounded-[10px] bg-white text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100',
                  },
                    h('option', { value: '' }, 'Global (padrão)'),
                    h('option', { value: 'medication' }, 'Medicamentos'),
                    h('option', { value: 'documents' }, 'Documentos'),
                    h('option', { value: 'food' }, 'Alimentos'),
                    h('option', { value: 'groceries' }, 'Mantimentos'),
                    h('option', { value: 'electronics' }, 'Eletrônicos'),
                    h('option', { value: 'apparel' }, 'Vestuário'),
                    h('option', { value: 'others' }, 'Outros'),
                  )),
                h('div', null,
                  h('label', { className: 'block text-xs font-semibold text-gray-700 mb-1' }, 'Peso da mercadoria'),
                  h('select', {
                    value: editando.package_weight || '',
                    onChange: e => up('package_weight', e.target.value),
                    className: 'w-full h-[38px] px-3 border border-gray-200 rounded-[10px] bg-white text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100',
                  },
                    h('option', { value: '' }, 'Global (padrão)'),
                    h('option', { value: '1kg' }, 'Até 1kg'),
                    h('option', { value: '5kg' }, 'Até 5kg'),
                    h('option', { value: '10kg' }, 'Até 10kg'),
                    h('option', { value: '20kg' }, 'Até 20kg'),
                    h('option', { value: '30kg' }, 'Até 30kg'),
                  )),
              ),
              h('div', null,
                h('label', { className: 'block text-xs font-semibold text-gray-700 mb-1' },
                  `Observação sobre o transporte (${(editando.aviso_entregador || '').length}/127)`),
                h('textarea', {
                  value: editando.aviso_entregador || '',
                  onChange: e => up('aviso_entregador', e.target.value.slice(0, 127)),
                  maxLength: 127, rows: 2, placeholder: 'vazio = usa o aviso global',
                  className: 'w-full px-3 py-2 border border-gray-200 rounded-[10px] bg-white text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 resize-y',
                })),
            ),
          ),
          h('div', { className: 'px-5 py-3.5 border-t border-gray-200 flex justify-end gap-2 bg-white sticky bottom-0' },
            h('button', { type: 'button', onClick: () => setEditando(null), className: HX.btnSec }, 'Cancelar'),
            h('button', { type: 'button', onClick: salvar, className: HX.btnPri },
              editando.id ? h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-save" })), "Salvar") : h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, h("use", { href: "#i-plus" })), "Criar")),
          )
        )
      )
    );
  }


  // ════════════════════════════════════════════════════════
  // COMPONENTE RAIZ
  // Usa props.estado.logisticaTab (controlado pelo OverflowNav do app.js)
  // ════════════════════════════════════════════════════════
  // =========================================================
  // Helpers de bloqueio/frequentes
  // =========================================================
  function soDigitos(v) { return String(v || '').replace(/\D/g, ''); }

  // =========================================================
  // MODAL: Reportar ocorrencia (+ bloquear entregador)
  // =========================================================
  function ModalReportarOcorrencia({ entrega, API_URL, fetchAuth, showToast, onClose, onSucesso }) {
    const e = entrega;
    const [descricao, setDescricao] = useState('');
    const [bloquear, setBloquear] = useState(true);
    const [enviando, setEnviando] = useState(false);
    const prov = provedorInfo(e);
    const semContato = !e.entregador_telefone && !e.entregador_placa;

    async function enviar() {
      if (!descricao.trim()) { showToast && showToast('Descreva a ocorrencia', 'error'); return; }
      if (bloquear && semContato) { showToast && showToast('Sem telefone/placa: nao da pra bloquear com seguranca', 'error'); return; }
      setEnviando(true);
      try {
        const res = await fetchAuth(`${API_URL}/logistics/ocorrencias`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigo_os: e.codigo_os,
            delivery_id: e.id,
            provider_code: e.provider_code || prov.code,
            courier: { name: e.entregador_nome, phone: e.entregador_telefone, plate: e.entregador_placa },
            descricao: descricao.trim(),
            bloquear,
          }),
        });
        const json = await res.json();
        if (res.ok && json.ok) {
          showToast && showToast(bloquear ? 'Ocorrencia registrada e entregador bloqueado' : 'Ocorrencia registrada', 'success');
          onSucesso && onSucesso();
          onClose && onClose();
        } else {
          showToast && showToast(json.error || 'Erro ao reportar', 'error');
        }
      } catch (err) {
        showToast && showToast('Erro ao reportar: ' + err.message, 'error');
      } finally {
        setEnviando(false);
      }
    }

    return h('div', { className: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50', onClick: onClose },
      h('div', { className: 'bg-white rounded-xl shadow-xl w-full max-w-md', onClick: (ev) => ev.stopPropagation() },
        h('div', { className: 'flex items-center justify-between px-5 py-4 border-b border-gray-100' },
          h('span', { className: 'text-base font-bold text-gray-800 flex items-center gap-2' }, h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-alert' })), 'Reportar ocorrencia')),
          h('button', { onClick: onClose, className: 'text-gray-400 hover:text-gray-600 text-xl leading-none' }, '×'),
        ),
        h('div', { className: 'px-5 py-4 space-y-4' },
          h('div', null,
            h('div', { className: 'text-[11px] text-gray-400 mb-1' }, 'Corrida'),
            h('div', { className: 'flex items-center gap-2' },
              h('span', { className: 'text-sm font-bold text-gray-800' }, `OS ${e.codigo_os}`),
              h(ProviderLogo, { code: prov.code, size: 16 }),
            ),
          ),
          h('div', { className: 'bg-gray-50 rounded-lg p-3 flex items-center gap-3' },
            h('div', { className: 'relative flex-shrink-0' },
              e.entregador_foto
                ? h('img', {
                    src: e.entregador_foto, alt: e.entregador_nome || 'Entregador',
                    className: 'w-10 h-10 rounded-full object-cover',
                    onError: (ev) => { ev.target.style.display = 'none'; const fb = ev.target.nextSibling; if (fb) fb.style.display = 'flex'; },
                  })
                : null,
              h('div', {
                className: 'w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-sm font-bold',
                style: e.entregador_foto ? { display: 'none' } : {},
              }, iniciaisDoNome(e.entregador_nome)),
            ),
            h('div', { className: 'min-w-0' },
              h('div', { className: 'text-sm font-semibold text-gray-800 truncate' }, e.entregador_nome || 'Entregador'),
              h('div', { className: 'text-xs text-gray-500 truncate' },
                [fmtTelefoneBR(e.entregador_telefone), e.entregador_placa].filter(Boolean).join(' · ') || 'sem telefone/placa'),
            ),
          ),
          h('div', null,
            h('label', { className: 'text-xs text-gray-600 block mb-1' }, 'Descreva a ocorrencia'),
            h('textarea', {
              value: descricao,
              onChange: (ev) => setDescricao(ev.target.value),
              placeholder: 'O que aconteceu? (ex: nao compareceu na coleta, sumiu com a mercadoria, ma conduta...)',
              className: 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-y min-h-[90px] focus:border-purple-400 focus:outline-none',
            }),
          ),
          h('label', { className: 'flex items-start gap-2 cursor-pointer' },
            h('input', { type: 'checkbox', checked: bloquear, onChange: (ev) => setBloquear(ev.target.checked), className: 'w-4 h-4 mt-0.5' }),
            h('span', { className: 'text-xs text-gray-700 leading-relaxed' },
              h('span', { className: 'font-semibold' }, 'Bloquear este entregador'),
              h('span', { className: 'block text-gray-400' }, 'Se ele aceitar outra corrida nossa, o sistema cancela e reatribui automaticamente.'),
              semContato && h('span', { className: 'block text-red-500 mt-1' }, 'Sem telefone/placa nesta corrida — nao da pra bloquear.'),
            ),
          ),
        ),
        h('div', { className: 'flex justify-end gap-2 px-5 py-4 border-t border-gray-100' },
          h('button', { onClick: onClose, className: 'text-sm px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50' }, 'Cancelar'),
          h('button', {
            onClick: enviar, disabled: enviando,
            className: 'text-sm px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5',
          }, enviando ? 'Enviando...' : (bloquear ? h("span", { className: "inline-flex items-center gap-1.5" }, h("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, h("use", { href: "#i-ban" })), "Reportar e bloquear") : 'Reportar')),
        ),
      ),
    );
  }

  // =========================================================
  // ABA: Entregadores barrados (blacklist)
  // =========================================================
  function TabBarrados({ API_URL, fetchAuth, showToast }) {
    const [dados, setDados] = useState(null); // {bloqueados, metricas}
    const [loading, setLoading] = useState(true);
    const [busca, setBusca] = useState('');

    const carregar = React.useCallback(async () => {
      setLoading(true);
      try {
        const q = busca.trim() ? `?busca=${encodeURIComponent(busca.trim())}` : '';
        const res = await fetchAuth(`${API_URL}/logistics/bloqueados${q}`);
        const json = await res.json();
        if (res.ok) setDados(json);
        else showToast && showToast(json.error || 'Erro ao carregar', 'error');
      } catch (err) { showToast && showToast('Erro: ' + err.message, 'error'); }
      finally { setLoading(false); }
    }, [API_URL, fetchAuth, busca, showToast]);

    useEffect(() => { carregar(); }, []); // carga inicial

    async function desbloquear(id, nome) {
      if (!window.confirm(`Desbloquear ${nome || 'este entregador'}?`)) return;
      try {
        const res = await fetchAuth(`${API_URL}/logistics/bloqueados/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (res.ok && json.ok) { showToast && showToast('Desbloqueado', 'success'); carregar(); }
        else showToast && showToast(json.error || 'Erro ao desbloquear', 'error');
      } catch (err) { showToast && showToast('Erro: ' + err.message, 'error'); }
    }

    const m = (dados && dados.metricas) || {};
    const lista = (dados && dados.bloqueados) || [];

    // HUB_ABAS_V1: Barrados no padrão clean — KPIs em faixa única, busca em card, tabela, Desbloquear destrutivo
    return h('div', { className: 'max-w-7xl mx-auto px-4 py-5 md:px-6 md:py-6 space-y-4' },
      h(HxCabecalho, {
        titulo: 'Entregadores barrados',
        sub: 'Bloqueio do nosso lado (a 99/Uber têm os protocolos deles). Casamos por telefone e placa.',
        acoes: [h('button', { key: 'r', type: 'button', onClick: carregar, className: HX.btnIco, title: 'Atualizar', 'aria-label': 'Atualizar lista de barrados' }, hxIco('refresh'))],
      }),
      h(HxKpis, { rotulo: 'Indicadores de bloqueio', itens: [
        { l: 'Bloqueados ativos', v: String(m.bloqueados_ativos || 0) },
        { l: 'Reatribuições (7 dias)', v: String(m.reatribuicoes_7d || 0), cor: (m.reatribuicoes_7d || 0) > 0 ? '#92400e' : '#111827' },
        { l: 'Cancelamentos hoje', v: String(m.cancelamentos_hoje || 0) },
      ] }),
      h('div', { className: HX.card + ' overflow-hidden' },
        h('div', { className: 'p-3 border-b border-gray-100 flex flex-wrap items-center gap-2' },
          h('label', { className: 'flex items-center gap-2 h-[38px] px-3 border border-gray-200 rounded-[10px] text-gray-400 focus-within:border-purple-400', style: { flex: '1 1 260px', minWidth: 0, maxWidth: 420 } },
            hxIco('search'),
            h('input', {
              type: 'search', value: busca, onChange: (ev) => setBusca(ev.target.value),
              onKeyDown: (ev) => { if (ev.key === 'Enter') carregar(); },
              placeholder: 'Buscar por nome ou telefone', 'aria-label': 'Buscar entregador barrado',
              className: 'flex-1 min-w-0 border-0 outline-none bg-transparent text-[13px] text-gray-900',
            })),
          h('button', { type: 'button', onClick: carregar, className: 'h-[38px] px-3 rounded-[10px] border border-gray-200 bg-white text-[13px] font-semibold text-gray-700 hover:bg-gray-50' }, 'Buscar'),
          h('span', { className: 'ml-auto text-xs text-gray-500', style: { fontVariantNumeric: 'tabular-nums' } }, loading ? '' : `${lista.length} na lista`)),
        loading
          ? h(HxSpinner)
          : lista.length === 0
            ? h(HxVazio, { titulo: busca.trim() ? 'Nenhum entregador encontrado' : 'Nenhum entregador bloqueado', texto: busca.trim() ? 'Confira o nome ou o telefone e busque de novo.' : 'Para barrar alguém, use "Reportar ocorrência" no card da entrega.' })
            : h('div', { className: 'overflow-x-auto' },
                h('table', { className: 'w-full text-[13px] min-w-[760px]' },
                  h('thead', null, h('tr', { className: 'bg-gray-50' },
                    ['Entregador', 'Contato / placa', 'Motivo', 'Bloqueado em', ''].map((t, i) => h('th', { key: i, className: HX.th }, t)))),
                  h('tbody', null,
                    lista.map((b) => h('tr', { key: b.id, className: 'border-t border-gray-100 align-top' },
                      h('td', { className: 'px-4 py-3' },
                        h('div', { className: 'flex items-center gap-2.5 min-w-0' },
                          h(HxAvatar, { foto: b.foto, nome: b.nome, size: 32 }),
                          h('span', { className: 'font-semibold text-gray-900 truncate' }, b.nome || 'Entregador'))),
                      h('td', { className: 'px-4 py-3 text-gray-700 whitespace-nowrap' },
                        h('div', { style: { fontVariantNumeric: 'tabular-nums' } }, b.telefone_norm ? fmtTelefoneBR(b.telefone_norm) : 'sem telefone'),
                        h('div', { className: 'text-xs text-gray-500 mt-0.5' }, [b.placa_norm, b.provider_code ? provNome(b.provider_code) : null].filter(Boolean).join(' · ') || '—')),
                      h('td', { className: 'px-4 py-3 text-gray-700 max-w-[320px] break-words' }, b.motivo || '—'),
                      h('td', { className: 'px-4 py-3 text-gray-700 whitespace-nowrap' },
                        h('div', { style: { fontVariantNumeric: 'tabular-nums' } }, fmtDT(b.criado_em)),
                        h('div', { className: 'text-xs text-gray-500 mt-0.5' }, `por ${b.bloqueado_por || '—'}`)),
                      h('td', { className: 'px-4 py-3 text-right' },
                        h('button', { type: 'button', onClick: () => desbloquear(b.id, b.nome), className: HX.btnDest, 'aria-label': `Desbloquear ${b.nome || 'entregador'}` }, 'Desbloquear')),
                    )),
                  ),
                ),
              ),
      ),
    );
  }

  // =========================================================
  // ABA: Motoboys frequentes (> 3 pedidos)
  // =========================================================
  function TabFrequentes({ API_URL, fetchAuth, showToast }) {
    const [dados, setDados] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busca, setBusca] = useState('');

    const carregar = React.useCallback(async () => {
      setLoading(true);
      try {
        const q = busca.trim() ? `?busca=${encodeURIComponent(busca.trim())}` : '';
        const res = await fetchAuth(`${API_URL}/logistics/frequentes${q}`);
        const json = await res.json();
        if (res.ok) setDados(json);
        else showToast && showToast(json.error || 'Erro ao carregar', 'error');
      } catch (err) { showToast && showToast('Erro: ' + err.message, 'error'); }
      finally { setLoading(false); }
    }, [API_URL, fetchAuth, busca, showToast]);

    useEffect(() => { carregar(); }, []);

    const m = (dados && dados.metricas) || {};
    const lista = (dados && dados.frequentes) || [];

    function fmtUltimo(ts) {
      if (!ts) return '—';
      const d = new Date(ts); const hoje = new Date();
      const diff = Math.floor((hoje - d) / 86400000);
      if (diff <= 0) return 'hoje';
      if (diff === 1) return 'ontem';
      return `${diff} dias`;
    }

    // HUB_ABAS_V1: Frequentes no padrão clean — KPIs em faixa única, busca em card e tabela
    return h('div', { className: 'max-w-7xl mx-auto px-4 py-5 md:px-6 md:py-6 space-y-4' },
      h(HxCabecalho, {
        titulo: 'Motoboys frequentes',
        sub: `Entregadores com mais de 3 pedidos concluídos via Hub nos últimos ${m.dias || 30} dias · contagem por telefone, ordenada por volume.`,
        acoes: [h('button', { key: 'r', type: 'button', onClick: carregar, className: HX.btnIco, title: 'Atualizar', 'aria-label': 'Atualizar lista de frequentes' }, hxIco('refresh'))],
      }),
      h(HxKpis, { rotulo: 'Indicadores de parceiros frequentes', itens: [
        { l: 'Parceiros frequentes', v: String(m.parceiros || 0), sub: 'com mais de 3 pedidos' },
        { l: `Pedidos (${m.dias || 30} dias)`, v: String(m.pedidos_periodo || 0) },
        { l: 'Top parceiro', v: String(m.top_parceiro || 0), sub: lista[0] && lista[0].nome ? `pedidos · ${lista[0].nome}` : 'pedidos do 1º colocado' },
      ] }),
      h('div', { className: HX.card + ' overflow-hidden' },
        h('div', { className: 'p-3 border-b border-gray-100 flex flex-wrap items-center gap-2' },
          h('label', { className: 'flex items-center gap-2 h-[38px] px-3 border border-gray-200 rounded-[10px] text-gray-400 focus-within:border-purple-400', style: { flex: '1 1 260px', minWidth: 0, maxWidth: 420 } },
            hxIco('search'),
            h('input', {
              type: 'search', value: busca, onChange: (ev) => setBusca(ev.target.value),
              onKeyDown: (ev) => { if (ev.key === 'Enter') carregar(); },
              placeholder: 'Buscar por nome', 'aria-label': 'Buscar motoboy frequente',
              className: 'flex-1 min-w-0 border-0 outline-none bg-transparent text-[13px] text-gray-900',
            })),
          h('button', { type: 'button', onClick: carregar, className: 'h-[38px] px-3 rounded-[10px] border border-gray-200 bg-white text-[13px] font-semibold text-gray-700 hover:bg-gray-50' }, 'Buscar'),
          h('span', { className: 'ml-auto text-xs text-gray-500', style: { fontVariantNumeric: 'tabular-nums' } }, loading ? '' : `${lista.length} na lista`)),
        loading
          ? h(HxSpinner)
          : lista.length === 0
            ? h(HxVazio, { titulo: busca.trim() ? 'Nenhum motoboy encontrado' : 'Nenhum motoboy frequente ainda', texto: busca.trim() ? 'Confira o nome e busque de novo.' : 'Quem concluir mais de 3 pedidos pelo Hub aparece aqui.' })
            : h('div', { className: 'overflow-x-auto' },
                h('table', { className: 'w-full text-[13px] min-w-[640px]' },
                  h('thead', null, h('tr', { className: 'bg-gray-50' },
                    h('th', { className: HX.th + ' w-12' }, '#'),
                    h('th', { className: HX.th }, 'Entregador'),
                    h('th', { className: HX.th }, 'Contato / placa'),
                    h('th', { className: HX.th + ' text-right' }, 'Pedidos'),
                    h('th', { className: HX.th + ' text-right' }, 'Último'))),
                  h('tbody', null,
                    lista.map((f, i) => {
                      const top = i === 0;
                      return h('tr', { key: (f.telefone || '') + i, className: 'border-t border-gray-100' },
                        h('td', { className: 'px-4 py-3 text-gray-500 font-semibold', style: { fontVariantNumeric: 'tabular-nums' } }, String(i + 1)),
                        h('td', { className: 'px-4 py-3' },
                          h('div', { className: 'flex items-center gap-2.5 min-w-0' },
                            h(HxAvatar, { foto: f.foto, nome: f.nome, size: 32 }),
                            h('span', { className: 'font-semibold text-gray-900 truncate' }, f.nome || 'Entregador'),
                            top && h(HxPilula, { tom: 'ambar', title: 'Top parceiro' }, 'Top parceiro'))),
                        h('td', { className: 'px-4 py-3 text-gray-700 whitespace-nowrap' },
                          h('div', { style: { fontVariantNumeric: 'tabular-nums' } }, f.telefone ? fmtTelefoneBR(f.telefone) : '—'),
                          h('div', { className: 'text-xs text-gray-500 mt-0.5' }, [f.placa, f.provider ? provNome(f.provider) : null].filter(Boolean).join(' · ') || '—')),
                        h('td', { className: 'px-4 py-3 text-right font-semibold text-gray-900', style: { fontVariantNumeric: 'tabular-nums' } }, String(f.pedidos)),
                        h('td', { className: 'px-4 py-3 text-right text-gray-700 whitespace-nowrap' }, fmtUltimo(f.ultimo)),
                      );
                    }),
                  ),
                ),
              ),
      ),
    );
  }

  const ICONE_TUTTS_JPG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/7QCEUGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAGgcAigAYkZCTUQwYTAwMGFiODAxMDAwMDI2MDMwMDAwOWMwNDAwMDA2YTA1MDAwMDBlMDcwMDAwZjcwODAwMDBhYzBiMDAwMDA1MGMwMDAwZTQwYzAwMDBkNDBkMDAwMGQ0MTAwMDAwAP/bAIQABQYGCwgLCwsLCw0LCwsNDg4NDQ4ODw0ODg4NDxAQEBEREBAQEA8TEhMPEBETFBQTERMWFhYTFhUVFhkWGRYWEgEFBQUKBwoICQkICwgKCAsKCgkJCgoMCQoJCgkMDQsKCwsKCw0MCwsICwsMDAwNDQwMDQoLCg0MDQ0MExQTExOc/8IAEQgAlgCWAwEiAAIRAQMRAf/EAIMAAQABBQEBAAAAAAAAAAAAAAAHAgMEBQYBCBAAAQMBBQMIBAwGAwAAAAAAAQACAxEEBRIhMSJBURATIGFxgZGxMDJS4QYUFSNAYGJyodHw8TOCkrLB0kJDwhEBAAEDAgUDBAMBAAAAAAAAAREAITFBUWFxgZGhsdHwECDB4TBAYPH/2gAMAwEAAgADAAAAAY7HRbgAAAAAAABIkdyIR2AAAAAAAABIkdyIR2AdrRTxS/VV7jFfvtC/V55jOy46nzx0eK80xsaqtcycYSJHcie+x2DsZsiXd6zB1soQFMnnkAd3wEyZeTRvI+lXCxbUL6zYZV+fOH3fz/j2pjzNpRbo18Id7wOflJEjuRMm/HYJnxeT6rW4fPShAcmVe6GYIf29FPIT78xSncq4Hq9fp71yW4ckrhLVGy2mdepp6P5/2+oyLyRI7kTIvR2Do/eb22iysLGkX3X3I5dxYzrXHOvu1U8W73g8ujwy8+i50mJt+O2Os5PfaHe4qRI7kTb48dgA93miY1XfbeKpG4jP2XtLmMmjRdBq9jRcp5nQ9Fj7PCsOswqqS/SkSO5E9R2AAB1/IMG51eDolj3JxjZWgrAAJEjuRCOwAAAAAAAAJEjuRCO0iCO0iCO0iCO0iCO0iCO0iCO0iCO0iCO0iCO5ED//2gAIAQEAAQUC+sVhuszB0bmoROPIBVOjc1RxukdbLtMDSKKw2F1pNqsxiem2WVyfE5nRuuzRzPllZC29rYydopExzsRuOOst+ybF2WaONktvhjLMFpna1sLbwvGJ0N1Xe0NlvqJjn3tA6PoXFHWS/pNm74+cnvSTBArijpHfclZrFHzcNpk5yS7o8c96yYIFd9qZLHNdcEpt908w3oXEykV7WKWd9zClot9l+MRx3JMTDCIWTfP2mQEtnsUsAuJlZL2s0k7DZZBJNc80asItgfesoZB0LDeLrKnX+1Nnc17L+FLRfUkiN/5NcWmO/hS8Lz+MixWx1md8vtUlveZo7+T7+arVa32g9BkzZE+xJ0Tm+ihjDyLExTxMjZ0YbSWKOZsidCxyNiYviAXyeF8ntXxOMcrIXPTLEo5muNsfV3TjtjmplrY5DlcKgWFgTYWNUszY1NaDIo3lhJr6Kztws5ZLSxiktrj6b4+1G8E63PKdK531V//aAAgBAwABPwH6K5wbmVXkqmuDtFjFaVzVehKMTwK+5StpgYP1VTmjT4J+TG9abFgBNc6KCLFtHcUSMRx1ULW54TryuY8PJAqpY3VDgpGSOpXwU0ZOGmdEQ5zDXIqEPFRTs7UcZyLAetQx4Bysla7KQfzjXv4o2OubH1H63hGyvHDxXxZ/D8VJEWUrvQFdM1BCB/EaATpXU9ytJGIgAADLLoMeW6GigmL6g7t/I9rdXU70+1BuTB36BF5JxVz49JkpZWm9Gd5/5f4RNfpP/9oACAECAAE/Afor3hgqVXr5Kpjw7MLnBXDXNE06lXlnbjlDa+7ep46GOMfrEVanYWHryUmzEzP1s6cf1kmQCJrjU1w59XYrLBj2iTkfFFwL3c7Xq6vcrM1oBLDWvHdyuY8PL2jFXQ7qFWiJ+IPbnp3EKWOWSlR3DcrTC44MIrhFEQ98ZBFHHcrMJGgtwgDOleP5ImUihjDutWaLm20OpzPLaLDNBV9jfh3mzuzjP3K+r2ZDrTfhMYzgtFmLHDXD/q7/AGTPhLZTq5ze1h/81R+EdkH/AGE/yO/yFd96R23nObDqR0qXACuKumZ4KSRsYq9wYOLjQfir1vGSQudZJ5HMYPnMLaMZuyfkTX9irkjeIGule57pdvaJdQH1Rn1Z9/QtNjitApLGH9uo7DqO5X7c8Vja18bnbbqYDnuqSDrllx115LDNaRWOzl+1qIxn4jMKyfB2WYh9rkP3cWN57XZgd1VHZI42c02MBhFC3jXWvGvXmgKZcOjbbuiteDnWl2CtKOI1pXTsUdyWVmkDT96r/wC4kJkbWCjWho4AUHgPpP8A/9oACAEBAAY/AvrFjfVrKZU1d2LNpHaKL1XeB5Ms1m0jtFEGtFSVHTE9zq4qDIcnBg1d+t6eAHYWnUjkyjef5Stppb2inR2zpoz2vcquOFqYyN2Laz8h5rqY3+0Injn4ou9lvmmM9p1fD91iYcZdq/j7kWueARuzRL3YWucT+OQVBstaE9rH1c7Lf3/ghK8Vc7MdQ/NFtHOpvFKeacdfsOGvRc72W+f7KNnE18P3UY66/wBOak6xTx5HO9p3kgPYb55qNv2R+Ke7i4qMddf6c0/r2fH3cjACMTWgFu/JVw0J3tNPcsbHYmjUHUdFzvad5JpYMQDaagZ1VDrhd45IsBodR3LawtHGtUGN0CP2pKd1aIga0NFV7aCtNQU93st8z7k0Mzo6pHcuaw7fDtWzt/d1TRt4K549Kd6f9rZHf0S0txN1poQVlGe8hc43J1arajNeo5LY+bHifFfws/ve5AjUZrbjNeooNDMIBrqsQzB1C/hu8QuebsnhrktuP+k/mtmM16yB+aq/uG4dHDJr7S2T4rMeioXUW8o5Z7ulTULI9yzaFvHevWK9Y+C9YrSvfy5BbZ8PzWEblT2fP0Ge15rWnb0COK3lZNCz8FwHBVCr6JvZ59DWvZmtnZ8/TeqVk38VuCzcT9Vf/9oACAEBAQE/If8ARJ7xblG7TjrpvQEl8T1FDSMOEY9Po7gKdAl7FXArdPUU6bGD5jdrfQQMUQEE665pEiQmRs1Z95+o39GtSFdBmDWYjr9CZJ3IPSvP9er7Yqc3XsCVXENteWYRggnTgWq/uygOY1A1VEZ+h+ikRy1c1NbfP3ceg1FKyLkfegcWgIsbhNwOnesvMoKJvobULm7IZZsNlIu4qOgtyAuvu0OIgAMFNRxUTi2W5pW3ZnTSixOohcMxIWsmIbxOCLibulLLtyx9mx8HV+yqPeb5GPWm0RPy/RUu1I9cek/TlGdD7rW3I97niK4ISc7ny1xXpym3itrifkPyCuIyDrh9X0vMQCxEY2tZpw1fKJLrHspUZgCw6yWTex9u6SnQh6rR39kCRcpm1TVkBHAy8TSGEojid3OomtXc9A/MUUkHBu7rxW9LhjPQPgqyKi2DFqMT6ByInRdq5aBz9qgFyuAJJBm1poQrqFw4TkkiLtJyA7qB0Ye00rgwZuPumMRUjZMG77CX7b6g5Nwid9moF+8EeJqZkDO11k5XivDDeqE81ahyGXsg6HWpEEIWcJqoUMB4jM96hOIpQ9G55rU8GyVhNCNagaEh7Sc9EqzrbWO/6pWQ8GjAiGcz0o4uzuEdvc1DueCPEql9jDbke7f7C1FgmzDu6PinzNwse+KzOcdO+P4uVltn8UDL1o9CngMrKVZeu33Xdy3JyaI1tVntWUHGIfFLx0PdNOn2Br/lPejUXsUXaobr8RT9MlvHB3aMv0fyoquxzo6W1qOOMub9feMXLNWa1xt3e9b07WecUhuMnD634iCScazD1o9Kwo4xL5oC++gy9Ks3RfneheY3xTJWVl6/xRPm9X2ZCba57eatIhvn2FKt266/ygAFniV+x9hWC6JPrXrcW7Y/yv8A/9oADAMBAQIBAwEAABAIIIIIIIIIIIIIIIIIIIIIIwgoYUYsII2laGGpDkIRbpJ30REsJDacgwMDyIIIIEFRT1GIIIIJBGMIIIIIIIIIIIIIIIIIIIIIIIL/2gAIAQMBAT8Q/qmSQetQ3O/0hEzbehJUl/Fq4CXT5rSDKHO1DOL/AFu6i35MUK5jurmaB85VZ5iapv8ALUU8le7a2oLx0OMXvSujBp+qIJEWunD68BKnH4phMwHRPxVhDkS3OrcwMRQABdPk5oFCAKn4t0qFsDD3qwOVl+uRe2D8ONEICYn4eK0RcvdFcAdHvVxDKwzjpxp3AVsEtFgsZp5mBHwp2khAlM4426fYvLeh5mGnwFkwt4pKscLDQaH0dg18VPjcjZGI2pZ+29MWTYcc61x0j0Ulyq7t/wCz/9oACAECAQE/EP6s4YPK7HGo5hHP6RiZINZtQssl/DGNqu4IEpt++FDknMxQG4zy+tyUW/JHSiqZ0GHX9TVh1FULxR+Roov1xXvXbBUPAH1A0/hCaUZ8B0q3b5L1jRoEKoFQAf8ABfRXyWnOt0D6lsd8QDdnAFN9VND47dU12E2U4zhj8YUhD2KOBYlpTIaUoLck70CpiL9tQwynPVgpPhM3MMk2ic32IFPRHYY6wrYGmkJWDCxDKiKgbzFiSWFCA5hX/ALgqHq8qSo5BsbNxDLcoAAgEAYAwcvtsKLXiMkThyq/qcXi8BUA3wYuwf2f/9oACAEBAQE/EP8ARQKRYrRRAOezbQOQLCNO0gTRa+ZCHBINJFmyaUMxSc3IFaHkJiDTtIE04E485XAMpYM1+yAeyUvoTBSBmQBBNEbjUJncsseuGmMtArLXzfWEx21fSZc4UXJspOPhtYH2zFsBuWAWOZzqoyK6hhNgAvQKADhRjqI7CtE3Pl2p5ibAvLUl6Bywq4udkP0e1DZHMwQ7E82aQFXvCDcmVcIzwOs2gCTvi1h5Gu6l3LQudqMoslB9RhZPMVuyI3TlYCwMYIOscqndsp1wXTAsKmGCSsYJcHA0+ycjD15Bj6Mb46VbWQ8gfWKuJHSKfn9EvZj9PX2pHrtDoUu5b1yr1SddZ4yrcT1UKDLo6aNC3oYyBwF8ZVwetKrR1QjLKsDj4gYjeLcGeX2H+IAyjYgkSLwaRkbUISH9gx7KXjA8vsQvAUnTNCJY2Bw13mpnnEZG/EBXOobPbBUSGjj1LOkYrV8NRNqlxUbOj8lqd6ImTIsiCy5hNO2BW0B4gGhRQwhvJz+7oVIeDH3h4UAs51P4m32BNC392LoUGIE9Br5TRYOsDky4WcRCRqVDx4Xkp4VC1afNhcUChMgjIaI5jRNMV1MyMoiUIZLb2eRNCcMM2RYAHM0rkjiE0kXSMMOtqfiLdVBHEOgNoLBfsqHN5QXaSo3D6gQmWJlq3ML3dZF9iUIwlxNErTQms5Hcyo9ifkG7sVi34J7E+X8T2RtGF+0tj6152DQtQyzcC+gL90PzG9i5NqyQ4AeermSVlW2eVBr82g8KLw+ftqKKF8AfiaNRQV0gS0IVixNuWn0xTbj0QrRIXbR1Pwdaf1gxoS7ci19anVY9S9oHf73YiGEYTkl6jAN/0DPR1qFHg30J8ihQCYUI8ktRU0LqCuQhEnGvLST4T5rOZu8qTXlCH4hxYK8/7PP/AMVCPftchIR4UrsqTdUv8WkrB817/pNLUsAPzCzrSd+BN/QOtOqNwplea3/lsYQMOCPpOYD1l3b6VjQ2V4I8P8r/AP/Z';
  window.__ICONE_TUTTS_JPG = ICONE_TUTTS_JPG; // HUB_REL_V2: reaproveitado pelo relatorio v2

  function TabRelatorio({ API_URL, fetchAuth, showToast }) {
    // RELATORIO_FILTROS_FRONT_V1
    // ARQUITETURA: so o PERIODO vai pro servidor. Todo o resto (canal,
    // provedor, status, loja, motoboy, busca) filtra na tela.
    //
    // Por que: (1) trocar filtro responde na hora, sem round-trip; (2) o CSV
    // e gerado do que esta RENDERIZADO, entao a planilha nao tem como
    // divergir da tela — antes o servidor refazia os filtros por conta e as
    // duas logicas podiam sair de sincronia.
    const [rows, setRows] = useState([]);
    const [totais, setTotais] = useState(null);
    const [loading, setLoading] = useState(true);
    const [modalAberto, setModalAberto] = useState(false);

    // RELATORIO_COLUNAS_FRONT_V1: abre em HOJE. 30 dias como padrao trazia
    // milhares de linhas so pra alguem que so queria ver o dia.
    const [periodo, setPeriodo] = useState('1d');
    const hojeBRT   = () => dataLocalBRT(new Date());
    const diasAtras = (nd) => dataLocalBRT(new Date(Date.now() - nd * 86400000));
    const [deCustom, setDeCustom]   = useState(diasAtras(29));
    const [ateCustom, setAteCustom] = useState(hojeBRT());

    // null = SEM FILTRO (todos). Set = "so estes".
    // Usar null em vez de "Set com tudo" evita re-sincronizar a selecao toda
    // vez que o periodo muda e a lista de opcoes muda junto: item novo entra
    // marcado sozinho, em vez de aparecer desmarcado sem ninguem ter mexido.
    const VAZIO = '__sem__';
    const [f, setF] = useState({
      canais: null, provedores: null, status: null,
      lojas: null, busca: '',
    });

    // RELATORIO_COLUNAS_FRONT_V1 — colunas visiveis.
    //
    // A tabela e o CSV sao gerados desta MESMA lista. Antes o cabecalho, as
    // celulas e o CSV eram tres listas escritas a mao: mudar uma coluna
    // exigia lembrar das tres. Agora e uma so.
    //
    // 'enderecos' e uma coluna na tela mas DUAS no CSV (Coleta e Entrega) —
    // por isso csv pode devolver array.
    // Canal e Provedor saem no CSV junto com Motoboy: o icone do canal mora
    // naquela celula.
    const [cols, setCols] = useState(() => new Set(
      // [relatorio-data-v4] 'data' entra visivel por padrao (voce pediu data/hora
      // no relatorio); da pra esconder no seletor de colunas se atrapalhar.
      ['data', 'tentativa', 'cliente', 'enderecos', 'motoboy', 'status', 'km', 'valor', 'mapp', 'custo', 'liquido'] // HUB_DASH_OS_V1: + tentativa
    ));
    const colVisivel = (id) => cols.has(id);
    const alternarCol = (id) => setCols(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });

    const range = periodo === 'custom' ? { de: deCustom, ate: ateCustom }
      : periodo === '1d'  ? { de: hojeBRT(),    ate: hojeBRT() }
      : periodo === '7d'  ? { de: diasAtras(6),  ate: hojeBRT() }
      :                     { de: diasAtras(29), ate: hojeBRT() };
    const de = range.de, ate = range.ate;

    const carregar = useCallback(async () => {
      setLoading(true);
      try {
        const res = await fetchAuth(`${API_URL}/admin/relatorio/hub-corridas?de=${de}&ate=${ate}`);
        const json = await res.json();
        if (json.success) { setRows(json.corridas || []); setTotais(json.totais || null); }
        else showToast(json.error || 'Erro ao carregar relatório', 'error');
      } catch { showToast('Erro de rede no relatório', 'error'); }
      finally { setLoading(false); }
    }, [fetchAuth, API_URL, de, ate]);

    useEffect(() => { carregar(); }, [carregar]);

    // Fecha o modal no ESC.
    useEffect(() => {
      if (!modalAberto) return;
      const esc = (ev) => { if (ev.key === 'Escape') setModalAberto(false); };
      document.addEventListener('keydown', esc);
      return () => document.removeEventListener('keydown', esc);
    }, [modalAberto]);

    // As opcoes saem das linhas JA carregadas do periodo: so aparece filtro
    // pra coisa que existe. Filtrar por loja que nao teve corrida no periodo
    // nao faria sentido.
    const ordPt = (a, b) => String(a).localeCompare(String(b), 'pt-BR');
    const opcoesDe = (campo) => {
      const vals = Array.from(new Set(rows.map(r => r[campo]).filter(Boolean))).sort(ordPt);
      if (rows.some(r => !r[campo])) vals.push(VAZIO);
      return vals;
    };
    const opcoes = useMemo(() => ({
      canais:     opcoesDe('canal'),
      provedores: opcoesDe('provider'),
      status:     opcoesDe('status'),
      lojas:      opcoesDe('cliente_nome'),
    }), [rows]);

    const marcado = (chave, v) => f[chave] === null || f[chave].has(v);
    const alternar = (chave, v) => {
      const disp = opcoes[chave] || [];
      setF(prev => {
        const base = prev[chave] === null ? new Set(disp) : new Set(prev[chave]);
        if (base.has(v)) base.delete(v); else base.add(v);
        // voltou a ter tudo -> null (sem filtro)
        return { ...prev, [chave]: base.size === disp.length ? null : base };
      });
    };
    const marcarTodos = (chave) => setF(prev => ({ ...prev, [chave]: null }));
    const marcarNenhum = (chave) => setF(prev => ({ ...prev, [chave]: new Set() }));
    const limparTudo = () => setF({ canais: null, provedores: null, status: null, lojas: null, busca: '' });

    const qtdFiltros = useMemo(() => {
      let n = 0;
      ['canais', 'provedores', 'status', 'lojas'].forEach(k => { if (f[k] !== null) n++; });
      if (f.busca.trim()) n++;
      return n;
    }, [f]);

    const casaBusca = (r) => {
      const q = f.busca.trim().toLowerCase();
      if (!q) return true;
      return [r.os, r.cliente_nome, r.motoboy, r.endereco_coleta, r.endereco_entrega, r.provider]
        .some(v => String(v == null ? '' : v).toLowerCase().includes(q));
    };
    const passa = (chave, v) => f[chave] === null || f[chave].has(v || VAZIO);

    // Motoboy nao tem mais multi-select: eram centenas de checkbox, e a busca
    // livre ja cobre "quero ver as do fulano". Virou so mostrar/esconder coluna.
    const rowsView = useMemo(() => rows.filter(r =>
      passa('canais', r.canal) && passa('provedores', r.provider) &&
      passa('status', r.status) && passa('lojas', r.cliente_nome) && casaBusca(r)
    ), [rows, f]);

    // [relatorio-faturaveis-v4] Os CARDS somam so o que FATURA: Entregue e
    // Devolvido. Cancelado / Nao entregue / Pendente aparecem na tabela (voce
    // precisa ve-los) mas NAO entram nos totais — senao o faturamento mente.
    //
    // EXCECAO: se voce filtrar status especificos, os totais seguem o filtro.
    // Assim da pra somar so os cancelados quando quiser olhar exatamente isso.
    const STATUS_FATURAVEIS = ['Entregue', 'Devolvido'];
    const filtroStatusAtivo = f.status !== null;   // null = "todos"
    const linhasQueSomam = useMemo(() => (
      filtroStatusAtivo
        ? rowsView                                            // segue o filtro
        : rowsView.filter(c => STATUS_FATURAVEIS.includes(c.status))
    ), [rowsView, filtroStatusAtivo]);

    const totaisView = useMemo(() => {
      const t = linhasQueSomam.reduce((acc, c) => {
        acc.corridas += 1;
        if (c.km != null) acc.km += c.km;
        if (c.valor != null) acc.valor += c.valor;
        if (c.valor_mapp != null) acc.mapp += c.valor_mapp;
        if (c.custo_provedor != null) acc.custo += c.custo_provedor;
        if (c.faturamento_liquido != null) acc.liquido += c.faturamento_liquido;
        // Soma COMPARAVEL, separada: a diferenca entre os modais so vale nas
        // corridas com as DUAS pontas. Corrida com Mapp = 0 (o snapshot pego
        // antes de o operador lancar o valor) inflaria a diferenca.
        if (c.valor != null && c.valor_mapp != null && c.valor_mapp > 0) {
          acc.cmpHub += c.valor; acc.cmpMapp += c.valor_mapp; acc.cmpN += 1;
        }
        return acc;
      }, { corridas: 0, km: 0, valor: 0, mapp: 0, custo: 0, liquido: 0, cmpHub: 0, cmpMapp: 0, cmpN: 0 });
      ['km', 'valor', 'mapp', 'custo', 'liquido', 'cmpHub', 'cmpMapp'].forEach(k => {
        t[k] = Math.round(t[k] * 100) / 100;
      });
      t.cmpFora = linhasQueSomam.filter(c => c.valor != null).length - t.cmpN;
      return t;
    }, [linhasQueSomam]);

    // A BASE do % importa: com Hub 1.334 e Mapp 898, "48,5% mais caro" (base
    // Mapp) e "32,7% mais barato" (base Hub) sao a MESMA diferenca. O card
    // escreve a base pra ninguem ler errado.
    const difModais = useMemo(() => {
      const { cmpHub, cmpMapp, cmpN, cmpFora } = totaisView;
      if (!cmpN || cmpMapp <= 0) return null;
      const abs = Math.round((cmpHub - cmpMapp) * 100) / 100;
      return {
        abs, pct: Math.round(Math.abs((abs / cmpMapp) * 100) * 10) / 10,
        hubMaisCaro: abs > 0, iguais: Math.abs(abs) < 0.005, n: cmpN, fora: cmpFora,
      };
    }, [totaisView]);

    const brl = (n) => n == null ? '—' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const km  = (n) => n == null ? '—' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

    // CSV montado NA TELA, das colunas VISIVEIS e das linhas filtradas.
    // Mesmo formato do backend (BOM UTF-8 + ';') pro Excel abrir certo.
    // Como sai da mesma definicao que a tabela usa, planilha e tela nao tem
    // como divergir.
    const baixarCSV = () => {
      try {
        const esc = (v) => {
          const s2 = v == null ? '' : String(v);
          return /[";\n]/.test(s2) ? '"' + s2.replace(/"/g, '""') + '"' : s2;
        };
        const vis = COLS.filter(c => c.fixa || colVisivel(c.id));
        if (!vis.length) { showToast('Escolha ao menos uma coluna', 'error'); return; }
        const headers = vis.reduce((a, c) => a.concat(c.csvRot || [c.rot]), []);
        const linhas = rowsView.map(r => vis.reduce((a, c) => {
          const v = c.csv(r);
          return a.concat(Array.isArray(v) ? v : [v]);
        }, []));
        const csv = '\uFEFF' + [headers.map(esc).join(';')]
          .concat(linhas.map(l => l.map(esc).join(';'))).join('\n') + '\n';
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `relatorio-hub-${de}-a-${ate}.csv`; a.click();
        URL.revokeObjectURL(url);
      } catch { showToast('Erro ao exportar CSV', 'error'); }
    };

    const hubSvg = () => h('svg', { viewBox: '0 0 64 64', style: { width: '100%', height: '100%', padding: '3px' } },
      h('circle', { cx: 18, cy: 42, r: 4, fill: '#f67602' }),
      h('path', { d: 'M18 42 Q30 21 46 18', stroke: '#f67602', strokeWidth: 4, fill: 'none', strokeLinecap: 'round' }),
      h('path', { d: 'M46 18 l-7 -1 l3 7 z', fill: '#f67602' }),
      h('path', { d: 'M18 42 Q31 37 45 34', stroke: '#f67602', strokeWidth: 3.5, fill: 'none', strokeLinecap: 'round' }),
      h('path', { d: 'M45 34 l-6 -2 l2 6 z', fill: '#f67602' }),
      h('path', { d: 'M18 42 Q27 50 42 50', stroke: '#f67602', strokeWidth: 3, fill: 'none', strokeLinecap: 'round' }),
      h('path', { d: 'M42 50 l-6 -2 l0 6 z', fill: '#f67602' }),
    );
    const iconeCanal = (canal) => /* MP_ICONE_CANAL_V1 */ (canal === 'Moto própria' || canal === 'proprio')
      ? h('span', { title: 'Moto própria', style: { width: '20px', height: '20px', background: '#faf7fd', border: '1px solid #e9d5f9', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#770fa8' } }, h('svg', { className: 'ico', 'aria-hidden': 'true', style: { width: 13, height: 13 } }, h('use', { href: '#i-bike' })))
      : canal === 'tutts'
      ? h('span', { title: 'Tutts', style: { width: '20px', height: '20px', background: '#770fa8', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 } },
          h('img', { src: ICONE_TUTTS_JPG, style: { width: '100%', height: '100%', objectFit: 'contain', padding: '2px' } }))
      : h('span', { title: 'Hub', style: { width: '20px', height: '20px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 } }, hubSvg());
    const statusBadge = (s) => {
      const cor = {
        'Entregue': 'bg-green-100 text-green-700',
        'Devolvido': 'bg-amber-100 text-amber-700',
        'Em devolução': 'bg-amber-100 text-amber-700',
        'Cancelado': 'bg-gray-100 text-gray-500',
        'Não entregue': 'bg-orange-100 text-orange-700',
        'Aguardando': 'bg-gray-100 text-gray-600',
        'Procurando entregador': 'bg-purple-100 text-purple-700',
        'Entregador a caminho': 'bg-indigo-100 text-indigo-700',
        'A caminho da coleta': 'bg-amber-100 text-amber-700',
        'Na coleta': 'bg-amber-100 text-amber-700',
        'Coletou': 'bg-amber-200 text-amber-800',
        'Em rota': 'bg-blue-100 text-blue-700',
        'Na entrega': 'bg-orange-100 text-orange-700',
      }[s] || 'bg-gray-100 text-gray-600';
      return h('span', { className: `px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${cor}` }, s || '—');
    };
    const trajeto = (r) => h('div', null,
      h('div', { className: 'flex items-start gap-1.5' }, h('span', { className: 'text-purple-700 leading-4' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-circle' }))), h('span', { className: 'text-gray-600' }, r.endereco_coleta || '—')),
      h('div', { className: 'flex items-start gap-1.5 mt-1' }, h('span', { className: 'text-orange-500 leading-4' }, ''), h('span', { className: 'text-gray-700' }, r.endereco_entrega || '—')),
    );

    const rotulo = (chave, v) => {
      if (v === VAZIO) return { canais: 'Sem canal', provedores: 'Sem provedor', status: 'Sem status', lojas: 'Sem cliente' }[chave] || 'Sem valor';
      if (chave === 'canais') return v === 'tutts' ? 'Tutts' : 'Hub';
      if (chave === 'provedores') return v === 'noventanove' ? '99' : v === 'uber' ? 'Uber' : v;
      return v;
    };

    // Funcao que devolve elementos — NAO e componente. Componente definido
    // dentro do render vira tipo novo a cada render e o React desmonta/remonta
    // tudo, quebrando foco e clique.
    const secao = (titulo, chave, colunas) => {
      const disp = opcoes[chave] || [];
      return h('div', null,
        h('div', { className: 'flex items-center justify-between mb-1.5' },
          h('span', { className: 'text-xs font-semibold text-gray-700' }, titulo,
            f[chave] !== null && h('span', { className: 'ml-1.5 text-[10px] font-normal text-purple-600' }, `${f[chave].size}/${disp.length}`)),
          h('span', { className: 'flex gap-2' },
            h('button', { onClick: () => marcarTodos(chave), className: 'text-[10px] font-semibold text-purple-600 hover:underline' }, 'Todos'),
            h('button', { onClick: () => marcarNenhum(chave), className: 'text-[10px] font-semibold text-gray-400 hover:underline' }, 'Nenhum'),
          ),
        ),
        disp.length === 0
          ? h('div', { className: 'text-[11px] text-gray-400 py-1' }, 'Nada no período')
          : h('div', { className: `grid ${colunas || 'grid-cols-2'} gap-x-3 gap-y-0.5 max-h-40 overflow-y-auto pr-1` },
              disp.map(v => h('label', { key: String(v), className: 'flex items-center gap-1.5 py-0.5 rounded hover:bg-gray-50 cursor-pointer' },
                h('input', { type: 'checkbox', checked: marcado(chave, v), onChange: () => alternar(chave, v), className: 'w-3.5 h-3.5 accent-purple-600 flex-shrink-0' }),
                h('span', { className: `text-[11px] truncate ${v === VAZIO ? 'text-gray-400 italic' : 'text-gray-700'}`, title: rotulo(chave, v) }, rotulo(chave, v)),
              )),
            ),
      );
    };

    // RELATORIO_COLUNAS_FRONT_V1 — a definicao UNICA de coluna.
    // cel = como renderiza na tabela | csv = o que sai na planilha
    // csvRot = cabecalho(s) no CSV, quando difere do rotulo da tela
    // Precisa vir DEPOIS de brl/km/trajeto/iconeCanal/statusBadge, que ela usa.
    const nb = (n) => n == null ? '' : Number(n).toFixed(2).replace('.', ',');
    const COLS = [
      { id: 'os', rot: 'OS', fixa: true,
        tdCls: 'px-3 py-2 font-semibold text-gray-700',
        cel: (r) => r.os, csv: (r) => r.os },
      // [relatorio-data-v4] Data/hora da corrida. Na tela vai compacto
      // (dd/mm HH:MM); no CSV sai em DUAS colunas (Data e Hora) pra facilitar
      // filtro e tabela dinamica no Excel.
      { id: 'data', rot: 'Data/Hora',
        tdCls: 'px-3 py-2 text-gray-500 whitespace-nowrap text-[11px]',
        cel: (r) => {
          if (!r.data) return '—';
          try {
            const d = new Date(r.data);
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const hh = String(d.getHours()).padStart(2, '0');
            const mi = String(d.getMinutes()).padStart(2, '0');
            return dd + '/' + mm + ' ' + hh + ':' + mi;
          } catch (_) { return '—'; }
        },
        csvRot: ['Data', 'Hora'],
        csv: (r) => {
          if (!r.data) return ['', ''];
          try {
            const d = new Date(r.data);
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const aa = d.getFullYear();
            const hh = String(d.getHours()).padStart(2, '0');
            const mi = String(d.getMinutes()).padStart(2, '0');
            const ss = String(d.getSeconds()).padStart(2, '0');
            return [dd + '/' + mm + '/' + aa, hh + ':' + mi + ':' + ss];
          } catch (_) { return ['', '']; }
        } },
      // HUB_DASH_OS_V1: numero da tentativa dentro da OS. 1 = solicitacao
      // original; 2+ = redespacho (cancela + recria). Na tela vira "2/3"
      // (2a de 3 tentativas) em ambar; no CSV saem duas colunas.
      { id: 'tentativa', rot: 'Tent.',
        tdCls: 'px-3 py-2 text-center whitespace-nowrap text-[11px]',
        cel: (r) => {
          if (r.tentativa == null) return '—';
          const tot = r.tentativas_os || 1;
          if (tot <= 1) return h('span', { className: 'text-gray-400' }, '1');
          return h('span', { className: 'font-bold px-1.5 py-0.5 rounded ' + (r.tentativa > 1 ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'), title: r.tentativa > 1 ? 'Redespacho — ' + r.tentativa + 'ª de ' + tot + ' tentativas desta OS' : 'Solicitação original — OS teve ' + tot + ' tentativas' }, r.tentativa + '/' + tot);
        },
        csvRot: ['Tentativa', 'Tentativas da OS'],
        csv: (r) => [r.tentativa != null ? r.tentativa : '', r.tentativas_os != null ? r.tentativas_os : ''] },
      { id: 'cliente', rot: 'Cliente',
        tdCls: 'px-3 py-2 text-gray-600 max-w-[130px] truncate',
        // o title mostra de onde veio o nome (regra / endereco / solicitacao)
        tdProps: (r) => ({ title: r.cliente_nome ? (r.cliente_nome + (r.cliente_origem ? ' (' + r.cliente_origem + ')' : '')) : '' }),
        cel: (r) => r.cliente_nome || '—', csv: (r) => r.cliente_nome || '' },
      // CLIENTE_FINAL_RELATORIO_V1: destinatario e NF/pedido lidos do texto
      // livre do ponto de entrega da Mapp. Nem todo cliente preenche — o
      // travessao significa "a Mapp nao trouxe", nao "erro".
      { id: 'nota', rot: 'Pedido / NF',
        tdCls: 'px-3 py-2 text-gray-600 whitespace-nowrap text-[11px]',
        cel: (r) => r.nota_fiscal || '—', csv: (r) => r.nota_fiscal || '' },
      { id: 'cliente_final', rot: 'Cliente final',
        tdCls: 'px-3 py-2 text-gray-600 max-w-[160px] truncate',
        tdProps: (r) => ({ title: r.cliente_final || '' }),
        cel: (r) => r.cliente_final || '—', csv: (r) => r.cliente_final || '' },
      { id: 'enderecos', rot: 'Coleta / Entrega', rotFiltro: 'Endereços',
        tdCls: 'px-3 py-2 min-w-[200px]',
        cel: (r) => trajeto(r),
        csvRot: ['Coleta', 'Entrega'],
        csv: (r) => [r.endereco_coleta || '', r.endereco_entrega || ''] },
      { id: 'motoboy', rot: 'Motoboy', rotFiltro: 'Motoboy (+ canal)',
        tdCls: 'px-3 py-2',
        cel: (r) => h('span', { className: 'inline-flex items-center gap-1.5' }, iconeCanal(r.canal), r.motoboy || '—'),
        csvRot: ['Motoboy', 'Canal', 'Provedor'],
        csv: (r) => [r.motoboy || '', r.canal || '', r.provider || ''] },
      { id: 'status', rot: 'Status', tdCls: 'px-3 py-2',
        cel: (r) => statusBadge(r.status), csv: (r) => r.status || '' },
      { id: 'km', rot: 'KM', num: true, tdCls: 'px-3 py-2 text-right whitespace-nowrap',
        cel: (r) => km(r.km), csv: (r) => r.km != null ? String(r.km).replace('.', ',') : '' },
      // [relatorio-retorno-v1] O valor ja vem do backend COM o adicional de
      // devolucao somado. O marcador discreto + tooltip mostram quanto foi do
      // retorno, sem precisar de coluna nova (mesma tecnica do '~' do Custo).
      { id: 'valor', rot: 'Valor Hub', num: true,
        tdCls: 'px-3 py-2 text-right font-semibold text-gray-800 whitespace-nowrap',
        tdProps: (r) => ({ title: r.adicional_retorno
          ? `Inclui R$ ${nb(r.adicional_retorno)} de adicional por devolução`
          : '' }),
        cel: (r) => [brl(r.valor), r.adicional_retorno
          ? h('span', { key: 'ret', className: 'text-orange-400 ml-0.5', title: 'com adicional de devolução' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-corner' })))
          : null],
        csvRot: ['Valor Hub (R$)', 'Adicional Retorno (R$)'],
        csv: (r) => [nb(r.valor), r.adicional_retorno ? nb(r.adicional_retorno) : ''] },
      { id: 'mapp', rot: 'Valor Mapp', num: true,
        tdCls: 'px-3 py-2 text-right text-gray-500 whitespace-nowrap',
        cel: (r) => brl(r.valor_mapp), csvRot: ['Valor Mapp (R$)'], csv: (r) => nb(r.valor_mapp) },
      { id: 'custo', rot: 'Custo', num: true,
        tdCls: 'px-3 py-2 text-right text-rose-600 whitespace-nowrap',
        // 'cotacao' = Uber, ou 99 que ainda nao reconciliou. O ~ e o title
        // avisam que e estimativa, nao custo final.
        tdProps: (r) => ({ title: r.custo_origem === 'final' ? 'Custo final reconciliado (99)'
          : r.custo_origem === 'cotacao' ? 'Cotação do despacho (ainda não reconciliado)' : '' }),
        cel: (r) => [brl(r.custo_provedor), r.custo_origem === 'cotacao' ? h('span', { key: 'c', className: 'text-gray-300 ml-0.5' }, '~') : null],
        csvRot: ['Custo Provedor (R$)', 'Origem do Custo'],
        csv: (r) => [nb(r.custo_provedor), r.custo_origem || ''] },
      { id: 'liquido', rot: 'Líquido', num: true,
        tdCls: 'px-3 py-2 text-right font-semibold whitespace-nowrap',
        tdClsFn: (r) => r.faturamento_liquido == null ? 'text-gray-400' : r.faturamento_liquido < 0 ? 'text-rose-600' : 'text-emerald-700',
        cel: (r) => brl(r.faturamento_liquido), csvRot: ['Faturamento Liquido (R$)'], csv: (r) => nb(r.faturamento_liquido) },
    ];
    const colsVis = COLS.filter(c => c.fixa || colVisivel(c.id));

    const pills = [['1d', 'Hoje'], ['7d', '7 dias'], ['30d', '30 dias'], ['custom', 'Período']];

    const card = (rotuloTxt, valor, cls, sub, sub2, titleTxt) => h('div', {
      className: `rounded-xl border p-3 ${cls || 'bg-white border-gray-200'}`, title: titleTxt || undefined,
    },
      h('div', { className: 'text-[11px] text-gray-400' }, rotuloTxt),
      h('div', { className: 'text-2xl font-bold text-gray-800' }, valor),
      sub && h('div', { className: 'text-[10px] text-gray-500 mt-0.5' }, sub),
      sub2 && h('div', { className: 'text-[9px] text-gray-400 mt-0.5' }, sub2),
    );

    return h('div', { className: 'max-w-7xl mx-auto px-4 py-5 md:px-6 md:py-6 space-y-4' /* HUB_MARGEM_V1 */ },
      h('div', { className: 'flex items-center justify-between flex-wrap gap-3' },
        h('div', null,
          h('h2', { className: 'text-2xl font-bold text-gray-800' }, 'Relatório de corridas'),
          h('p', { className: 'text-xs text-gray-500 mt-0.5' }, 'OS, endereços, motoboy, km, valor do Hub, custo do provedor e líquido'),
        ),
        h('div', { className: 'flex items-center gap-2 flex-wrap' },
          h('button', {
            onClick: () => setModalAberto(true),
            className: `px-3 py-1.5 border rounded-lg text-sm font-semibold ${qtdFiltros ? 'border-purple-300 text-purple-700 bg-purple-50' : 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50'}`,
          }, qtdFiltros ? `Filtros (${qtdFiltros})` : 'Filtros'),
          h('span', { className: 'text-[11px] text-gray-400' }, `${de} a ${ate}`),
          h('button', { onClick: carregar, className: 'px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700' }, '⟳'),
          h('button', { onClick: baixarCSV, className: 'px-3 py-1.5 bg-white border border-purple-300 text-purple-700 rounded-lg text-sm font-semibold hover:bg-purple-50' }, h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-download' })), 'CSV')),
        ),
      ),

      modalAberto && h('div', {
        className: 'fixed inset-0 z-50 flex items-center justify-center p-4',
        style: { background: 'rgba(0,0,0,.45)' },
        onClick: (ev) => { if (ev.target === ev.currentTarget) setModalAberto(false); },
      },
        h('div', { className: 'bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto' },
          h('div', { className: 'flex items-center justify-between px-5 py-3 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl' },
            h('div', null,
              h('h3', { className: 'text-lg font-bold text-gray-800' }, 'Filtros'),
              h('p', { className: 'text-[11px] text-gray-500' }, `${rowsView.length} de ${rows.length} corridas`),
            ),
            h('button', { onClick: () => setModalAberto(false), className: 'text-gray-400 hover:text-gray-600 text-xl leading-none px-2' }, '×'),
          ),
          h('div', { className: 'p-5 space-y-4' },
            h('div', null,
              h('div', { className: 'text-xs font-semibold text-gray-700 mb-1.5' }, 'Período'),
              h('div', { className: 'flex items-center gap-2 flex-wrap' },
                h('div', { className: 'inline-flex bg-gray-100 rounded-lg p-0.5' },
                  pills.map(([p, lbl]) => h('button', { key: p, onClick: () => setPeriodo(p),
                    className: `px-3 py-1.5 text-xs font-semibold rounded-md ${periodo === p ? 'bg-white text-purple-800' : 'text-gray-500'}` }, lbl)),
                ),
                periodo === 'custom' && h('div', { className: 'flex items-center gap-1' },
                  h('input', { type: 'date', value: deCustom, onChange: e => setDeCustom(e.target.value), className: 'px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700' }),
                  h('span', { className: 'text-gray-400 text-xs' }, 'até'),
                  h('input', { type: 'date', value: ateCustom, onChange: e => setAteCustom(e.target.value), className: 'px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700' }),
                ),
              ),
              h('p', { className: 'text-[10px] text-gray-400 mt-1' }, 'O período recarrega do servidor; os demais filtros são na tela.'),
            ),
            h('div', null,
              h('div', { className: 'text-xs font-semibold text-gray-700 mb-1.5' }, 'Busca'),
              h('input', {
                type: 'text', value: f.busca, placeholder: 'OS, cliente, motoboy, endereço...',
                onChange: e => setF(prev => ({ ...prev, busca: e.target.value })),
                className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-700',
              }),
            ),
            h('div', { className: 'grid grid-cols-2 gap-4' },
              secao('Canal', 'canais', 'grid-cols-1'),
              secao('Provedor', 'provedores', 'grid-cols-1'),
            ),
            secao('Status', 'status', 'grid-cols-3'),
            secao('Lojas', 'lojas', 'grid-cols-2'),
            // RELATORIO_COLUNAS_FRONT_V1: escolha das colunas. Vale pra tela E
            // pro CSV — os dois saem da mesma definicao.
            h('div', { className: 'pt-1 border-t border-gray-100' },
              h('div', { className: 'flex items-center justify-between mb-1.5 mt-3' },
                h('span', { className: 'text-xs font-semibold text-gray-700' }, 'Colunas',
                  h('span', { className: 'ml-1.5 text-[10px] font-normal text-gray-400' }, 'valem pra tela e pro CSV')),
                h('span', { className: 'flex gap-2' },
                  h('button', { onClick: () => setCols(new Set(COLS.filter(c => !c.fixa).map(c => c.id))), className: 'text-[10px] font-semibold text-purple-600 hover:underline' }, 'Todas'),
                  h('button', { onClick: () => setCols(new Set()), className: 'text-[10px] font-semibold text-gray-400 hover:underline' }, 'Nenhuma'),
                ),
              ),
              h('div', { className: 'grid grid-cols-3 gap-x-3 gap-y-0.5' },
                COLS.filter(c => !c.fixa).map(c => h('label', {
                  key: c.id, className: 'flex items-center gap-1.5 py-0.5 rounded hover:bg-gray-50 cursor-pointer',
                },
                  h('input', { type: 'checkbox', checked: colVisivel(c.id), onChange: () => alternarCol(c.id), className: 'w-3.5 h-3.5 accent-purple-600 flex-shrink-0' }),
                  h('span', { className: 'text-[11px] text-gray-700 truncate' }, c.rotFiltro || c.rot),
                )),
              ),
            ),
          ),
          h('div', { className: 'flex items-center justify-between px-5 py-3 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl' },
            h('button', { onClick: limparTudo, className: 'text-xs font-semibold text-gray-500 hover:text-gray-700' }, 'Limpar tudo'),
            h('button', { onClick: () => setModalAberto(false), className: 'px-4 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700' }, 'Ver resultado'),
          ),
        ),
      ),

      // Totais do que esta VISIVEL (ja filtrado), nao os do backend — senao
      // ignorariam os filtros de tela e nao bateriam com a tabela.
      totais && h('div', { className: 'grid grid-cols-4 gap-3' },
        // [relatorio-faturaveis-v4] o subtitulo explica por que a contagem do
        // card pode ser menor que a da tabela (nao-faturaveis nao somam).
        card('Corridas', totaisView.corridas,
          null,
          filtroStatusAtivo
            ? 'seguindo o filtro de status'
            : (rowsView.length > linhasQueSomam.length
                ? `${rowsView.length - linhasQueSomam.length} nao faturavel(is) fora da conta`
                : null),
          null,
          filtroStatusAtivo
            ? 'Voce filtrou status, entao os totais seguem o filtro.'
            : 'Os totais somam apenas Entregue e Devolvido. Cancelado / Nao entregue / Pendente aparecem na tabela mas nao entram no faturamento.'),
        card('KM total', km(totaisView.km)),
        h('div', { className: 'rounded-xl border p-3 bg-purple-50 border-purple-200' },
          h('div', { className: 'text-[11px] text-purple-700' }, 'Valor do Hub'),
          h('div', { className: 'text-2xl font-bold text-purple-700' }, 'R$ ' + brl(totaisView.valor)),
        ),
        h('div', { className: 'rounded-xl border p-3 bg-white border-gray-200' },
          h('div', { className: 'text-[11px] text-gray-400' }, 'Custo provedor'),
          h('div', { className: 'text-2xl font-bold text-rose-600' }, '- R$ ' + brl(totaisView.custo)),
          h('div', { className: 'text-[10px] text-gray-500 mt-0.5' }, 'o que pagamos a 99/Uber'),
        ),
        h('div', { className: 'rounded-xl border p-3 bg-emerald-50 border-emerald-200' },
          h('div', { className: 'text-[11px] text-emerald-600' }, 'Faturamento líquido'),
          h('div', { className: `text-2xl font-bold ${totaisView.liquido < 0 ? 'text-rose-600' : 'text-emerald-700'}` }, 'R$ ' + brl(totaisView.liquido)),
          h('div', { className: 'text-[10px] text-emerald-600/70 mt-0.5' }, 'Hub − custo do provedor'),
        ),
        card('Valor Mapp', 'R$ ' + brl(totaisView.mapp)),
        h('div', { className: 'rounded-xl border p-3 bg-white border-gray-200' },
          h('div', { className: 'text-[11px] text-gray-400' }, 'Diferença entre os modais'),
          !difModais
            ? h('div', { className: 'text-2xl font-bold text-gray-300' }, '—')
            : difModais.iguais
              ? h('div', { className: 'text-2xl font-bold text-gray-500' }, 'R$ 0,00')
              : h('div', { className: `text-2xl font-bold ${difModais.hubMaisCaro ? 'text-emerald-600' : 'text-rose-600'}` },
                  (difModais.hubMaisCaro ? '+' : '−') + ' R$ ' + brl(Math.abs(difModais.abs))),
          !difModais
            ? h('div', { className: 'text-[10px] text-gray-400 mt-0.5' }, 'sem corrida comparável')
            : h('div', { className: 'text-[10px] text-gray-500 mt-0.5' },
                difModais.iguais ? 'Hub e Mapp no mesmo valor'
                  : `Hub ${brl(difModais.pct)}% mais ${difModais.hubMaisCaro ? 'caro' : 'barato'} que a Mapp`),
          difModais && h('div', {
            className: 'text-[9px] text-gray-400 mt-0.5',
            title: 'Só entram corridas com valor de Hub E de Mapp (> 0). Corrida com Mapp zerado ficaria de fora, senão inflaria a diferença.',
          }, `${difModais.n} corrida${difModais.n === 1 ? '' : 's'}` + (difModais.fora > 0 ? ` · ${difModais.fora} fora (sem Mapp)` : '')),
        ),
      ),

      loading
        ? h('div', { className: 'flex items-center justify-center py-16' },
            h('div', { className: 'animate-spin w-10 h-10 border-4 border-purple-700 border-t-transparent rounded-full' }))
        : h('div', { className: 'bg-white rounded-xl border border-gray-200 overflow-hidden' },
            h('div', { className: 'overflow-x-auto' },
              h('table', { className: 'w-full text-xs' },
                h('thead', null,
                  h('tr', { className: 'bg-gray-50 text-left text-gray-500' },
                    colsVis.map(c => h('th', { key: c.id, className: `px-3 py-2 font-semibold ${c.num ? 'text-right' : ''}` }, c.rot)),
                  ),
                ),
                h('tbody', null,
                  rowsView.length === 0
                    ? h('tr', null, h('td', { colSpan: Math.max(1, colsVis.length), className: 'px-3 py-8 text-center text-gray-400' },
                        rows.length === 0 ? 'Nenhuma corrida no período' : 'Nenhuma corrida com os filtros atuais'))
                    : rowsView.map((r, i) => h('tr', { key: (r.delivery_id != null ? 'd' + r.delivery_id : r.os + '-' + i), className: 'border-t border-gray-100 hover:bg-gray-50 align-top' },
                        colsVis.map(c => h('td', Object.assign(
                          { key: c.id, className: (c.tdCls || 'px-3 py-2') + (c.tdClsFn ? ' ' + c.tdClsFn(r) : '') },
                          c.tdProps ? c.tdProps(r) : {}
                        ), c.cel(r))),
                      )),
                ),
              ),
            ),
          ),
    );
  }

  function ModuloLogistica(props) {
    const { HeaderCompacto, usuario, Ee, socialProfile, isLoading, lastUpdate, onRefresh, onLogout, navegarSidebar, estado, setEstado } = props;

    // Aba ativa controlada pelo OverflowNav do app.js (via estado.logisticaTab)
    const aba = (estado && estado.logisticaTab) || 'dashboard';

    const abas = {
      dashboard: TabDashboard,
      tracking:  TabTracking,
      chat:      window.Chat99Panel || (() => h('div', { className: 'max-w-3xl mx-auto p-6 text-center text-red-700 bg-red-50 border border-red-200 rounded-lg' }, 'chat99-panel.js nao carregou. Verifique o index.html.')),
      entregas:  TabEntregas,
      regras:    TabRegras,
      // HUB_REL_V2: relatorio v2 em modulo-logistica-relatorio.js (fallback: TabRelatorio antigo)
      relatorio: window.ModuloLogisticaRelatorio || TabRelatorio,
      // CANCEL_HISTORICO_V1: historico de cancelamentos (modulo-logistica-cancelamentos.js)
      cancelamentos: window.ModuloLogisticaCancelamentos || (() => h('div', {
        className: 'max-w-3xl mx-auto p-6 text-center text-red-700 bg-red-50 border border-red-200 rounded-lg'
      }, 'modulo-logistica-cancelamentos.js não foi carregado. Verifique o index.html.')),
      barrados:   TabBarrados,
      frequentes: TabFrequentes,
      // 🆕 2026-05 Hub logístico — painel de provedores (modulo-logistica-providers.js).
      // Componente externo (window global) — fallback se o script não carregou.
      provedores: window.ModuloLogisticaProviders || (() => h('div', {
        className: 'max-w-3xl mx-auto p-6 text-center text-red-700 bg-red-50 border border-red-200 rounded-lg'
      }, h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', 'aria-hidden': 'true' }, h('use', { href: '#i-alert' })), 'modulo-logistica-providers.js não foi carregado. Verifique o index.html.'))),
    };
    const Atual = abas[aba] || TabDashboard;

    return h('div', { className: 'min-h-screen bg-gray-50' },
      // Header com a barra de navegação igual aos outros módulos
      HeaderCompacto && h(HeaderCompacto, {
        usuario: usuario,
        moduloAtivo: Ee,
        abaAtiva: aba,
        socialProfile: socialProfile,
        isLoading: isLoading,
        lastUpdate: lastUpdate,
        onRefresh: onRefresh,
        onLogout: onLogout,
        onGoHome: () => props.he && props.he('home'),
        onNavigate: navegarSidebar,
        onChangeTab: (abaId) => setEstado(e => ({ ...e, logisticaTab: abaId })),
      }),
      // Conteúdo da aba ativa
      h(Atual, props)
    );
  }

  // Expor globalmente para o app.js carregar (padrão dos outros módulos)
  window.ModuloLogisticaComponent = ModuloLogistica;
})();
