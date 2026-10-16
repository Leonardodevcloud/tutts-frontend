/* UI_UNIFICADO_V1: emojis -> sprite de icones; cores na paleta unica (CORES_TOKENS_V1). */
/* DEEMOJI_V1 */
/* PERF_CLEAN_V1: redesign clean aprovado (Dashboard/Detalhe conforme mockups; Busca,
   Configurações e Importações no padrão de abas). Só visual/estrutura — API, estados,
   polling e handlers preservados. */
// ================================================================
// MÓDULO PERFORMANCE DIÁRIA - Tutts v3.0 (DERIVADO DO BI)
// Arquivo: modulo-performance.js
// ----------------------------------------------------------------
// MUDANÇA v3.0: o SLA não é mais capturado cliente-a-cliente via RPA.
// Agora é DERIVADO de bi_entregas (mesma base e regra de prazo do BI).
// - Escopos: Cliente avulso OU Região herdada do BI (bi_regioes).
// - "Forçar Atualização" → dispara o import do BI (puxa planilha → BI).
// 4 abas: Dashboard · Busca · Configurações · Importações
// HeaderCompacto vem do app.js (padrão dos demais módulos)
// ================================================================

(function () {
  'use strict';

  const { useState, useEffect, useCallback, useRef } = React;
  const h = React.createElement;

  // ── Helpers ─────────────────────────────────────────────
  function hoje() { return new Date().toISOString().slice(0, 10); }
  function fmtData(iso) {
    if (!iso) return '—';
    const [a, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${a}`;
  }
  function fmtDT(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
  function fmtMin(min) {
    if (min == null || isNaN(min)) return '—';
    const m = Math.abs(Math.round(min));
    return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}m`;
  }
  // Limiares de SLA (inalterados): >= 90 na meta · >= 75 atenção · < 75 crítico
  const PF_META = 90;
  const PF_CRIT = 75;
  function corPct(pct) {
    if (pct >= PF_META) return { text: 'text-green-600', bg: 'bg-green-50', bar: '#16a34a', ring: 'border-green-400', tom: 'verde', label: 'Na meta', fg: '#166534' };
    if (pct >= PF_CRIT) return { text: 'text-yellow-600', bg: 'bg-yellow-50', bar: '#d97706', ring: 'border-yellow-400', tom: 'ambar', label: 'Atenção', fg: '#92400e' };
    return { text: 'text-red-600', bg: 'bg-red-50', bar: '#dc2626', ring: 'border-red-400', tom: 'vermelho', label: 'Crítico', fg: '#991b1b' };
  }

  // ── PERF_CLEAN_V1: primitivas visuais ───────────────────
  const PF_FONT_TIT = 'Sora, Inter, sans-serif';
  const PF_TOM = {
    verde:    { bg: '#f0fdf4', fg: '#166534', dot: '#16a34a', bd: '#bbf7d0' },
    ambar:    { bg: '#fffbeb', fg: '#92400e', dot: '#d97706', bd: '#fde68a' },
    vermelho: { bg: '#fef2f2', fg: '#991b1b', dot: '#dc2626', bd: '#fecaca' },
    azul:     { bg: '#eff6ff', fg: '#1e40af', dot: '#2563eb', bd: '#bfdbfe' },
    roxo:     { bg: '#faf7fd', fg: '#5d0b85', dot: '#770fa8', bd: '#e9d5f9' },
    cinza:    { bg: '#f3f4f6', fg: '#374151', dot: '#9ca3af', bd: '#e5e7eb' },
  };
  const PF_CSS = `
    .pf-card{transition:border-color .15s ease}
    .pf-card:hover{border-color:#c084e6 !important}
    .pf-card:focus-visible,.pf-btn:focus-visible,.pf-chip:focus-visible{outline:2px solid #770fa8;outline-offset:2px}
    .pf-in{height:38px;padding:0 10px;border:1px solid #e5e7eb;border-radius:10px;background:#ffffff;color:#111827;font-size:13px;font-family:inherit;width:100%;box-sizing:border-box}
    .pf-in:focus{outline:none;border-color:#770fa8;box-shadow:0 0 0 3px #f3e8fb}
    .pf-row:hover{background:#f9fafb}
    .pf-btn-sec:hover{background:#f9fafb}
    .pf-btn-pri:hover:not(:disabled){background:#5d0b85 !important}
    @keyframes pfSpin{to{transform:rotate(360deg)}}
  `;
  const pfIco = (nome, sz, extra) => h('svg', { className: 'ico', style: Object.assign({ width: sz || 16, height: sz || 16, flexShrink: 0 }, extra || {}), 'aria-hidden': 'true' }, h('use', { href: '#i-' + nome }));
  const pfSpinner = (cor) => h('span', { 'aria-hidden': 'true', style: { width: 14, height: 14, borderRadius: 99, border: `2px solid ${cor || '#ffffff'}`, borderTopColor: 'transparent', display: 'inline-block', animation: 'pfSpin 1s linear infinite' } });
  function fmtPct(p) {
    return `${Number(p || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  }
  function fmtNum(n) { return Number(n || 0).toLocaleString('pt-BR'); }
  function addDias(iso, dias) {
    const d = new Date(`${iso}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + dias);
    return d.toISOString().slice(0, 10);
  }
  // Situação de um snapshot: "sem dados" quando não há OS analisadas (no + fora = 0)
  function situacao(snap) {
    const analisados = (snap.no_prazo || 0) + (snap.fora_prazo || 0);
    if (analisados <= 0) return { tom: 'cinza', label: 'Sem dados', fg: '#6b7280', semDados: true, pct: null };
    const pct = parseFloat(snap.pct_no_prazo || 0);
    const c = corPct(pct);
    return { tom: c.tom, label: c.label, fg: c.fg, semDados: false, pct };
  }

  // PERF_CLEAN_V1 (pontos): bi_entregas tem 1 linha por (os, ponto). Dedup defensivo por (os, ponto)
  // e numeração "Entrega i/n" dentro da mesma OS (ordem de ponto), tudo client-side.
  function dedupPontos(regs) {
    const vistos = new Set();
    return (regs || []).filter(r => {
      const k = `${r.os}|${r.ponto == null ? '' : r.ponto}`;
      if (vistos.has(k)) return false;
      vistos.add(k);
      return true;
    });
  }
  function mapaPontos(regs) {
    const porOs = new Map();
    regs.forEach(r => { const k = String(r.os); if (!porOs.has(k)) porOs.set(k, []); porOs.get(k).push(r.ponto); });
    const out = new Map(); // "os|ponto" -> { i, n }
    porOs.forEach((pts, os) => {
      if (pts.length < 2) return;
      const ord = pts.slice().sort((a, b) => (Number(a) || 0) - (Number(b) || 0));
      ord.forEach((pt, i) => out.set(`${os}|${pt}`, { i: i + 1, n: ord.length }));
    });
    return { mapa: out, qtdOs: porOs.size };
  }

  function PfPilula({ tom, children, semPonto, title }) {
    const t = PF_TOM[tom] || PF_TOM.cinza;
    return h('span', { title, className: 'inline-flex items-center rounded-full whitespace-nowrap', style: { gap: 6, padding: '3px 9px', fontSize: 11.5, fontWeight: 600, background: t.bg, color: t.fg, flex: 'none' } },
      !semPonto && h('span', { 'aria-hidden': 'true', style: { width: 6, height: 6, borderRadius: 99, background: t.dot, flexShrink: 0 } }),
      children);
  }
  const PfPilulaRegiao = () => h(PfPilula, { tom: 'roxo', semPonto: true }, 'Região');

  function PfCabecalho({ titulo, sub, acoes, extraTitulo }) {
    return h('div', { className: 'flex flex-wrap justify-between items-end', style: { gap: 16 } },
      h('div', { style: { minWidth: 0 } },
        h('div', { className: 'flex flex-wrap items-center', style: { gap: 10 } },
          h('h1', { style: { margin: 0, fontFamily: PF_FONT_TIT, fontSize: 24, fontWeight: 700, color: '#111827', lineHeight: 1.25 } }, titulo),
          extraTitulo),
        sub && h('p', { style: { margin: '4px 0 0', color: '#6b7280', fontSize: 13 } }, sub),
      ),
      acoes && h('div', { className: 'flex flex-wrap', style: { gap: 8 } }, acoes),
    );
  }

  function PfBotao({ onClick, disabled, variante, icone, children, title, ocupado }) {
    const pri = variante === 'principal';
    const des = variante === 'destrutivo';
    const st = {
      height: 40, padding: pri ? '0 16px' : '0 14px', borderRadius: 10, fontWeight: 600, fontSize: 13,
      display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
      cursor: disabled ? (ocupado ? 'wait' : 'not-allowed') : 'pointer',
    };
    if (pri) Object.assign(st, { border: 0, background: disabled ? '#f3e8fb' : '#770fa8', color: disabled ? '#5d0b85' : '#ffffff' });
    else if (des) Object.assign(st, { border: '1px solid #fecaca', background: '#ffffff', color: '#991b1b' });
    else Object.assign(st, { border: '1px solid #e5e7eb', background: '#ffffff', color: '#374151' });
    return h('button', { type: 'button', onClick, disabled, title, className: `pf-btn ${pri ? 'pf-btn-pri' : 'pf-btn-sec'}`, style: st },
      ocupado ? pfSpinner(pri ? '#5d0b85' : '#374151') : (icone && pfIco(icone, 15)),
      children);
  }

  // Segmentado (fundo cinza, opção ativa branca)
  function PfSegmentado({ opcoes, valor, onChange, rotulo }) {
    return h('div', { role: 'group', 'aria-label': rotulo, style: { display: 'inline-flex', background: '#f3f4f6', borderRadius: 10, padding: 3, height: 38, boxSizing: 'border-box', flex: 'none', alignSelf: 'flex-start', maxWidth: '100%' } },
      opcoes.map(o => {
        const ativo = valor === o.id;
        return h('button', {
          key: o.id, type: 'button', onClick: () => onChange(o.id), 'aria-pressed': ativo, className: 'pf-chip',
          style: { border: 0, background: ativo ? '#ffffff' : 'transparent', color: ativo ? '#5d0b85' : '#374151', fontWeight: ativo ? 600 : 500, padding: '0 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' },
        }, o.label);
      }));
  }

  function PfCampo({ rotulo, children, flex, minW, htmlFor }) {
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, flex: flex || 'none', minWidth: minW != null ? minW : 0, position: 'relative' } },
      h('label', { htmlFor, style: { fontSize: 12, fontWeight: 600, color: '#374151' } }, rotulo),
      children);
  }

  const pfCard = (extra) => Object.assign({ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 14 }, extra || {});

  // Faixa de KPIs: um card só, células divididas por borda #f3f4f6
  function PfFaixa({ itens, rodape, rotulo }) {
    return h('section', { 'aria-label': rotulo, style: pfCard({ overflow: 'hidden' }) },
      h('div', { className: `grid grid-cols-2 ${itens.length >= 4 ? 'md:grid-cols-4' : 'md:grid-cols-3'}`, style: { gap: 1, background: '#f3f4f6' } },
        itens.map((k, i) => h('div', { key: i, style: { background: '#ffffff', padding: '14px 18px', minWidth: 0 } },
          h('div', { style: { fontSize: 12, color: '#6b7280' } }, k.rotulo),
          h('div', { style: { fontFamily: PF_FONT_TIT, fontSize: 26, fontWeight: 700, color: k.cor || '#111827', fontVariantNumeric: 'tabular-nums', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } },
            k.valor, k.complemento && h('span', { style: { fontSize: 14, color: '#6b7280', fontWeight: 500, marginLeft: 4 } }, k.complemento)),
          k.sub && h('div', { style: { fontSize: 11.5, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, title: typeof k.sub === 'string' ? k.sub : undefined }, k.sub),
        ))),
      rodape && h('div', { style: { padding: '0 18px 16px', borderTop: 0 } }, rodape),
    );
  }

  // Barra segmentada verde / vermelho / cinza
  function PfBarra({ no, fora, sem, altura }) {
    const total = (no || 0) + (fora || 0) + (sem || 0);
    const w = (x) => `${total > 0 ? (x / total) * 100 : 0}%`;
    return h('div', { 'aria-hidden': 'true', style: { height: altura || 8, borderRadius: 99, background: '#f3f4f6', overflow: 'hidden', display: 'flex' } },
      total > 0 && h('div', { style: { width: w(no), background: '#16a34a' } }),
      total > 0 && h('div', { style: { width: w(fora), background: '#dc2626' } }),
      total > 0 && h('div', { style: { width: w(sem), background: '#d1d5db' } }),
    );
  }

  const pfTh = (txt, dir, extra) => h('th', { style: Object.assign({ padding: '10px 12px', fontWeight: 600, fontSize: 12, color: '#6b7280', textAlign: dir ? 'right' : 'left', whiteSpace: 'nowrap', background: '#f9fafb', position: 'sticky', top: 0, zIndex: 1 }, extra || {}) }, txt);
  const pfTd = (conteudo, dir, extra) => h('td', { style: Object.assign({ padding: '11px 12px', textAlign: dir ? 'right' : 'left', whiteSpace: 'nowrap', fontSize: 13, color: '#111827' }, extra || {}) }, conteudo);

  function PfVazio({ titulo, texto, acao }) {
    return h('div', { style: pfCard({ padding: '40px 20px', textAlign: 'center' }) },
      h('p', { style: { margin: 0, fontWeight: 600, color: '#374151', fontSize: 14 } }, titulo),
      texto && h('p', { style: { margin: '6px 0 0', color: '#6b7280', fontSize: 13 } }, texto),
      acao && h('div', { style: { marginTop: 14, display: 'flex', justifyContent: 'center' } }, acao),
    );
  }

  // ════════════════════════════════════════════════════════════
  // COMPONENTE: Card de escopo (cliente ou região) no Dashboard
  // ════════════════════════════════════════════════════════════
  function ClienteCard({ card, onClick }) {
    const snap = card.snapshot || { total_os: 0, no_prazo: 0, fora_prazo: 0, sem_dados: 0, pct_no_prazo: 0 };
    const sit = situacao(snap);
    const total = snap.total_os || 0;
    const isRegiao = card.tipo === 'regiao';
    const sub = isRegiao
      ? `Região · ${card.qtd_itens} cliente${card.qtd_itens === 1 ? '' : 's'}/CC`
      : (card.centro_custo || 'Todos os centros');
    const leg = (cor, n, txt, apagado) => h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 5, color: apagado ? '#6b7280' : '#374151', whiteSpace: 'nowrap' } },
      h('span', { 'aria-hidden': 'true', style: { width: 7, height: 7, borderRadius: 99, background: cor } }),
      apagado ? n : h('b', {}, n), ` ${txt}`);

    return h('button', {
      type: 'button', onClick, className: 'pf-card',
      'aria-label': `${card.nome_display}: ${sit.semDados ? 'sem dados' : fmtPct(sit.pct) + ' no prazo'}. Abrir detalhe`,
      style: pfCard({ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left', color: '#111827', cursor: 'pointer', width: '100%', minWidth: 0, font: 'inherit' }),
    },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start', width: '100%' } },
        h('div', { style: { minWidth: 0 } },
          h('div', { title: card.nome_display, style: { fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, card.nome_display),
          h('div', { style: { fontSize: 12, color: '#6b7280', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, sub),
        ),
        h(PfPilula, { tom: sit.tom }, sit.label),
      ),
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', width: '100%' } },
        h('span', { style: { fontFamily: PF_FONT_TIT, fontSize: 30, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: sit.semDados ? '#9ca3af' : sit.fg, lineHeight: 1.1 } },
          sit.semDados ? '—' : fmtPct(sit.pct)),
        h('span', { style: { fontSize: 12, color: '#6b7280', fontVariantNumeric: 'tabular-nums' } }, total > 0 ? `${fmtNum(total)} entrega${total === 1 ? '' : 's'}` : 'Sem entregas no período'),
      ),
      h('div', { style: { width: '100%' } }, h(PfBarra, { no: snap.no_prazo, fora: snap.fora_prazo, sem: snap.sem_dados })),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', columnGap: 14, rowGap: 4, fontSize: 12, fontVariantNumeric: 'tabular-nums' } },
        leg('#16a34a', snap.no_prazo || 0, 'no prazo'),
        leg('#dc2626', snap.fora_prazo || 0, 'fora'),
        leg('#d1d5db', snap.sem_dados || 0, 's/ dados', true),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════
  // PERF_CLEAN_V1: visão de detalhe (compartilhada por Dashboard e Busca)
  // Filtros de SLA, busca textual e filtro por cliente são client-side.
  // ════════════════════════════════════════════════════════════
  function PfDetalheView({ titulo, card, periodo, registros: registrosBrutos, porCliente, loading, onVoltar, voltarLabel }) {
    const registros = dedupPontos(registrosBrutos);
    const { mapa: pontosOs, qtdOs } = mapaPontos(registros);
    const [filtro, setFiltro] = useState('todos');
    const [busca, setBusca] = useState('');
    const [clienteSel, setClienteSel] = useState(null); // chave "cod|cc" ou "cod|__todos__"

    const snap = card.snapshot || { total_os: 0, no_prazo: 0, fora_prazo: 0, sem_dados: 0, pct_no_prazo: 0 };
    const sit = situacao(snap);
    const isRegiao = card.tipo === 'regiao';
    const periodoTxt = periodo.inicio === periodo.fim ? fmtData(periodo.inicio) : `${fmtData(periodo.inicio)} a ${fmtData(periodo.fim)}`;
    const sub = isRegiao
      ? `${card.qtd_itens} cliente${card.qtd_itens === 1 ? '' : 's'}/centros · ${periodoTxt}`
      : `${card.centro_custo || 'Todos os centros'} · ${periodoTxt}`;
    const subEntregas = (!loading && registros.length > 0) ? `${fmtNum(registros.length)} entrega${registros.length === 1 ? '' : 's'} em ${fmtNum(qtdOs)} OS` : null;

    // Mesma regra de agrupamento do backend (/performance/detalhe → por_cliente)
    const chavesComCC = new Set((porCliente || []).filter(c => c.centro_custo).map(c => `${c.cod_cliente}|${c.centro_custo}`));
    const chaveReg = (r) => (r.centro_custo && chavesComCC.has(`${r.cod_cliente}|${r.centro_custo}`)) ? `${r.cod_cliente}|${r.centro_custo}` : `${r.cod_cliente}|__todos__`;
    const chaveCli = (c) => c.centro_custo ? `${c.cod_cliente}|${c.centro_custo}` : `${c.cod_cliente}|__todos__`;
    const mostrarPorCliente = isRegiao && (porCliente || []).length > 1;
    const cliSel = clienteSel && (porCliente || []).find(c => chaveCli(c) === clienteSel);

    const base = clienteSel ? registros.filter(r => chaveReg(r) === clienteSel) : registros;
    const cont = {
      todos: base.length,
      no_prazo: base.filter(r => r.dentro_prazo === true).length,
      fora_prazo: base.filter(r => r.dentro_prazo === false).length,
      sem_dados: base.filter(r => r.dentro_prazo == null).length,
    };
    const filtrados = base.filter(r => {
      if (filtro === 'no_prazo'   && r.dentro_prazo !== true)  return false;
      if (filtro === 'fora_prazo' && r.dentro_prazo !== false) return false;
      if (filtro === 'sem_dados'  && r.dentro_prazo != null)   return false;
      if (busca) {
        const s = busca.toLowerCase();
        const alvo = `${r.os || ''} ${r.nome_fantasia || ''} ${r.nome_cliente || ''} ${r.nome_prof || ''}`.toLowerCase();
        if (!alvo.includes(s)) return false;
      }
      return true;
    });

    const CHIPS = [
      { id: 'todos', label: 'Todas', tom: 'roxo' },
      { id: 'no_prazo', label: 'No prazo', tom: 'verde' },
      { id: 'fora_prazo', label: 'Fora', tom: 'vermelho' },
      { id: 'sem_dados', label: 'Sem dados', tom: 'cinza' },
    ];

    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 18 } },
      // Voltar + cabeçalho
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
        h('button', { type: 'button', onClick: onVoltar, className: 'pf-btn', style: { alignSelf: 'flex-start', border: 0, background: 'transparent', padding: '2px 0', fontSize: 12.5, color: '#6b7280', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' } },
          pfIco('arrowleft', 14), voltarLabel || 'Todos os clientes'),
        h(PfCabecalho, {
          titulo,
          sub: subEntregas ? `${sub} · ${subEntregas}` : sub,
          extraTitulo: [h(PfPilula, { key: 's', tom: sit.tom }, sit.label), isRegiao && h(PfPilulaRegiao, { key: 'r' })],
        }),
      ),

      // Faixa de resumo + barra
      h(PfFaixa, {
        rotulo: 'Resumo',
        itens: [
          { rotulo: 'No prazo', valor: sit.semDados ? '—' : fmtPct(sit.pct), cor: sit.semDados ? '#6b7280' : sit.fg, sub: `meta ${PF_META}%` },
          { rotulo: 'Entregas', valor: fmtNum(snap.total_os), sub: (!loading && registros.length > 0) ? `em ${fmtNum(qtdOs)} OS` : null },
          { rotulo: 'Fora do prazo', valor: fmtNum(snap.fora_prazo), cor: '#991b1b' },
          { rotulo: 'Sem dados', valor: fmtNum(snap.sem_dados), cor: '#6b7280' },
        ],
        rodape: h('div', { style: { paddingTop: 2 } }, h(PfBarra, { no: snap.no_prazo, fora: snap.fora_prazo, sem: snap.sem_dados })),
      }),

      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'flex-start' } },
        // Por cliente (região com vários clientes)
        mostrarPorCliente && h('section', { style: pfCard({ flex: '1 1 320px', minWidth: 0, overflow: 'hidden' }) },
          h('h2', { style: { margin: 0, padding: '14px 16px', fontSize: 15, fontWeight: 600, color: '#111827' } }, 'Por cliente'),
          porCliente.map((cl) => {
            const k = chaveCli(cl);
            const sel = clienteSel === k;
            const s = situacao({ no_prazo: cl.no_prazo, fora_prazo: cl.fora_prazo, pct_no_prazo: cl.pct_no_prazo });
            return h('button', {
              key: k, type: 'button', 'aria-pressed': sel, className: 'pf-chip pf-row',
              title: sel ? 'Remover filtro deste cliente' : 'Filtrar as entregas por este cliente',
              onClick: () => setClienteSel(sel ? null : k),
              style: { width: '100%', border: 0, borderTop: '1px solid #f3f4f6', background: sel ? '#faf7fd' : '#ffffff', padding: '11px 16px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 64px 54px', gap: 10, alignItems: 'center', textAlign: 'left', color: '#111827', cursor: 'pointer', font: 'inherit', fontSize: 13, boxShadow: sel ? 'inset 2px 0 0 #770fa8' : 'none' },
            },
              h('span', { style: { minWidth: 0 } },
                h('span', { title: cl.nome_cliente, style: { display: 'block', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: sel ? '#5d0b85' : '#111827' } }, cl.nome_cliente),
                h('span', { style: { fontSize: 11.5, color: '#6b7280', fontVariantNumeric: 'tabular-nums' } }, `${cl.cod_cliente} · ${fmtNum(cl.total)} entregas · ${fmtNum(cl.fora_prazo)} fora`),
              ),
              h(PfBarra, { no: cl.no_prazo, fora: cl.fora_prazo, sem: cl.sem_dados, altura: 6 }),
              h('span', { style: { textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: s.semDados ? '#9ca3af' : s.fg } }, s.semDados ? '—' : fmtPct(s.pct)),
            );
          }),
        ),

        // Tabela de entregas (1 linha por OS/ponto)
        h('section', { style: pfCard({ flex: '999 1 560px', minWidth: 0, overflow: 'hidden' }) },
          h('div', { style: { padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' } },
            h('h2', { style: { margin: '0 8px 0 0', fontSize: 15, fontWeight: 600, color: '#111827' } }, 'Entregas'),
            CHIPS.map(cp => {
              const ativo = filtro === cp.id;
              const t = PF_TOM[cp.tom];
              return h('button', {
                key: cp.id, type: 'button', onClick: () => setFiltro(cp.id), 'aria-pressed': ativo, className: 'pf-chip',
                style: { height: 30, padding: '0 10px', borderRadius: 99, border: `1px solid ${ativo ? t.bd : '#e5e7eb'}`, background: ativo ? t.bg : '#ffffff', color: ativo ? t.fg : '#374151', fontWeight: ativo ? 600 : 500, fontSize: 12.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' },
              }, cp.label, h('b', {}, fmtNum(cont[cp.id])));
            }),
            h('div', { style: { flex: 1 } }),
            h('div', { style: { position: 'relative', flex: '1 1 200px', maxWidth: 260, minWidth: 0 } },
              h('span', { style: { position: 'absolute', left: 10, top: 0, bottom: 0, display: 'flex', alignItems: 'center', color: '#9ca3af', pointerEvents: 'none' } }, pfIco('search', 15)),
              h('input', {
                type: 'text', placeholder: 'Buscar OS, cliente, profissional', value: busca, 'aria-label': 'Buscar nas entregas',
                onChange: e => setBusca(e.target.value),
                className: 'pf-in', style: { height: 34, paddingLeft: 32 },
              }),
            ),
          ),
          cliSel && h('div', { style: { padding: '8px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12.5, color: '#374151' } },
            h('span', { style: { color: '#6b7280' } }, 'Filtrando:'),
            h('span', { style: { fontWeight: 600, color: '#5d0b85' } }, cliSel.nome_cliente),
            h('button', { type: 'button', onClick: () => setClienteSel(null), className: 'pf-btn', style: { border: 0, background: 'transparent', color: '#770fa8', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, padding: 0 } },
              pfIco('x', 13), 'Limpar'),
          ),
          loading
            ? h('div', { style: { textAlign: 'center', padding: '40px 0', color: '#6b7280', fontSize: 13 } }, 'Carregando entregas...')
            : filtrados.length === 0
              ? h('div', { style: { textAlign: 'center', padding: '40px 16px', color: '#6b7280', fontSize: 13 } },
                  registros.length === 0 ? 'Nenhuma entrega finalizada no período.' : 'Nenhuma entrega com esses filtros.')
              : h('div', { style: { overflowX: 'auto', maxHeight: 560, overflowY: 'auto' } },
                  h('table', { style: { width: '100%', borderCollapse: 'collapse', fontVariantNumeric: 'tabular-nums' } },
                    h('thead', {},
                      h('tr', {},
                        pfTh('OS', false, { paddingLeft: 16 }),
                        pfTh('Cliente'),
                        pfTh('Profissional'),
                        pfTh('KM', true),
                        pfTh('Prazo', true),
                        pfTh('Execução', true),
                        pfTh('SLA', false, { paddingRight: 16 }),
                      ),
                    ),
                    h('tbody', {},
                      ...filtrados.slice(0, 500).map((r, i) => {
                        const semDados = r.dentro_prazo == null;
                        const tom = semDados ? 'cinza' : r.dentro_prazo ? 'verde' : 'vermelho';
                        const lbl = semDados ? 'Sem dados' : r.dentro_prazo ? 'No prazo' : 'Fora';
                        const corExec = semDados ? '#6b7280' : r.dentro_prazo ? '#111827' : '#991b1b';
                        const cliente = r.nome_fantasia || r.nome_cliente || '';
                        const pt = pontosOs.get(`${r.os}|${r.ponto}`);
                        return h('tr', { key: `${r.os}-${r.ponto != null ? r.ponto : i}`, className: 'pf-row', style: { borderTop: '1px solid #f3f4f6' } },
                          pfTd(h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 8 } },
                            r.os,
                            pt && h('span', { title: `Ponto ${r.ponto} desta OS`, style: { padding: '1px 7px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: '#f3f4f6', color: '#374151', whiteSpace: 'nowrap' } }, `Entrega ${pt.i}/${pt.n}`),
                          ), false, { paddingLeft: 16, fontWeight: 600 }),
                          pfTd(cliente, false, { maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', color: '#374151' }),
                          pfTd(r.nome_prof || '—', false, { color: '#374151' }),
                          pfTd(r.distancia ? parseFloat(r.distancia).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—', true),
                          pfTd(fmtMin(r.prazo_minutos), true, { color: '#6b7280' }),
                          pfTd(fmtMin(r.tempo_execucao_minutos), true, { fontWeight: 600, color: corExec }),
                          pfTd(h(PfPilula, { tom }, lbl), false, { paddingRight: 16 }),
                        );
                      }),
                    ),
                  ),
                ),
          !loading && filtrados.length > 0 && h('div', { style: { padding: '10px 16px', borderTop: '1px solid #f3f4f6', fontSize: 12, color: '#6b7280', fontVariantNumeric: 'tabular-nums' } },
            `${fmtNum(filtrados.length)} entrega${filtrados.length === 1 ? '' : 's'}${filtrados.length > 500 ? ' · exibindo as primeiras 500' : ''}`),
        ),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════
  // COMPONENTE: Detalhe do escopo (OS individuais, vindas de bi_entregas)
  // ════════════════════════════════════════════════════════════
  function DetalheCliente({ card, periodo, API_URL, fetchAuth, onVoltar }) {
    const [dados, setDados] = useState({ registros: [], por_cliente: [], titulo: card.nome_display });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      let vivo = true;
      (async () => {
        setLoading(true);
        try {
          const qs = new URLSearchParams({ data_inicio: periodo.inicio, data_fim: periodo.fim });
          if (card.config?.id) qs.set('config_id', card.config.id);
          else if (card.regiao_id) qs.set('regiao_id', card.regiao_id);
          else if (card.cod_cliente != null) {
            qs.set('cod_cliente', card.cod_cliente);
            if (card.centro_custo) qs.set('centro_custo', card.centro_custo);
          }
          const r = await fetchAuth(`${API_URL}/performance/detalhe?${qs.toString()}`);
          const d = await r.json();
          if (vivo) setDados({ registros: dedupPontos(d.registros || []), por_cliente: d.por_cliente || [], titulo: d.titulo || card.nome_display });
        } catch (e) { console.error(e); }
        if (vivo) setLoading(false);
      })();
      return () => { vivo = false; };
    }, [card, periodo, API_URL, fetchAuth]);

    return h(PfDetalheView, {
      titulo: dados.titulo, card, periodo,
      registros: dados.registros, porCliente: dados.por_cliente,
      loading, onVoltar, voltarLabel: 'Todos os clientes',
    });
  }

  // ════════════════════════════════════════════════════════════
  // ABA: Dashboard (cards por escopo configurado)
  // ════════════════════════════════════════════════════════════
  function TabDashboard({ API_URL, fetchAuth, showToast, setPerfTab }) {
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [periodo, setPeriodo] = useState({ inicio: hoje(), fim: hoje() });
    const [detalhe, setDetalhe] = useState(null);
    const [importId, setImportId] = useState(null);
    const [importEtapa, setImportEtapa] = useState('');
    const [ultima, setUltima] = useState(null);
    const [ordem, setOrdem] = useState('pior'); // PERF_CLEAN_V1: 'pior' | 'nome' | 'volume' (client-side)
    const pollingRef = useRef(null);

    const carregar = useCallback(async () => {
      try {
        const r = await fetchAuth(`${API_URL}/performance/dashboard?data_inicio=${periodo.inicio}&data_fim=${periodo.fim}`);
        const d = await r.json();
        setCards(d.cards || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    }, [API_URL, fetchAuth, periodo]);

    const carregarUltima = useCallback(async () => {
      try {
        const r = await fetchAuth(`${API_URL}/performance/ultima-importacao`);
        const d = await r.json();
        setUltima(d.ultima || null);
      } catch (e) { /* silencioso */ }
    }, [API_URL, fetchAuth]);

    useEffect(() => { setLoading(true); carregar(); }, [carregar]);
    useEffect(() => { carregarUltima(); }, [carregarUltima]);

    // ── POLLING do import forçado ──
    useEffect(() => {
      if (!importId) {
        if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
        return;
      }
      if (pollingRef.current) return;
      pollingRef.current = setInterval(async () => {
        try {
          const r = await fetchAuth(`${API_URL}/performance/import-status/${importId}`);
          const d = await r.json();
          const imp = d.import;
          if (!imp) return;
          setImportEtapa(imp.etapa_atual || imp.status || '');
          if (imp.status === 'sucesso' || imp.status === 'falhou') {
            clearInterval(pollingRef.current); pollingRef.current = null;
            setImportId(null);
            setImportEtapa('');
            if (imp.status === 'sucesso') {
              showToast(`Importação concluída — ${imp.linhas_inseridas || 0} OS atualizadas`, 'success');
              carregar();
              carregarUltima();
            } else {
              showToast(`Importação falhou: ${(imp.erro || 'erro desconhecido').slice(0, 120)}`, 'error');
            }
          }
        } catch (e) { /* ignora erro de polling */ }
      }, 5000);
      return () => { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } };
    }, [importId, API_URL, fetchAuth, carregar, carregarUltima, showToast]);

    useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

    // Botão "Forçar Atualização" → dispara import do BI
    const forcarImport = async () => {
      try {
        showToast('Puxando planilha e alimentando o BI...', 'info');
        const r = await fetchAuth(`${API_URL}/performance/forcar-import`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),  // default D-1
        });
        const d = await r.json();
        if (d.import_id) {
          setImportId(d.import_id);
          setImportEtapa(d.status || 'pendente');
          if (d.ja_existia) showToast('Já havia uma importação em andamento — acompanhando...', 'info');
        } else {
          showToast(d.error || 'Não foi possível iniciar a importação', 'error');
        }
      } catch (e) { showToast('Erro de conexão', 'error'); }
    };

    if (detalhe) return h(DetalheCliente, { card: detalhe, periodo, API_URL, fetchAuth, onVoltar: () => { setDetalhe(null); carregar(); } });

    const importando = !!importId;

    // ── PERF_CLEAN_V1: atalhos de período (só preenchem as datas → useEffect recarrega) ──
    const hj = hoje();
    const ATALHOS = [
      { id: 'hoje', label: 'Hoje', inicio: hj, fim: hj },
      { id: 'ontem', label: 'Ontem', inicio: addDias(hj, -1), fim: addDias(hj, -1) },
      { id: '7d', label: '7 dias', inicio: addDias(hj, -6), fim: hj },
    ];
    const atalhoAtivo = (ATALHOS.find(a => a.inicio === periodo.inicio && a.fim === periodo.fim) || {}).id || null;

    // ── Resumo calculado dos cards (mesma base do pct do backend: no / (no + fora)) ──
    const snapDe = (c) => c.snapshot || { total_os: 0, no_prazo: 0, fora_prazo: 0, sem_dados: 0, pct_no_prazo: 0 };
    let somaNo = 0, somaFora = 0, somaSem = 0;
    cards.forEach(c => { const s = snapDe(c); somaNo += s.no_prazo || 0; somaFora += s.fora_prazo || 0; somaSem += s.sem_dados || 0; });
    const somaAnalisadas = somaNo + somaFora;
    const pctGeral = somaAnalisadas > 0 ? (somaNo / somaAnalisadas) * 100 : null;
    const comDados = cards.filter(c => !situacao(snapDe(c)).semDados);
    const semDadosCards = cards.filter(c => situacao(snapDe(c)).semDados);
    const abaixo = comDados.filter(c => parseFloat(snapDe(c).pct_no_prazo || 0) < PF_META);
    const criticos = comDados.filter(c => parseFloat(snapDe(c).pct_no_prazo || 0) < PF_CRIT);

    // ── Ordenação client-side (sem dados sempre por último) ──
    const ordenados = cards.map((card, idx) => ({ card, idx })).sort((a, b) => {
      const sa = snapDe(a.card), sb = snapDe(b.card);
      const da = situacao(sa).semDados, db = situacao(sb).semDados;
      if (da !== db) return da ? 1 : -1;
      if (ordem === 'nome') return String(a.card.nome_display || '').localeCompare(String(b.card.nome_display || ''), 'pt-BR');
      if (ordem === 'volume') return (sb.total_os || 0) - (sa.total_os || 0) || a.idx - b.idx;
      if (da && db) return a.idx - b.idx;
      return parseFloat(sa.pct_no_prazo || 0) - parseFloat(sb.pct_no_prazo || 0) || (sb.fora_prazo || 0) - (sa.fora_prazo || 0) || a.idx - b.idx;
    });

    const subtitulo = [
      'Prazo de entrega por cliente',
      ultima ? `base do BI de ${fmtData(ultima.data_referencia)}, importada ${fmtDT(ultima.finalizado_em)}` : null,
      'import automático do BI às 12h',
      importando ? `importando agora${importEtapa ? ': ' + importEtapa : ''}` : null,
    ].filter(Boolean).join(' · ');

    const ORDENS = [{ id: 'pior', label: 'Pior primeiro' }, { id: 'nome', label: 'Nome' }, { id: 'volume', label: 'Volume' }];

    return h('div', { style: { position: 'relative', display: 'flex', flexDirection: 'column', gap: 18 } },
      h('style', {}, `
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(350%); } }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes argosWave { 0%, 100% { height: 5px; } 50% { height: 52px; } }
        @keyframes argosSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `),

      // ── OVERLAY ARGOS (durante import) ──
      importando && h('div', {
        style: {
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 99999,
          background: 'rgba(17,24,39, 0.88)',
          backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '36px',
        }
      },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '4px', height: '64px' },
          ref: (el) => {
            if (el && el.childNodes.length === 0) {
              for (let i = 0; i < 36; i++) {
                const bar = document.createElement('div');
                bar.style.cssText = 'width:4px;background:#770fa8;border-radius:3px;animation:argosWave 1.2s ease-in-out infinite;animation-delay:' + (i * 0.06) + 's';
                el.appendChild(bar);
              }
            }
          }
        }),
        h('div', { style: { textAlign: 'center', animation: 'argosSlideUp .6s ease-out both' } },
          h('div', { style: { fontSize: '12px', color: '#c084e6', letterSpacing: '4px', marginBottom: '10px' } }, 'ARGOS INTELLIGENCE'),
          h('div', { style: { fontSize: '20px', fontWeight: 500, color: '#f3e8fb' } }, 'Importando base do sistema externo'),
          h('div', { style: { fontSize: '14px', color: '#d1d5db', marginTop: '10px' } },
            `Puxando planilha → alimentando o BI${importEtapa ? ' · ' + importEtapa : ''}`),
        ),
      ),

      // Cabeçalho
      h(PfCabecalho, {
        titulo: 'Performance diária',
        sub: subtitulo,
        acoes: [
          h(PfBotao, { key: 'r', onClick: carregar, icone: 'refresh' }, 'Recarregar'),
          h(PfBotao, { key: 'f', onClick: forcarImport, disabled: importando, ocupado: importando, variante: 'principal', icone: 'download', title: 'Puxa a planilha do sistema externo e alimenta o BI' },
            importando ? 'Importando...' : 'Forçar atualização'),
        ],
      }),

      // Filtros
      h('section', { 'aria-label': 'Filtros', style: pfCard({ padding: '12px 14px', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 }) },
        h(PfCampo, { rotulo: 'De', htmlFor: 'pf-de', flex: '0 1 170px', minW: 0 },
          h('input', { id: 'pf-de', type: 'date', value: periodo.inicio, onChange: e => setPeriodo(p => ({ ...p, inicio: e.target.value })), className: 'pf-in', style: { maxWidth: 170 } })),
        h(PfCampo, { rotulo: 'Até', htmlFor: 'pf-ate', flex: '0 1 170px', minW: 0 },
          h('input', { id: 'pf-ate', type: 'date', value: periodo.fim, onChange: e => setPeriodo(p => ({ ...p, fim: e.target.value })), className: 'pf-in', style: { maxWidth: 170 } })),
        h(PfSegmentado, {
          rotulo: 'Atalhos de período', valor: atalhoAtivo, opcoes: ATALHOS,
          onChange: (id) => { const a = ATALHOS.find(x => x.id === id); if (a) setPeriodo({ inicio: a.inicio, fim: a.fim }); },
        }),
        h('div', { style: { flex: '1 1 0px', minWidth: 0 } }),
        h('div', { role: 'group', 'aria-label': 'Ordenar', style: { display: 'inline-flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', color: '#6b7280', fontSize: 12 } },
          h('span', {}, 'Ordenar:'),
          ORDENS.map(o => {
            const ativo = ordem === o.id;
            return h('button', {
              key: o.id, type: 'button', onClick: () => setOrdem(o.id), 'aria-pressed': ativo, className: 'pf-chip',
              style: { height: 32, padding: '0 10px', borderRadius: 99, border: `1px solid ${ativo ? '#e9d5f9' : '#e5e7eb'}`, background: ativo ? '#faf7fd' : '#ffffff', color: ativo ? '#5d0b85' : '#374151', fontWeight: ativo ? 600 : 500, fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap' },
            }, o.label);
          }),
        ),
      ),

      // Faixa de resumo
      !loading && cards.length > 0 && h(PfFaixa, {
        rotulo: 'Resumo do período',
        itens: [
          {
            rotulo: 'No prazo (geral)',
            valor: pctGeral == null ? '—' : fmtPct(pctGeral),
            cor: pctGeral == null ? '#6b7280' : corPct(pctGeral).fg,
            sub: `${fmtNum(somaNo)} de ${fmtNum(somaAnalisadas)} entregas analisadas`,
          },
          { rotulo: 'Fora do prazo', valor: fmtNum(somaFora), cor: '#991b1b', sub: `${fmtNum(somaSem)} entregas sem dados` },
          {
            rotulo: `Abaixo da meta (${PF_META}%)`,
            valor: fmtNum(abaixo.length), complemento: `de ${fmtNum(comDados.length)}`,
            sub: criticos.length > 0 ? `${criticos.length} crítico${criticos.length === 1 ? '' : 's'} abaixo de ${PF_CRIT}%` : `nenhum crítico abaixo de ${PF_CRIT}%`,
          },
          {
            rotulo: 'Sem dados no período',
            valor: fmtNum(semDadosCards.length), cor: '#6b7280',
            sub: semDadosCards.length === 1 ? semDadosCards[0].nome_display : (semDadosCards.length > 1 ? 'escopos sem entregas analisadas' : 'todos os escopos com dados'),
          },
        ],
      }),

      // Cards
      loading
        ? h('div', { style: { textAlign: 'center', padding: '40px 0', color: '#6b7280', fontSize: 13 } }, 'Carregando...')
        : cards.length === 0
          ? h(PfVazio, {
              titulo: 'Nenhum escopo configurado',
              texto: 'Adicione um cliente ou herde uma região do BI na aba Configurações.',
              acao: setPerfTab ? h(PfBotao, { onClick: () => setPerfTab('config'), variante: 'principal', icone: 'settings' }, 'Configurar escopos') : null,
            })
          : h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 } },
              ...ordenados.map(({ card, idx }) => h(ClienteCard, { key: (card.config && card.config.id) || idx, card, onClick: () => setDetalhe(card) })),
            ),
    );
  }

  // ════════════════════════════════════════════════════════════
  // ABA: Busca (consulta ad-hoc por cliente/região + período)
  // ════════════════════════════════════════════════════════════
  function TabBusca({ API_URL, fetchAuth, showToast }) {
    const [modo, setModo] = useState('cliente'); // 'cliente' | 'regiao'
    const [clientes, setClientes] = useState([]);
    const [regioes, setRegioes] = useState([]);
    const [centrosCusto, setCentrosCusto] = useState([]);
    const [filtros, setFiltros] = useState({ codCliente: '', centroCusto: '', regiaoId: '', inicio: hoje(), fim: hoje() });
    const [buscaCliente, setBuscaCliente] = useState('');
    const [dropAberto, setDropAberto] = useState(false);
    const [resultado, setResultado] = useState(null);
    const [loading, setLoading] = useState(false);
    const dropRef = useRef(null);

    useEffect(() => {
      (async () => {
        try {
          const r = await fetchAuth(`${API_URL}/bi/clientes-por-regiao`);
          const d = await r.json();
          if (Array.isArray(d)) setClientes(d);
        } catch (e) {}
        try {
          const r = await fetchAuth(`${API_URL}/performance/regioes`);
          const d = await r.json();
          setRegioes(d.regioes || []);
        } catch (e) {}
      })();
    }, [API_URL, fetchAuth]);

    useEffect(() => {
      if (!filtros.codCliente) { setCentrosCusto([]); return; }
      (async () => {
        try {
          const r = await fetchAuth(`${API_URL}/bi/centros-custo/${filtros.codCliente}`);
          const d = await r.json();
          setCentrosCusto(Array.isArray(d) ? d : []);
        } catch (e) { setCentrosCusto([]); }
      })();
    }, [filtros.codCliente, API_URL, fetchAuth]);

    useEffect(() => {
      const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropAberto(false); };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, []);

    const clientesFiltrados = buscaCliente.length > 0
      ? clientes.filter(c => String(c.cod_cliente).includes(buscaCliente) || (c.nome_display || '').toLowerCase().includes(buscaCliente.toLowerCase()))
      : clientes;
    const clienteSel = clientes.find(c => String(c.cod_cliente) === String(filtros.codCliente));

    const buscar = async () => {
      const qs = new URLSearchParams({ data_inicio: filtros.inicio, data_fim: filtros.fim });
      let titulo = '';
      let tipo = modo;
      if (modo === 'regiao') {
        if (!filtros.regiaoId) { showToast('Selecione uma região', 'error'); return; }
        qs.set('regiao_id', filtros.regiaoId);
        titulo = (regioes.find(r => String(r.id) === String(filtros.regiaoId)) || {}).nome || 'Região';
      } else {
        if (!filtros.codCliente) { showToast('Selecione um cliente', 'error'); return; }
        qs.set('cod_cliente', filtros.codCliente);
        if (filtros.centroCusto) qs.set('centro_custo', filtros.centroCusto);
        titulo = clienteSel?.nome_display || `Cliente ${filtros.codCliente}`;
      }
      setLoading(true);
      try {
        const r = await fetchAuth(`${API_URL}/performance/detalhe?${qs.toString()}`);
        const d = await r.json();
        // Monta um "card" compatível com DetalheCliente calculando o snapshot a partir dos registros
        const regs = dedupPontos(d.registros || []);
        const total = regs.length;
        const no = regs.filter(x => x.dentro_prazo === true).length;
        const fora = regs.filter(x => x.dentro_prazo === false).length;
        const sem = regs.filter(x => x.dentro_prazo == null).length;
        const analisados = total - sem;
        const pct = analisados > 0 ? parseFloat(((no / analisados) * 100).toFixed(2)) : 0;
        setResultado({
          titulo: d.titulo || titulo,
          registros: regs,
          por_cliente: d.por_cliente || [],
          tipo,
          qtd_itens: modo === 'regiao' ? ((regioes.find(r => String(r.id) === String(filtros.regiaoId)) || {}).qtd_itens || 0) : 1,
          centro_custo: filtros.centroCusto || null,
          snapshot: { total_os: total, no_prazo: no, fora_prazo: fora, sem_dados: sem, pct_no_prazo: pct },
        });
      } catch (e) { showToast('Erro na busca', 'error'); }
      setLoading(false);
    };

    // Reusa a renderização de detalhe (mas com dados já em memória)
    if (resultado) {
      return h(PfDetalheView, {
        titulo: resultado.titulo, card: resultado,
        periodo: { inicio: filtros.inicio, fim: filtros.fim },
        registros: resultado.registros, porCliente: resultado.por_cliente,
        loading: false, onVoltar: () => setResultado(null), voltarLabel: 'Nova busca',
      });
    }

    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 18 } },
      h(PfCabecalho, {
        titulo: 'Busca',
        sub: 'Consulta o prazo de entrega de um cliente ou região em qualquer período, direto da base do BI',
      }),
      h('section', { 'aria-label': 'Filtros da busca', style: pfCard({ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }) },
        h(PfSegmentado, {
          rotulo: 'Tipo de busca', valor: modo, onChange: setModo,
          opcoes: [{ id: 'cliente', label: 'Por cliente' }, { id: 'regiao', label: 'Por região' }],
        }),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' } },
          modo === 'cliente'
            ? h('div', { ref: dropRef, style: { flex: '2 1 280px', minWidth: 0, position: 'relative' } },
                h(PfCampo, { rotulo: 'Cliente', htmlFor: 'pf-b-cli', flex: '1 1 auto' },
                  h('div', { style: { position: 'relative' } },
                    h('span', { style: { position: 'absolute', left: 10, top: 0, bottom: 0, display: 'flex', alignItems: 'center', color: '#9ca3af', pointerEvents: 'none' } }, pfIco('search', 15)),
                    h('input', { id: 'pf-b-cli', type: 'text', placeholder: 'Código ou nome do cliente', autoComplete: 'off',
                      value: dropAberto ? buscaCliente : (clienteSel ? `${clienteSel.cod_cliente} — ${clienteSel.nome_display}` : buscaCliente),
                      onFocus: () => { setDropAberto(true); setBuscaCliente(''); },
                      onChange: e => { setBuscaCliente(e.target.value); setDropAberto(true); },
                      className: 'pf-in', style: { paddingLeft: 32 },
                    }),
                  ),
                ),
                dropAberto && h('div', { className: 'shadow-lg', style: { position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 10, maxHeight: 256, overflowY: 'auto', zIndex: 50 } },
                  clientesFiltrados.length === 0 && h('div', { style: { padding: '10px 14px', fontSize: 13, color: '#6b7280' } }, 'Nenhum cliente encontrado'),
                  clientesFiltrados.slice(0, 50).map(c =>
                    h('div', { key: c.cod_cliente, onClick: () => { setFiltros(f => ({ ...f, codCliente: String(c.cod_cliente), centroCusto: '' })); setBuscaCliente(''); setDropAberto(false); },
                      className: 'pf-row', style: { padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, borderTop: '1px solid #f3f4f6' } },
                      h('span', { style: { fontSize: 12, color: '#6b7280', fontVariantNumeric: 'tabular-nums', minWidth: 44 } }, c.cod_cliente),
                      h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#111827' } }, c.nome_display),
                    ),
                  ),
                ),
              )
            : h(PfCampo, { rotulo: 'Região (do BI)', htmlFor: 'pf-b-reg', flex: '2 1 280px' },
                h('select', { id: 'pf-b-reg', value: filtros.regiaoId, onChange: e => setFiltros(f => ({ ...f, regiaoId: e.target.value })), className: 'pf-in' },
                  h('option', { value: '' }, 'Selecione...'),
                  ...regioes.map(r => h('option', { key: r.id, value: r.id }, `${r.nome} (${r.qtd_itens})`)),
                ),
              ),

          modo === 'cliente' && filtros.codCliente && h(PfCampo, { rotulo: 'Centro de custo', htmlFor: 'pf-b-cc', flex: '1 1 200px' },
            h('select', { id: 'pf-b-cc', value: filtros.centroCusto, onChange: e => setFiltros(f => ({ ...f, centroCusto: e.target.value })), className: 'pf-in' },
              h('option', { value: '' }, 'Todos'),
              ...centrosCusto.map((cc, i) => h('option', { key: i, value: cc.centro_custo }, cc.centro_custo)),
            ),
          ),

          h(PfCampo, { rotulo: 'De', htmlFor: 'pf-b-de', flex: '1 1 140px' },
            h('input', { id: 'pf-b-de', type: 'date', value: filtros.inicio, onChange: e => setFiltros(f => ({ ...f, inicio: e.target.value })), className: 'pf-in' })),
          h(PfCampo, { rotulo: 'Até', htmlFor: 'pf-b-ate', flex: '1 1 140px' },
            h('input', { id: 'pf-b-ate', type: 'date', value: filtros.fim, onChange: e => setFiltros(f => ({ ...f, fim: e.target.value })), className: 'pf-in' })),
          h(PfBotao, { onClick: buscar, disabled: loading, ocupado: loading, variante: 'principal', icone: 'search' }, loading ? 'Buscando...' : 'Buscar'),
        ),
      ),
      h(PfVazio, {
        titulo: 'Escolha o que consultar',
        texto: 'Selecione um cliente ou uma região e o período, depois clique em Buscar. O SLA vem direto da base do BI (bi_entregas), com a mesma regra de prazo por faixa configurada no BI.',
      }),
    );
  }

  // ════════════════════════════════════════════════════════════
  // ABA: Configurações (cadastro de escopo: cliente OU região)
  // ════════════════════════════════════════════════════════════
  function TabConfig({ API_URL, fetchAuth, showToast }) {
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modo, setModo] = useState('cliente'); // 'cliente' | 'regiao'
    const [clientes, setClientes] = useState([]);
    const [regioes, setRegioes] = useState([]);
    const [centrosCusto, setCentrosCusto] = useState([]);
    const [form, setForm] = useState({ codCliente: '', centroCusto: '', regiaoId: '' });
    const [buscaCliente, setBuscaCliente] = useState('');
    const [dropAberto, setDropAberto] = useState(false);
    const dropRef = useRef(null);

    const carregar = useCallback(async () => {
      setLoading(true);
      try {
        const r = await fetchAuth(`${API_URL}/performance/config`);
        const d = await r.json();
        setConfigs(d.configs || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    }, [API_URL, fetchAuth]);

    useEffect(() => { carregar(); }, [carregar]);

    useEffect(() => {
      (async () => {
        try {
          const r = await fetchAuth(`${API_URL}/bi/clientes-por-regiao`);
          const d = await r.json();
          if (Array.isArray(d)) setClientes(d);
        } catch (e) {}
        try {
          const r = await fetchAuth(`${API_URL}/performance/regioes`);
          const d = await r.json();
          setRegioes(d.regioes || []);
        } catch (e) {}
      })();
    }, [API_URL, fetchAuth]);

    useEffect(() => {
      if (!form.codCliente) { setCentrosCusto([]); return; }
      (async () => {
        try {
          const r = await fetchAuth(`${API_URL}/bi/centros-custo/${form.codCliente}`);
          const d = await r.json();
          setCentrosCusto(Array.isArray(d) ? d : []);
        } catch (e) { setCentrosCusto([]); }
      })();
    }, [form.codCliente, API_URL, fetchAuth]);

    useEffect(() => {
      const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropAberto(false); };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, []);

    const clientesFiltrados = buscaCliente.length > 0
      ? clientes.filter(c => String(c.cod_cliente).includes(buscaCliente) || (c.nome_display || '').toLowerCase().includes(buscaCliente.toLowerCase()))
      : clientes;
    const clienteSel = clientes.find(c => String(c.cod_cliente) === String(form.codCliente));

    const adicionar = async () => {
      try {
        let body;
        if (modo === 'regiao') {
          if (!form.regiaoId) { showToast('Selecione uma região', 'error'); return; }
          body = { tipo: 'regiao', regiao_id: parseInt(form.regiaoId, 10) };
        } else {
          if (!form.codCliente) { showToast('Selecione um cliente', 'error'); return; }
          body = { tipo: 'cliente', cod_cliente: parseInt(form.codCliente, 10), centro_custo: form.centroCusto || null, nome_display: clienteSel?.nome_display || null };
        }
        const r = await fetchAuth(`${API_URL}/performance/config`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
        const d = await r.json();
        if (d.success) { showToast('Adicionado!', 'success'); setForm({ codCliente: '', centroCusto: '', regiaoId: '' }); setBuscaCliente(''); carregar(); }
        else showToast(d.error || 'Erro', 'error');
      } catch (e) { showToast('Erro de conexão', 'error'); }
    };

    const remover = async (id) => {
      try {
        await fetchAuth(`${API_URL}/performance/config/${id}`, { method: 'DELETE' });
        showToast('Removido', 'success');
        carregar();
      } catch (e) { showToast('Erro', 'error'); }
    };

    const nRegioes = configs.filter(c => c.tipo === 'regiao').length;

    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 18 } },
      h(PfCabecalho, {
        titulo: 'Configurações',
        sub: loading ? 'Escopos que aparecem no Dashboard' : `${configs.length} escopo${configs.length === 1 ? '' : 's'} monitorado${configs.length === 1 ? '' : 's'} · ${configs.length - nRegioes} cliente${configs.length - nRegioes === 1 ? '' : 's'} · ${nRegioes} região${nRegioes === 1 ? '' : 'ões'}`,
      }),

      // Adicionar
      h('section', { style: pfCard({ padding: '16px 16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }) },
        h('div', {},
          h('h2', { style: { margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' } }, 'Adicionar escopo ao monitoramento'),
          h('p', { style: { margin: '4px 0 0', fontSize: 12.5, color: '#6b7280' } },
            modo === 'regiao'
              ? 'A região é herdada do BI. Se você editar os clientes/CC dela lá, o Performance acompanha automaticamente.'
              : 'Monitore um cliente inteiro ou só um centro de custo.'),
        ),
        h(PfSegmentado, {
          rotulo: 'Tipo de escopo', valor: modo,
          onChange: (m) => { setModo(m); setForm({ codCliente: '', centroCusto: '', regiaoId: '' }); },
          opcoes: [{ id: 'cliente', label: 'Cliente avulso' }, { id: 'regiao', label: 'Herdar região do BI' }],
        }),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' } },
          modo === 'cliente'
            ? [
                h('div', { key: 'cli', ref: dropRef, style: { flex: '2 1 280px', minWidth: 0, position: 'relative' } },
                  h(PfCampo, { rotulo: 'Cliente', htmlFor: 'pf-c-cli', flex: '1 1 auto' },
                    h('div', { style: { position: 'relative' } },
                      h('span', { style: { position: 'absolute', left: 10, top: 0, bottom: 0, display: 'flex', alignItems: 'center', color: '#9ca3af', pointerEvents: 'none' } }, pfIco('search', 15)),
                      h('input', { id: 'pf-c-cli', type: 'text', placeholder: 'Código ou nome do cliente', autoComplete: 'off',
                        value: dropAberto ? buscaCliente : (clienteSel ? `${clienteSel.cod_cliente} — ${clienteSel.nome_display}` : buscaCliente),
                        onFocus: () => { setDropAberto(true); setBuscaCliente(''); },
                        onChange: e => { setBuscaCliente(e.target.value); setDropAberto(true); },
                        className: 'pf-in', style: { paddingLeft: 32, paddingRight: 32 },
                      }),
                      form.codCliente && h('button', { type: 'button', 'aria-label': 'Limpar cliente', title: 'Limpar cliente', onClick: () => { setForm(f => ({ ...f, codCliente: '', centroCusto: '' })); setBuscaCliente(''); },
                        className: 'pf-btn', style: { position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', border: 0, background: 'transparent', color: '#6b7280', cursor: 'pointer', padding: 4, display: 'flex' } },
                        pfIco('x', 15)),
                    ),
                  ),
                  dropAberto && h('div', { className: 'shadow-lg', style: { position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 10, maxHeight: 256, overflowY: 'auto', zIndex: 50 } },
                    clientesFiltrados.length === 0 && h('div', { style: { padding: '10px 14px', fontSize: 13, color: '#6b7280' } }, 'Nenhum cliente encontrado'),
                    clientesFiltrados.slice(0, 50).map(c =>
                      h('div', { key: c.cod_cliente, onClick: () => { setForm(f => ({ ...f, codCliente: String(c.cod_cliente), centroCusto: '' })); setBuscaCliente(''); setDropAberto(false); },
                        className: 'pf-row', style: { padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, borderTop: '1px solid #f3f4f6' } },
                        h('span', { style: { fontSize: 12, color: '#6b7280', fontVariantNumeric: 'tabular-nums', minWidth: 44 } }, c.cod_cliente),
                        h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#111827' } }, c.nome_display),
                      ),
                    ),
                  ),
                ),
                form.codCliente && h(PfCampo, { key: 'cc', rotulo: 'Centro de custo', htmlFor: 'pf-c-cc', flex: '1 1 200px' },
                  h('select', { id: 'pf-c-cc', value: form.centroCusto, onChange: e => setForm(f => ({ ...f, centroCusto: e.target.value })), className: 'pf-in' },
                    h('option', { value: '' }, 'Todos'),
                    ...centrosCusto.map((cc, i) => h('option', { key: i, value: cc.centro_custo }, cc.centro_custo)),
                  ),
                ),
              ]
            : h(PfCampo, { rotulo: 'Região (do BI)', htmlFor: 'pf-c-reg', flex: '2 1 300px' },
                h('select', { id: 'pf-c-reg', value: form.regiaoId, onChange: e => setForm(f => ({ ...f, regiaoId: e.target.value })), className: 'pf-in' },
                  h('option', { value: '' }, 'Selecione uma região...'),
                  ...regioes.map(r => h('option', { key: r.id, value: r.id }, `${r.nome} — ${r.qtd_itens} cliente(s)/CC`)),
                ),
              ),

          h(PfBotao, { onClick: adicionar, variante: 'principal', icone: 'plus' }, 'Adicionar escopo'),
        ),
      ),

      // Lista
      h('section', { style: pfCard({ overflow: 'hidden' }) },
        h('div', { style: { padding: '14px 16px', display: 'flex', alignItems: 'baseline', gap: 8 } },
          h('h2', { style: { margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' } }, 'Escopos monitorados'),
          !loading && h('span', { style: { fontSize: 12.5, color: '#6b7280', fontVariantNumeric: 'tabular-nums' } }, configs.length),
        ),
        loading
          ? h('div', { style: { textAlign: 'center', padding: '32px 0', color: '#6b7280', fontSize: 13, borderTop: '1px solid #f3f4f6' } }, 'Carregando...')
          : configs.length === 0
            ? h('div', { style: { textAlign: 'center', padding: '32px 16px', color: '#6b7280', fontSize: 13, borderTop: '1px solid #f3f4f6' } }, 'Nenhum escopo cadastrado ainda. Adicione um cliente ou região acima.')
            : h('div', { style: { overflowX: 'auto' } },
                h('table', { style: { width: '100%', borderCollapse: 'collapse' } },
                  h('thead', {}, h('tr', {},
                    pfTh('Tipo', false, { paddingLeft: 16, position: 'static' }),
                    pfTh('Nome', false, { position: 'static' }),
                    pfTh('Abrangência', false, { position: 'static' }),
                    pfTh(h('span', { className: 'sr-only' }, 'Ações'), true, { paddingRight: 16, position: 'relative' }),
                  )),
                  h('tbody', {},
                    ...configs.map(cfg => h('tr', { key: cfg.id, className: 'pf-row', style: { borderTop: '1px solid #f3f4f6' } },
                      pfTd(cfg.tipo === 'regiao' ? h(PfPilulaRegiao) : h(PfPilula, { tom: 'cinza', semPonto: true }, 'Cliente'), false, { paddingLeft: 16, width: 1 }),
                      pfTd(cfg.nome_display, false, { fontWeight: 600, whiteSpace: 'normal', minWidth: 160 }),
                      pfTd(cfg.tipo === 'regiao' ? `${cfg.qtd_itens} cliente(s)/CC` : (cfg.centro_custo ? cfg.centro_custo : 'Todos os centros'), false, { color: '#6b7280' }),
                      pfTd(h('button', {
                        type: 'button', onClick: () => remover(cfg.id), className: 'pf-btn pf-btn-sec',
                        'aria-label': `Remover ${cfg.nome_display}`, title: 'Remover do monitoramento',
                        style: { width: 32, height: 32, borderRadius: 8, border: '1px solid #fecaca', background: '#ffffff', color: '#991b1b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
                      }, pfIco('trash', 15)), true, { paddingRight: 16, width: 1 }),
                    )),
                  ),
                ),
              ),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════
  // ABA: Importações (status/força do import BI)
  // ════════════════════════════════════════════════════════════
  function TabJobs({ API_URL, fetchAuth, showToast }) {
    const [ultima, setUltima] = useState(null);
    const [importId, setImportId] = useState(null);
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const pollingRef = useRef(null);

    const carregar = useCallback(async () => {
      try {
        const r = await fetchAuth(`${API_URL}/performance/ultima-importacao`);
        const d = await r.json();
        setUltima(d.ultima || null);
      } catch (e) {}
      setLoading(false);
    }, [API_URL, fetchAuth]);

    useEffect(() => { carregar(); }, [carregar]);

    useEffect(() => {
      if (!importId) { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } return; }
      if (pollingRef.current) return;
      pollingRef.current = setInterval(async () => {
        try {
          const r = await fetchAuth(`${API_URL}/performance/import-status/${importId}`);
          const d = await r.json();
          if (d.import) {
            setStatus(d.import);
            if (d.import.status === 'sucesso' || d.import.status === 'falhou') {
              clearInterval(pollingRef.current); pollingRef.current = null;
              setImportId(null);
              if (d.import.status === 'sucesso') { showToast('Importação concluída', 'success'); carregar(); }
              else showToast(`Falhou: ${(d.import.erro || '').slice(0, 120)}`, 'error');
            }
          }
        } catch (e) {}
      }, 5000);
      return () => { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } };
    }, [importId, API_URL, fetchAuth, carregar, showToast]);

    useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

    const forcar = async () => {
      try {
        showToast('Enfileirando importação...', 'info');
        const r = await fetchAuth(`${API_URL}/performance/forcar-import`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
        const d = await r.json();
        if (d.import_id) { setImportId(d.import_id); setStatus({ status: d.status, data_referencia: d.data_referencia }); }
        else showToast(d.error || 'Erro', 'error');
      } catch (e) { showToast('Erro de conexão', 'error'); }
    };

    const importando = !!importId;
    const prog = status && status.progresso != null ? Math.max(0, Math.min(100, Number(status.progresso) || 0)) : null;

    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 18 } },
      h(PfCabecalho, {
        titulo: 'Importações',
        sub: 'Base do BI (bi_entregas) · importação automática diária às 12h',
        acoes: h(PfBotao, { onClick: forcar, disabled: importando, ocupado: importando, variante: 'principal', icone: 'download', title: 'Puxa a planilha do sistema externo e alimenta o BI' },
          importando ? 'Importando...' : 'Forçar importação agora'),
      }),

      // Status do import em andamento
      importando && status && h('section', { 'aria-live': 'polite', style: pfCard({ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }) },
        h('div', { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 } },
          h(PfPilula, { tom: 'azul' }, 'Importando'),
          h('span', { style: { fontSize: 13, color: '#374151' } }, `${status.etapa_atual || status.status || 'processando'}${status.progresso ? ` · ${status.progresso}%` : ''}`),
          status.data_referencia && h('span', { style: { fontSize: 12, color: '#6b7280' } }, `· referência ${fmtData(String(status.data_referencia))}`),
        ),
        prog != null && h('div', { 'aria-hidden': 'true', style: { height: 6, borderRadius: 99, background: '#f3f4f6', overflow: 'hidden' } },
          h('div', { style: { width: `${prog}%`, height: '100%', background: '#770fa8' } })),
      ),

      // Última importação
      loading
        ? h('div', { style: { textAlign: 'center', padding: '32px 0', color: '#6b7280', fontSize: 13 } }, 'Carregando...')
        : ultima
          ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              h('h2', { style: { margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' } }, 'Última importação concluída'),
              h(PfFaixa, {
                rotulo: 'Última importação concluída',
                itens: [
                  { rotulo: 'Data de referência', valor: fmtData(ultima.data_referencia ? String(ultima.data_referencia) : null) },
                  { rotulo: 'Importada em', valor: fmtDT(ultima.finalizado_em) },
                  { rotulo: 'Linhas inseridas', valor: ultima.linhas_inseridas != null ? fmtNum(ultima.linhas_inseridas) : '—' },
                ],
              }),
            )
          : h(PfVazio, { titulo: 'Nenhuma importação concluída ainda', texto: 'Use "Forçar importação agora" para puxar a base do dia.' }),

      // Como funciona
      h('section', { style: pfCard({ padding: '14px 16px' }) },
        h('h2', { style: { margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' } }, 'Como funciona'),
        h('p', { style: { margin: '6px 0 0', fontSize: 13, color: '#6b7280', lineHeight: 1.55 } },
          'O Performance Diária reflete a base do BI (bi_entregas). A base é importada automaticamente às 12h. Use "Forçar importação agora" para importar imediatamente (puxa a planilha do sistema externo e alimenta o BI).'),
      ),
      h('style', {}, `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`),
    );
  }

  // ════════════════════════════════════════════════════════════
  // COMPONENTE PRINCIPAL
  // ════════════════════════════════════════════════════════════
  function ModuloPerformanceDiaria({ initialProps }) {
    const { API_URL, fetchAuth, showToast, perfTab, setPerfTab } = initialProps;
    const aba = perfTab || 'dashboard';

    // PERF_CLEAN_V1: sem padding extra — o wrapper do app.js (max-w-7xl p-4 md:p-6) já posiciona o conteúdo
    return h('div', { style: { color: '#111827', fontSize: 13 } },
      h('style', {}, PF_CSS),
      aba === 'dashboard' && h(TabDashboard, { API_URL, fetchAuth, showToast, setPerfTab }),
      aba === 'busca' && h(TabBusca, { API_URL, fetchAuth, showToast }),
      aba === 'config' && h(TabConfig, { API_URL, fetchAuth, showToast }),
      aba === 'jobs' && h(TabJobs, { API_URL, fetchAuth, showToast }),
    );
  }

  // ════════════════════════════════════════════════════════════
  // EXPORT
  // ════════════════════════════════════════════════════════════
  window.ModuloPerformanceComponent = function ModuloPerformanceWrapper(props) {
    const containerRef = useRef(null);
    const propsRef = useRef(props);

    useEffect(() => { propsRef.current = props; });

    useEffect(() => {
      if (!containerRef.current) return;
      ReactDOM.render(h(ModuloPerformanceDiaria, { initialProps: props }), containerRef.current);
    }, [props.perfTab]);

    useEffect(() => {
      if (!containerRef.current) return;
      ReactDOM.render(h(ModuloPerformanceDiaria, { initialProps: props }), containerRef.current);
      return () => { if (containerRef.current) ReactDOM.unmountComponentAtNode(containerRef.current); };
    }, []);

    return h('div', { ref: containerRef });
  };

  console.log('✅ Módulo Performance Diária v3.0 (derivado do BI) carregado');
})();
