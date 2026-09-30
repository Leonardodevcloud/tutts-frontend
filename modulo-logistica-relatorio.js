/**
 * modulo-logistica-relatorio.js — HUB_REL_V2 (v2.1)
 * ─────────────────────────────────────────────────────────────────────────
 * Relatório de corridas do Hub, versão 2 (substitui TabRelatorio de modulo-logistica.js):
 *   • barra de filtros em chips (cada chip abre só a sua lista) + linha "ativos"
 *   • gaveta lateral larga (2 colunas) com todos os filtros e colunas
 *   • três visões do MESMO filtro: Corridas · Por faixa de km · Por cliente
 *   • faixas de km configuráveis (tamanho, teto, métricas, quebra por provedor/cliente)
 *   • presets (salvos no backend, compartilhados) e exportação CSV / PDF
 *   • PDF com escolha de campos e modelo "Para o cliente" (esconde Mapp/Hub/custo/margem)
 *
 * Dados: GET /admin/relatorio/hub-corridas?de&ate (uma linha por tentativa; o backend já
 * manda tentativa/tentativas_os, tempo_atendimento_min, no_prazo, prazo_min).
 * Só o PERÍODO vai pro servidor — o resto filtra na tela (CSV/PDF saem do que está renderizado).
 *
 * Expõe window.ModuloLogisticaRelatorio.
 */
(function () {
  'use strict';
  const h = React.createElement;
  const { useState, useEffect, useMemo, useCallback, useRef } = React;

  // ── helpers ──
  const TZ = 'America/Sao_Paulo';
  const dataLocalBRT = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ });
  const brl = (n) => n == null || isNaN(Number(n)) ? '—' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const brlS = (n) => n == null ? '—' : 'R$ ' + brl(n);
  const kmF = (n) => n == null ? '—' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const nb = (n) => n == null ? '' : Number(n).toFixed(2).replace('.', ',');
  const fmtMin = (m) => { const v = parseFloat(m); if (m == null || isNaN(v)) return '—'; const r = Math.round(v); return r < 60 ? r + ' min' : Math.floor(r / 60) + 'h' + (r % 60 ? ' ' + String(r % 60).padStart(2, '0') : ''); };
  const pctF = (v, d = 0) => v == null || isNaN(v) ? '—' : v.toFixed(d) + '%';
  const fmtDia = (s) => s ? s.slice(8, 10) + '/' + s.slice(5, 7) : '';
  const fmtDataBR = (s) => s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : '';
  const media = (arr) => { const v = arr.filter(x => x != null && !isNaN(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const mediana = (arr) => { const v = arr.filter(x => x != null && !isNaN(x)).sort((a, b) => a - b); if (!v.length) return null; const m = Math.floor(v.length / 2); return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
  const VAZIO = '__sem__';
  const STATUS_FATURAVEIS = ['Entregue', 'Devolvido'];
  const STATUS_GRUPOS = [
    { id: 'Entregue', rot: 'Entregue', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    { id: 'Devolvido', rot: 'Devolvido', cls: 'border-amber-200 bg-amber-50 text-amber-700' },
    { id: '__andamento', rot: 'Em andamento', sub: ['Aguardando', 'Procurando entregador', 'Entregador a caminho', 'A caminho da coleta', 'Na coleta', 'Coletou', 'Em rota', 'Na entrega', 'Em devolução'], cls: 'border-blue-200 bg-blue-50 text-blue-700' },
    { id: 'Cancelado', rot: 'Cancelado', cls: 'border-gray-200 bg-gray-50 text-gray-600' },
    { id: 'Não entregue', rot: 'Não entregue', cls: 'border-orange-200 bg-orange-50 text-orange-700' },
  ];
  const PROV = { noventanove: { nome: '99Entrega', cor: '#7c3aed' }, '99': { nome: '99Entrega', cor: '#7c3aed' }, uber: { nome: 'Uber Direct', cor: '#f5921e' }, proprio: { nome: 'Moto própria', cor: '#15a05a' } };
  const provNome = (p) => (PROV[String(p || '').toLowerCase()] || {}).nome || (p || 'Sem provedor');
  const provCor = (p) => (PROV[String(p || '').toLowerCase()] || {}).cor || '#64748b';
  const canalNome = (c) => c === 'tutts' ? 'Tutts' : c === 'Moto própria' ? 'Moto própria' : 'Hub';
  const Ico = (nome, sz) => h('svg', { className: 'ico', style: sz ? { width: sz, height: sz } : null, 'aria-hidden': 'true' }, h('use', { href: '#i-' + nome }));

  // ── campos "internos" (somem no modelo "Para o cliente") ──
  const KPIS = [
    { id: 'corridas', rot: 'Corridas' }, { id: 'km', rot: 'KM total' }, { id: 'tempo', rot: 'Tempo médio de atendimento' }, { id: 'prazo', rot: '% no prazo' }, { id: 'entregues', rot: 'Entregues' },
    { id: 'mapp', rot: 'Valor Mapp', interno: true }, { id: 'hub', rot: 'Valor do Hub (regra)', interno: true }, { id: 'custo', rot: 'Custo provedor', interno: true }, { id: 'margem', rot: 'Margem', interno: true },
  ];
  const GRAFICOS = [
    { id: 'tempo_faixa', rot: 'Tempo por faixa de km' }, { id: 'corridas_dia', rot: 'Corridas por dia' }, { id: 'prazo_dia', rot: '% no prazo por dia' }, { id: 'margem_dia', rot: 'Margem por dia', interno: true },
  ];
  const METRICAS_FAIXA = [
    { id: 'corridas', rot: 'Corridas' }, { id: 'tempo', rot: 'Tempo médio de atendimento' }, { id: 'mediana', rot: 'Mediana' }, { id: 'prazo', rot: '% no prazo' },
    { id: 'loc', rot: 'Localização' }, { id: 'col', rot: 'Coleta' }, { id: 'ent', rot: 'Entrega' },
    { id: 'hub', rot: 'Valor Hub médio', interno: true }, { id: 'custo', rot: 'Custo médio', interno: true }, { id: 'margem', rot: 'Margem média', interno: true }, { id: 'rskm', rot: 'R$ por km', interno: true },
  ];

  // Prévia do PDF sem iframe: Shadow DOM isola o CSS do documento (o srcdoc do iframe
  // vinha em branco em produção). Mostra a página A4 paisagem em escala.
  function PreviewPdf({ html }) {
    const ref = useRef(null);
    useEffect(() => {
      const el = ref.current; if (!el) return;
      const root = el.shadowRoot || el.attachShadow({ mode: 'open' });
      const m = /<style>([\s\S]*?)<\/style>/i.exec(html); const b = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
      root.innerHTML = `<style>:host{display:block}${m ? m[1] : ''}.pagina{width:1122px;min-height:794px;box-sizing:border-box;padding:45px;background:#fff;box-shadow:0 10px 30px rgba(0,0,0,.15);border-radius:6px;transform-origin:top left}</style><div class="pagina">${b ? b[1] : html}</div>`;
    }, [html]);
    // escala pra caber na largura disponível (1122px = A4 paisagem em 96dpi)
    const [escala, setEscala] = useState(0.7);
    const wrap = useRef(null);
    useEffect(() => { const f = () => { if (wrap.current) setEscala(Math.min(1, (wrap.current.clientWidth - 8) / 1122)); }; f(); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
    // zoom (e não transform) pra altura do layout acompanhar a escala
    return h('div', { ref: wrap, className: 'w-full' }, h('div', { ref, style: { zoom: escala, width: 1122 } }));
  }

  // ═══════════════════════════════════════════════════════════════
  function TabRelatorioV2({ API_URL, fetchAuth, showToast }) {
    const toast = (m, t) => { if (typeof showToast === 'function') showToast(m, t || 'success'); };
    const hojeBRT = () => dataLocalBRT(new Date());
    const diasAtras = (n) => dataLocalBRT(new Date(Date.now() - n * 86400000));

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [periodo, setPeriodo] = useState('1d');
    const [deCustom, setDeCustom] = useState(diasAtras(29));
    const [ateCustom, setAteCustom] = useState(hojeBRT());
    // HUB_REL_V21: status nasce em FATURÁVEIS (Entregue + Devolvido) — o que aparece na tabela é o que soma. Sem toggle separado.
    const [f, setF] = useState({ clientes: null, provedores: null, status: new Set(STATUS_FATURAVEIS), canais: null, kmDe: '', kmAte: '', margemDe: '', margemAte: '', busca: '' });
    const [cols, setCols] = useState(() => new Set(['data', 'tentativa', 'cliente', 'enderecos', 'motoboy', 'status', 'km', 'valor', 'mapp', 'custo', 'liquido']));
    const [visao, setVisao] = useState('corridas'); // corridas | faixas | clientes
    const [faixas, setFaixas] = useState({ tamanho: 5, teto: 30, metricas: new Set(['corridas', 'tempo', 'mediana', 'prazo', 'hub', 'custo', 'margem']), quebrarPor: 'nada' });
    const [chipAberto, setChipAberto] = useState(null);
    const [gaveta, setGaveta] = useState(false);
    const [pdfAberto, setPdfAberto] = useState(false);
    const [pdfCfg, setPdfCfg] = useState({ modelo: 'cliente', cabecalho: new Set(['logo', 'cliente', 'periodo']), kpis: new Set(['corridas', 'entregues', 'km', 'tempo', 'prazo']), graficos: new Set(['tempo_faixa', 'corridas_dia']), tabela: true, colunas: new Set(['os', 'data', 'nota', 'entrega', 'status', 'km', 'tempo']), lembrar: true });
    const [pdfGerando, setPdfGerando] = useState(false);
    const [presets, setPresets] = useState([]);
    const [presetAtivo, setPresetAtivo] = useState(null);
    const barraRef = useRef(null);

    const range = periodo === 'custom' ? { de: deCustom, ate: ateCustom } : periodo === '1d' ? { de: hojeBRT(), ate: hojeBRT() } : periodo === '7d' ? { de: diasAtras(6), ate: hojeBRT() } : { de: diasAtras(29), ate: hojeBRT() };
    const de = range.de, ate = range.ate;

    // ── carga ──
    const carregar = useCallback(async () => {
      setLoading(true);
      try {
        const res = await fetchAuth(`${API_URL}/admin/relatorio/hub-corridas?de=${de}&ate=${ate}`);
        const json = await res.json();
        if (json.success) setRows(json.corridas || []); else toast(json.error || 'Erro ao carregar relatório', 'error');
      } catch (e) { toast('Erro de rede no relatório', 'error'); }
      finally { setLoading(false); }
    }, [fetchAuth, API_URL, de, ate]);
    useEffect(() => { carregar(); }, [carregar]);

    const carregarPresets = useCallback(async () => {
      try { const r = await fetchAuth(`${API_URL}/logistics/relatorio/presets`); const j = await r.json(); if (j.success) setPresets(j.presets || []); } catch (e) { /* silencioso */ }
    }, [fetchAuth, API_URL]);
    useEffect(() => { carregarPresets(); }, [carregarPresets]);

    // fecha popovers/gaveta no ESC e clique fora
    useEffect(() => {
      const esc = (ev) => { if (ev.key === 'Escape') { setChipAberto(null); setGaveta(false); setPdfAberto(false); } };
      const fora = (ev) => { if (barraRef.current && !barraRef.current.contains(ev.target)) setChipAberto(null); };
      document.addEventListener('keydown', esc); document.addEventListener('mousedown', fora);
      return () => { document.removeEventListener('keydown', esc); document.removeEventListener('mousedown', fora); };
    }, []);

    // ── opções (do período carregado) ──
    const ordPt = (a, b) => String(a).localeCompare(String(b), 'pt-BR');
    const opcoes = useMemo(() => {
      const de_ = (campo) => { const m = {}; rows.forEach(r => { const k = r[campo] || VAZIO; m[k] = (m[k] || 0) + 1; }); return Object.keys(m).sort((a, b) => a === VAZIO ? 1 : b === VAZIO ? -1 : ordPt(a, b)).map(k => ({ v: k, n: m[k] })); };
      return { clientes: de_('cliente_nome'), provedores: de_('provider'), canais: de_('canal'), status: de_('status') };
    }, [rows]);
    const disp = (chave) => (opcoes[chave] || []).map(o => o.v);
    const marcado = (chave, v) => f[chave] === null || f[chave].has(v);
    const alternar = (chave, v) => setF(prev => { const d = disp(chave); const base = prev[chave] === null ? new Set(d) : new Set(prev[chave]); if (base.has(v)) base.delete(v); else base.add(v); return { ...prev, [chave]: (base.size >= d.length && d.every(x => base.has(x))) ? null : base }; });
    const marcarTodos = (chave) => setF(prev => ({ ...prev, [chave]: null }));
    const marcarNenhum = (chave) => setF(prev => ({ ...prev, [chave]: new Set() }));
    const soEste = (chave, v) => setF(prev => ({ ...prev, [chave]: new Set([v]) }));
    // status por grupo (Em andamento agrupa várias etapas)
    const statusDoGrupo = (g) => g.sub ? g.sub.filter(s => disp('status').includes(s)) : [g.id];
    const grupoMarcado = (g) => { const ss = statusDoGrupo(g); return ss.length > 0 && ss.every(s => marcado('status', s)); };
    const contaStatus = (g) => rows.filter(r => statusDoGrupo(g).includes(r.status)).length;
    const alternarGrupo = (g) => setF(prev => { const d = disp('status'); const base = prev.status === null ? new Set(d) : new Set(prev.status); const ss = statusDoGrupo(g); const todos = ss.every(s => base.has(s)); ss.forEach(s => { if (todos) base.delete(s); else base.add(s); }); return { ...prev, status: (d.every(x => base.has(x))) ? null : base }; });
    const limparTudo = () => { setF({ clientes: null, provedores: null, status: new Set(STATUS_FATURAVEIS), canais: null, kmDe: '', kmAte: '', margemDe: '', margemAte: '', busca: '' }); setPresetAtivo(null); };
    const statusModo = f.status === null ? 'todas' : (f.status.size === STATUS_FATURAVEIS.length && STATUS_FATURAVEIS.every(x => f.status.has(x))) ? 'faturaveis' : 'escolha';
    const setStatusModo = (m) => setF(p => ({ ...p, status: m === 'todas' ? null : m === 'faturaveis' ? new Set(STATUS_FATURAVEIS) : (p.status || new Set(STATUS_FATURAVEIS)) }));

    const num = (v) => (v === '' || v == null || isNaN(parseFloat(v))) ? null : parseFloat(v);
    const passa = (chave, v) => f[chave] === null || f[chave].has(v || VAZIO);
    const rowsView = useMemo(() => {
      const q = f.busca.trim().toLowerCase();
      const kd = num(f.kmDe), ka = num(f.kmAte), md = num(f.margemDe), ma = num(f.margemAte);
      return rows.filter(r => {
        if (!passa('clientes', r.cliente_nome) || !passa('provedores', r.provider) || !passa('status', r.status) || !passa('canais', r.canal)) return false;
        if (kd != null && !(r.km != null && r.km >= kd)) return false;
        if (ka != null && !(r.km != null && r.km < ka)) return false;
        if (md != null && !(r.faturamento_liquido != null && r.faturamento_liquido >= md)) return false;
        if (ma != null && !(r.faturamento_liquido != null && r.faturamento_liquido <= ma)) return false;
        if (q && ![r.os, r.cliente_nome, r.motoboy, r.endereco_coleta, r.endereco_entrega, r.provider, r.nota_fiscal, r.cliente_final].some(v => String(v == null ? '' : v).toLowerCase().includes(q))) return false;
        return true;
      });
    }, [rows, f]);
    // HUB_REL_V21: o que está na tabela é o que soma — uma regra só.
    const linhasQueSomam = rowsView;

    const totais = useMemo(() => {
      const t = { corridas: 0, entregues: 0, km: 0, mapp: 0, semMapp: 0, hub: 0, custo: 0, margem: 0, tempos: [], noPrazo: 0, avaliadas: 0 };
      linhasQueSomam.forEach(c => {
        t.corridas++; if (c.status === 'Entregue') t.entregues++;
        if (c.km != null) t.km += c.km;
        if (c.valor_mapp != null) t.mapp += c.valor_mapp; else t.semMapp++;
        if (c.valor != null) t.hub += c.valor;
        if (c.custo_provedor != null) t.custo += c.custo_provedor;
        if (c.faturamento_liquido != null) t.margem += c.faturamento_liquido;
        if (c.tempo_atendimento_min != null) t.tempos.push(c.tempo_atendimento_min);
        if (c.no_prazo != null) { t.avaliadas++; if (c.no_prazo) t.noPrazo++; }
      });
      t.tempoMedio = media(t.tempos); t.tempoMediana = mediana(t.tempos);
      t.pctPrazo = t.avaliadas ? (t.noPrazo / t.avaliadas) * 100 : null;
      t.ticket = t.corridas ? t.margem / t.corridas : 0;
      return t;
    }, [linhasQueSomam]);

    const qtdFiltros = useMemo(() => { let n = 0; ['clientes', 'provedores', 'canais'].forEach(k => { if (f[k] !== null) n++; }); if (statusModo !== 'faturaveis') n++; if (num(f.kmDe) != null || num(f.kmAte) != null) n++; if (num(f.margemDe) != null || num(f.margemAte) != null) n++; if (f.busca.trim()) n++; return n; }, [f, statusModo]);

    // ── FAIXAS DE KM ──
    const faixasCalc = useMemo(() => {
      const tam = Math.max(1, Number(faixas.tamanho) || 5), teto = Math.max(tam, Number(faixas.teto) || 30);
      const chaveQuebra = (r) => faixas.quebrarPor === 'provedor' ? (r.provider || VAZIO) : faixas.quebrarPor === 'cliente' ? (r.cliente_nome || VAZIO) : '_';
      const buckets = {};
      const add = (b, r) => {
        b.n++; if (r.km != null) b.kms.push(r.km);
        if (r.tempo_atendimento_min != null) b.tempos.push(r.tempo_atendimento_min);
        if (r.tempo_localizacao_min != null) b.loc.push(r.tempo_localizacao_min);
        if (r.tempo_coleta_min != null) b.col.push(r.tempo_coleta_min);
        if (r.tempo_entrega_min != null) b.ent.push(r.tempo_entrega_min);
        if (r.no_prazo != null) { b.aval++; if (r.no_prazo) b.ok++; }
        if (r.valor != null) b.hubs.push(r.valor); if (r.custo_provedor != null) b.custos.push(r.custo_provedor); if (r.faturamento_liquido != null) b.margens.push(r.faturamento_liquido);
        if (r.valor != null && r.km) b.rskm.push(r.valor / r.km);
      };
      let semKm = 0;
      linhasQueSomam.forEach(r => {
        if (r.km == null) { semKm++; return; }
        const i = r.km >= teto ? -1 : Math.floor(r.km / tam);
        const ini = i < 0 ? teto : i * tam, fim = i < 0 ? null : Math.min(ini + tam, teto);
        const k = ini + '|' + chaveQuebra(r);
        if (!buckets[k]) buckets[k] = { ini, fim, quebra: chaveQuebra(r), n: 0, kms: [], tempos: [], loc: [], col: [], ent: [], aval: 0, ok: 0, hubs: [], custos: [], margens: [], rskm: [] };
        add(buckets[k], r);
      });
      const lista = Object.values(buckets).map(b => ({ ...b, rot: b.fim == null ? `${b.ini}+ km` : `${b.ini} – ${b.fim} km`, tempo: media(b.tempos), med: mediana(b.tempos), loc: media(b.loc), col: media(b.col), ent: media(b.ent), prazo: b.aval ? (b.ok / b.aval) * 100 : null, hub: media(b.hubs), custo: media(b.custos), margem: media(b.margens), rskm: media(b.rskm), kmMedio: media(b.kms) }))
        .sort((a, b) => a.ini - b.ini || ordPt(a.quebra, b.quebra));
      const total = linhasQueSomam.length - semKm;
      return { lista, semKm, total, maxN: Math.max(1, ...lista.map(b => b.n)) };
    }, [linhasQueSomam, faixas]);

    // ── POR CLIENTE ──
    const clientesCalc = useMemo(() => {
      const m = {};
      linhasQueSomam.forEach(r => { const k = r.cliente_nome || 'Sem cliente'; if (!m[k]) m[k] = { nome: k, n: 0, km: 0, hub: 0, custo: 0, margem: 0, tempos: [], aval: 0, ok: 0, cancel: 0 }; const b = m[k]; b.n++; if (r.km != null) b.km += r.km; if (r.valor != null) b.hub += r.valor; if (r.custo_provedor != null) b.custo += r.custo_provedor; if (r.faturamento_liquido != null) b.margem += r.faturamento_liquido; if (r.tempo_atendimento_min != null) b.tempos.push(r.tempo_atendimento_min); if (r.no_prazo != null) { b.aval++; if (r.no_prazo) b.ok++; } });
      // canceladas contam do rowsView (não somam nos faturáveis)
      rowsView.forEach(r => { if (r.status === 'Cancelado') { const k = r.cliente_nome || 'Sem cliente'; if (m[k]) m[k].cancel++; } });
      return Object.values(m).map(b => ({ ...b, tempo: media(b.tempos), prazo: b.aval ? (b.ok / b.aval) * 100 : null, ticket: b.n ? b.margem / b.n : 0 })).sort((a, b) => b.margem - a.margem);
    }, [linhasQueSomam, rowsView]);

    // ── por dia (gráficos do PDF) ──
    const porDia = useMemo(() => { const m = {}; linhasQueSomam.forEach(r => { const d = r.data ? dataLocalBRT(r.data) : null; if (!d) return; if (!m[d]) m[d] = { dia: d, n: 0, ent: 0, aval: 0, ok: 0, margem: 0 }; m[d].n++; if (r.status === 'Entregue') m[d].ent++; if (r.no_prazo != null) { m[d].aval++; if (r.no_prazo) m[d].ok++; } if (r.faturamento_liquido != null) m[d].margem += r.faturamento_liquido; }); return Object.values(m).sort((a, b) => a.dia.localeCompare(b.dia)); }, [linhasQueSomam]);

    // ── render helpers de célula ──
    const tutts = window.__ICONE_TUTTS_JPG || null;
    const iconeCanal = (canal) => (canal === 'Moto própria' || canal === 'proprio')
      ? h('span', { title: 'Moto própria', className: 'inline-flex items-center justify-center w-5 h-5 rounded-full shrink-0', style: { background: '#f3e8ff', border: '1px solid #d8b4fe', color: '#7c3aed' } }, Ico('bike', 13))
      : canal === 'tutts'
        ? h('span', { title: 'Tutts', className: 'inline-flex items-center justify-center w-5 h-5 rounded-full shrink-0 overflow-hidden text-white text-[9px] font-extrabold', style: { background: '#7c3aed' } }, tutts ? h('img', { src: tutts, alt: '', style: { width: '100%', height: '100%', objectFit: 'contain', padding: 2 } }) : 'T')
        : h('span', { title: 'Hub', className: 'inline-flex items-center justify-center w-5 h-5 rounded-full shrink-0', style: { background: '#fff7ed', border: '1px solid #fed7aa', color: '#f67602' } }, Ico('zap', 12));
    const statusBadge = (s) => { const cor = { 'Entregue': 'bg-green-100 text-green-700', 'Devolvido': 'bg-amber-100 text-amber-700', 'Em devolução': 'bg-amber-100 text-amber-700', 'Cancelado': 'bg-gray-100 text-gray-500', 'Não entregue': 'bg-orange-100 text-orange-700', 'Aguardando': 'bg-gray-100 text-gray-600', 'Procurando entregador': 'bg-purple-100 text-purple-700', 'Entregador a caminho': 'bg-indigo-100 text-indigo-700', 'A caminho da coleta': 'bg-amber-100 text-amber-700', 'Na coleta': 'bg-amber-100 text-amber-700', 'Coletou': 'bg-amber-200 text-amber-800', 'Em rota': 'bg-blue-100 text-blue-700', 'Na entrega': 'bg-orange-100 text-orange-700' }[s] || 'bg-gray-100 text-gray-600'; return h('span', { className: `px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${cor}` }, s || '—'); };
    const fmtDH = (iso, seg) => { if (!iso) return seg ? ['', ''] : '—'; try { const d = new Date(iso); const p = (n) => String(n).padStart(2, '0'); return seg ? [p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear(), p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())] : p(d.getDate()) + '/' + p(d.getMonth() + 1) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); } catch (_) { return seg ? ['', ''] : '—'; } };

    const COLS = [
      { id: 'os', rot: 'OS', fixa: true, tdCls: 'px-3 py-2 font-semibold text-gray-700', cel: r => r.os, csv: r => r.os, pdf: r => r.os },
      { id: 'data', rot: 'Data/Hora', tdCls: 'px-3 py-2 text-gray-500 whitespace-nowrap text-[11px]', cel: r => fmtDH(r.data), csvRot: ['Data', 'Hora'], csv: r => fmtDH(r.data, true), pdf: r => fmtDH(r.data) },
      { id: 'tentativa', rot: 'Tent.', tdCls: 'px-3 py-2 text-center whitespace-nowrap text-[11px]', interno: true, cel: r => { if (r.tentativa == null) return '—'; const t = r.tentativas_os || 1; return t <= 1 ? h('span', { className: 'text-gray-400' }, '1') : h('span', { className: 'font-bold px-1.5 py-0.5 rounded ' + (r.tentativa > 1 ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'), title: r.tentativa > 1 ? `Redespacho — ${r.tentativa}ª de ${t} tentativas` : `Original — OS teve ${t} tentativas` }, r.tentativa + '/' + t); }, csvRot: ['Tentativa', 'Tentativas da OS'], csv: r => [r.tentativa ?? '', r.tentativas_os ?? ''], pdf: r => r.tentativa != null ? `${r.tentativa}/${r.tentativas_os || 1}` : '' },
      { id: 'cliente', rot: 'Cliente', tdCls: 'px-3 py-2 text-gray-600 max-w-[130px] truncate', tdProps: r => ({ title: r.cliente_nome ? r.cliente_nome + (r.cliente_origem ? ` (${r.cliente_origem})` : '') : '' }), cel: r => r.cliente_nome || '—', csv: r => r.cliente_nome || '', pdf: r => r.cliente_nome || '' },
      { id: 'nota', rot: 'Pedido / NF', tdCls: 'px-3 py-2 text-gray-600 whitespace-nowrap text-[11px]', cel: r => r.nota_fiscal || '—', csv: r => r.nota_fiscal || '', pdf: r => r.nota_fiscal || '' },
      { id: 'cliente_final', rot: 'Cliente final', tdCls: 'px-3 py-2 text-gray-600 max-w-[160px] truncate', tdProps: r => ({ title: r.cliente_final || '' }), cel: r => r.cliente_final || '—', csv: r => r.cliente_final || '', pdf: r => r.cliente_final || '' },
      { id: 'enderecos', rot: 'Coleta / Entrega', rotFiltro: 'Endereços', tdCls: 'px-3 py-2 min-w-[200px]', cel: r => h('div', null, h('div', { className: 'flex items-start gap-1.5' }, h('span', { className: 'text-purple-500 leading-4' }, Ico('circle', 12)), h('span', { className: 'text-gray-600' }, r.endereco_coleta || '—')), h('div', { className: 'flex items-start gap-1.5 mt-1' }, h('span', { className: 'text-gray-400 leading-4' }, '→'), h('span', { className: 'text-gray-700' }, r.endereco_entrega || '—'))), csvRot: ['Coleta', 'Entrega'], csv: r => [r.endereco_coleta || '', r.endereco_entrega || ''], pdf: r => (r.endereco_coleta || '') + ' → ' + (r.endereco_entrega || '') },
      { id: 'entrega', rot: 'Entrega', tdCls: 'px-3 py-2 text-gray-700 max-w-[260px] truncate', tdProps: r => ({ title: r.endereco_entrega || '' }), cel: r => r.endereco_entrega || '—', csv: r => r.endereco_entrega || '', pdf: r => r.endereco_entrega || '' },
      { id: 'motoboy', rot: 'Motoboy', rotFiltro: 'Motoboy (+ canal)', tdCls: 'px-3 py-2', cel: r => h('span', { className: 'inline-flex items-center gap-1.5' }, iconeCanal(r.canal), r.motoboy || '—'), csvRot: ['Motoboy', 'Canal', 'Provedor'], csv: r => [r.motoboy || '', canalNome(r.canal), r.provider || ''], pdf: r => r.motoboy || '' },
      { id: 'provedor', rot: 'Provedor', interno: true, tdCls: 'px-3 py-2 text-[11px]', cel: r => h('span', { className: 'inline-flex items-center gap-1.5' }, h('span', { className: 'w-2 h-2 rounded-full', style: { background: provCor(r.provider) } }), provNome(r.provider)), csv: r => provNome(r.provider), pdf: r => provNome(r.provider) },
      { id: 'status', rot: 'Status', tdCls: 'px-3 py-2', cel: r => statusBadge(r.status), csv: r => r.status || '', pdf: r => r.status || '' },
      { id: 'km', rot: 'KM', num: true, tdCls: 'px-3 py-2 text-right whitespace-nowrap', cel: r => kmF(r.km), csv: r => r.km != null ? String(r.km).replace('.', ',') : '', pdf: r => kmF(r.km) },
      { id: 'tempo', rot: 'Tempo', rotFiltro: 'Tempo de atendimento', num: true, tdCls: 'px-3 py-2 text-right whitespace-nowrap text-[11px]', tdProps: r => ({ title: r.tempo_atendimento_min != null ? `1ª solicitação → entrega · localização ${fmtMin(r.tempo_localizacao_min)} · coleta ${fmtMin(r.tempo_coleta_min)} · entrega ${fmtMin(r.tempo_entrega_min)}` : '' }), cel: r => fmtMin(r.tempo_atendimento_min), csvRot: ['Tempo atendimento (min)', 'Localização (min)', 'Coleta (min)', 'Entrega (min)'], csv: r => [r.tempo_atendimento_min ?? '', r.tempo_localizacao_min ?? '', r.tempo_coleta_min ?? '', r.tempo_entrega_min ?? ''], pdf: r => fmtMin(r.tempo_atendimento_min) },
      { id: 'prazo', rot: 'No prazo?', tdCls: 'px-3 py-2 text-center', cel: r => r.no_prazo == null ? h('span', { className: 'text-gray-300' }, '—') : r.no_prazo ? h('span', { className: 'text-emerald-600 font-bold', title: `prazo ${fmtMin(r.prazo_min)}` }, 'Sim') : h('span', { className: 'text-red-600 font-bold', title: `prazo ${fmtMin(r.prazo_min)} · estourou ${fmtMin(r.tempo_atendimento_min - r.prazo_min)}` }, 'Não'), csvRot: ['No prazo', 'Prazo (min)'], csv: r => [r.no_prazo == null ? '' : r.no_prazo ? 'Sim' : 'Não', r.prazo_min ?? ''], pdf: r => r.no_prazo == null ? '' : r.no_prazo ? 'Sim' : 'Não' },
      { id: 'valor', rot: 'Valor Hub', num: true, interno: true, tdCls: 'px-3 py-2 text-right font-semibold text-gray-800 whitespace-nowrap', tdProps: r => ({ title: r.adicional_retorno ? `Inclui R$ ${nb(r.adicional_retorno)} de adicional por devolução` : '' }), cel: r => [brl(r.valor), r.adicional_retorno ? h('span', { key: 'ret', className: 'text-orange-400 ml-0.5' }, Ico('corner', 11)) : null], csvRot: ['Valor Hub (R$)', 'Adicional Retorno (R$)'], csv: r => [nb(r.valor), r.adicional_retorno ? nb(r.adicional_retorno) : ''], pdf: r => brl(r.valor) },
      { id: 'mapp', rot: 'Valor Mapp', num: true, interno: true, tdCls: 'px-3 py-2 text-right text-gray-500 whitespace-nowrap', cel: r => brl(r.valor_mapp), csvRot: ['Valor Mapp (R$)'], csv: r => nb(r.valor_mapp), pdf: r => brl(r.valor_mapp) },
      { id: 'custo', rot: 'Custo', num: true, interno: true, tdCls: 'px-3 py-2 text-right text-rose-600 whitespace-nowrap', tdProps: r => ({ title: r.custo_origem === 'final' ? 'Custo final reconciliado (99)' : r.custo_origem === 'cotacao' ? 'Cotação do despacho (ainda não reconciliado)' : '' }), cel: r => [brl(r.custo_provedor), r.custo_origem === 'cotacao' ? h('span', { key: 'c', className: 'text-gray-300 ml-0.5' }, '~') : null], csvRot: ['Custo Provedor (R$)', 'Origem do Custo'], csv: r => [nb(r.custo_provedor), r.custo_origem || ''], pdf: r => brl(r.custo_provedor) },
      { id: 'liquido', rot: 'Líquido', num: true, interno: true, tdCls: 'px-3 py-2 text-right font-semibold whitespace-nowrap', tdClsFn: r => r.faturamento_liquido == null ? 'text-gray-400' : r.faturamento_liquido < 0 ? 'text-rose-600' : 'text-emerald-700', cel: r => brl(r.faturamento_liquido), csvRot: ['Faturamento Liquido (R$)'], csv: r => nb(r.faturamento_liquido), pdf: r => brl(r.faturamento_liquido) },
    ];
    const colVisivel = (id) => cols.has(id);
    const alternarCol = (id) => setCols(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    const colsVis = COLS.filter(c => c.fixa || colVisivel(c.id));

    // ── CSV (da visão atual) ──
    const baixarCSV = () => {
      try {
        const esc = (v) => { const s = v == null ? '' : String(v); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
        let headers, linhas, nome;
        if (visao === 'corridas') {
          headers = colsVis.reduce((a, c) => a.concat(c.csvRot || [c.rot]), []);
          linhas = rowsView.map(r => colsVis.reduce((a, c) => { const v = c.csv(r); return a.concat(Array.isArray(v) ? v : [v]); }, []));
          nome = `relatorio-hub-${de}-a-${ate}.csv`;
        } else if (visao === 'faixas') {
          const ms = METRICAS_FAIXA.filter(m => faixas.metricas.has(m.id));
          headers = ['Faixa'].concat(faixas.quebrarPor !== 'nada' ? [faixas.quebrarPor === 'provedor' ? 'Provedor' : 'Cliente'] : []).concat(ms.map(m => m.rot));
          linhas = faixasCalc.lista.map(b => [b.rot].concat(faixas.quebrarPor !== 'nada' ? [faixas.quebrarPor === 'provedor' ? provNome(b.quebra) : (b.quebra === VAZIO ? 'Sem cliente' : b.quebra)] : []).concat(ms.map(m => valorMetrica(b, m.id, true))));
          nome = `relatorio-hub-faixas-${faixas.tamanho}km-${de}-a-${ate}.csv`;
        } else {
          headers = ['Cliente', 'Corridas', 'Canceladas', 'KM', 'Valor Hub (R$)', 'Custo (R$)', 'Margem (R$)', 'Ticket margem (R$)', 'Tempo médio (min)', 'No prazo (%)'];
          linhas = clientesCalc.map(c => [c.nome, c.n, c.cancel, String(Math.round(c.km * 10) / 10).replace('.', ','), nb(c.hub), nb(c.custo), nb(c.margem), nb(c.ticket), c.tempo != null ? Math.round(c.tempo) : '', c.prazo != null ? Math.round(c.prazo) : '']);
          nome = `relatorio-hub-clientes-${de}-a-${ate}.csv`;
        }
        const csv = '﻿' + [headers.map(esc).join(';')].concat(linhas.map(l => l.map(esc).join(';'))).join('\n') + '\n';
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = nome; a.click(); URL.revokeObjectURL(url);
      } catch (e) { toast('Erro ao exportar CSV', 'error'); }
    };
    function valorMetrica(b, id, csv) {
      const v = { corridas: b.n, tempo: b.tempo, mediana: b.med, prazo: b.prazo, loc: b.loc, col: b.col, ent: b.ent, hub: b.hub, custo: b.custo, margem: b.margem, rskm: b.rskm }[id];
      if (csv) return v == null ? '' : id === 'corridas' ? v : ['tempo', 'mediana', 'loc', 'col', 'ent'].includes(id) ? Math.round(v) : id === 'prazo' ? Math.round(v) : nb(v);
      if (v == null) return '—';
      if (id === 'corridas') return String(v);
      if (['tempo', 'mediana', 'loc', 'col', 'ent'].includes(id)) return fmtMin(v);
      if (id === 'prazo') return pctF(v);
      return brlS(v);
    }

    // ── PRESETS ──
    const configAtual = () => ({ periodo, de: deCustom, ate: ateCustom, visao, cols: [...cols], faixas: { ...faixas, metricas: [...faixas.metricas] }, filtros: { clientes: f.clientes && [...f.clientes], provedores: f.provedores && [...f.provedores], status: f.status && [...f.status], canais: f.canais && [...f.canais], kmDe: f.kmDe, kmAte: f.kmAte, margemDe: f.margemDe, margemAte: f.margemAte, busca: f.busca }, pdf: pdfCfg.lembrar ? { ...pdfCfg, cabecalho: [...pdfCfg.cabecalho], kpis: [...pdfCfg.kpis], graficos: [...pdfCfg.graficos], colunas: [...pdfCfg.colunas] } : null });
    const aplicarPreset = (p) => {
      const c = p.config || {};
      if (c.periodo) setPeriodo(c.periodo); if (c.de) setDeCustom(c.de); if (c.ate) setAteCustom(c.ate);
      if (c.visao) setVisao(c.visao); if (c.cols) setCols(new Set(c.cols));
      if (c.faixas) setFaixas({ tamanho: c.faixas.tamanho || 5, teto: c.faixas.teto || 30, metricas: new Set(c.faixas.metricas || ['corridas', 'tempo']), quebrarPor: c.faixas.quebrarPor || 'nada' });
      if (c.filtros) { const s = (a) => Array.isArray(a) ? new Set(a) : null; setF({ clientes: s(c.filtros.clientes), provedores: s(c.filtros.provedores), status: c.filtros.status === null ? (c.filtros.soFaturaveis === false ? null : new Set(STATUS_FATURAVEIS)) : s(c.filtros.status), canais: s(c.filtros.canais), kmDe: c.filtros.kmDe || '', kmAte: c.filtros.kmAte || '', margemDe: c.filtros.margemDe || '', margemAte: c.filtros.margemAte || '', busca: c.filtros.busca || '' }); }
      if (c.pdf) setPdfCfg({ ...c.pdf, cabecalho: new Set(c.pdf.cabecalho || []), kpis: new Set(c.pdf.kpis || []), graficos: new Set(c.pdf.graficos || []), colunas: new Set(c.pdf.colunas || []) });
      setPresetAtivo(p.id); setGaveta(false); setChipAberto(null);
      toast(`Preset "${p.nome}" aplicado`, 'info');
    };
    const salvarPreset = async () => {
      const atual = presets.find(p => p.id === presetAtivo);
      const nome = window.prompt('Nome do preset:', atual ? atual.nome : (visao === 'faixas' ? `${faixas.tamanho} em ${faixas.tamanho} km · tempo médio` : ''));
      if (!nome) return;
      try {
        const existe = presets.find(p => p.nome.toLowerCase() === nome.trim().toLowerCase());
        const r = existe && window.confirm(`Já existe "${existe.nome}". Substituir?`)
          ? await fetchAuth(`${API_URL}/logistics/relatorio/presets/${existe.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: nome.trim(), config: configAtual() }) })
          : existe ? null : await fetchAuth(`${API_URL}/logistics/relatorio/presets`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: nome.trim(), config: configAtual() }) });
        if (!r) return;
        const j = await r.json(); if (!j.success) throw new Error(j.error || 'erro');
        setPresetAtivo(j.preset.id); toast('Preset salvo'); carregarPresets();
      } catch (e) { toast('Não deu pra salvar o preset: ' + e.message, 'error'); }
    };
    const apagarPreset = async (p) => { if (!window.confirm(`Apagar o preset "${p.nome}"?`)) return; try { await fetchAuth(`${API_URL}/logistics/relatorio/presets/${p.id}`, { method: 'DELETE' }); if (presetAtivo === p.id) setPresetAtivo(null); carregarPresets(); } catch (e) { toast('Erro ao apagar', 'error'); } };

    // ── PDF ──
    const aplicarModeloPdf = (modelo) => setPdfCfg(prev => {
      if (modelo === 'cliente') return { ...prev, modelo, kpis: new Set([...prev.kpis].filter(k => !KPIS.find(x => x.id === k && x.interno))), graficos: new Set([...prev.graficos].filter(g => !GRAFICOS.find(x => x.id === g && x.interno))), colunas: new Set([...prev.colunas].filter(c => !COLS.find(x => x.id === c && x.interno))) };
      return { ...prev, modelo, kpis: new Set(KPIS.map(k => k.id)), graficos: new Set(GRAFICOS.map(g => g.id)), colunas: new Set(['os', 'data', 'tentativa', 'cliente', 'nota', 'entrega', 'motoboy', 'status', 'km', 'tempo', 'prazo', 'valor', 'mapp', 'custo', 'liquido']) };
    });
    const togglePdf = (campo, id) => setPdfCfg(prev => { const n = new Set(prev[campo]); if (n.has(id)) n.delete(id); else n.add(id); return { ...prev, [campo]: n }; });
    const clientesSel = f.clientes ? [...f.clientes].filter(x => x !== VAZIO) : [];
    const tituloCliente = clientesSel.length === 1 ? clientesSel[0] : clientesSel.length > 1 ? `${clientesSel.length} clientes` : 'todos os clientes';

    const gerarHtmlPdf = () => {
      const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const cab = pdfCfg.cabecalho, kp = pdfCfg.kpis, gr = pdfCfg.graficos;
      const kpiVal = { corridas: [String(totais.corridas), ''], entregues: [String(totais.entregues), totais.corridas ? pctF(totais.entregues / totais.corridas * 100) : ''], km: [kmF(totais.km), `${kmF(totais.corridas ? totais.km / totais.corridas : 0)} km/corrida`], tempo: [fmtMin(totais.tempoMedio), `mediana ${fmtMin(totais.tempoMediana)}`], prazo: [pctF(totais.pctPrazo), `${totais.avaliadas} avaliadas`], mapp: [brlS(totais.mapp), ''], hub: [brlS(totais.hub), ''], custo: [brlS(totais.custo), ''], margem: [brlS(totais.margem), `ticket ${brlS(totais.ticket)}`] };
      const kpisHtml = KPIS.filter(k => kp.has(k.id)).map(k => `<div class="kpi${['tempo', 'prazo', 'margem'].includes(k.id) ? ' kpi-' + k.id : ''}"><div class="kl">${esc(k.rot)}</div><div class="kv">${esc(kpiVal[k.id][0])}</div>${kpiVal[k.id][1] ? `<div class="ks">${esc(kpiVal[k.id][1])}</div>` : ''}</div>`).join('');
      const barras = (itens, cor, fmt) => { const max = Math.max(1, ...itens.map(i => i.v || 0)); const W = 640, H = 150, bw = Math.max(6, Math.min(48, (W - 40) / itens.length - 6)); return `<svg viewBox="0 0 ${W} ${H + 30}" width="100%" style="max-height:180px"><line x1="30" x2="${W}" y1="${H}" y2="${H}" stroke="#e5e7eb"/>${itens.map((it, i) => { const x = 34 + i * ((W - 40) / itens.length); const hh = (it.v || 0) / max * (H - 24); return `<rect x="${x}" y="${H - hh}" width="${bw}" height="${hh}" rx="3" fill="${cor}"/><text x="${x + bw / 2}" y="${H - hh - 4}" font-size="9" text-anchor="middle" fill="#4b5563">${esc(fmt(it.v))}</text><text x="${x + bw / 2}" y="${H + 14}" font-size="9" text-anchor="middle" fill="#6b7280">${esc(it.rot)}</text>`; }).join('')}</svg>`; };
      const grafs = [];
      if (gr.has('tempo_faixa') && faixasCalc.lista.length) grafs.push(`<div class="box"><div class="bt">Tempo médio de atendimento por faixa de km</div>${barras(faixasCalc.lista.filter(b => b.quebra === '_' || faixas.quebrarPor === 'nada').map(b => ({ rot: b.rot.replace(' km', ''), v: b.tempo })), '#7c3aed', v => v == null ? '' : fmtMin(v))}</div>`);
      if (gr.has('corridas_dia') && porDia.length) grafs.push(`<div class="box"><div class="bt">Corridas por dia</div>${barras(porDia.map(d => ({ rot: fmtDia(d.dia), v: d.n })), '#7c3aed', v => String(v))}</div>`);
      if (gr.has('prazo_dia') && porDia.length) grafs.push(`<div class="box"><div class="bt">% no prazo por dia</div>${barras(porDia.map(d => ({ rot: fmtDia(d.dia), v: d.aval ? d.ok / d.aval * 100 : 0 })), '#15a05a', v => pctF(v))}</div>`);
      if (gr.has('margem_dia') && porDia.length) grafs.push(`<div class="box"><div class="bt">Margem por dia (R$)</div>${barras(porDia.map(d => ({ rot: fmtDia(d.dia), v: d.margem })), '#f5921e', v => brl(v))}</div>`);
      let tabela = '';
      if (pdfCfg.tabela) {
        if (visao === 'faixas') {
          const ms = METRICAS_FAIXA.filter(m => faixas.metricas.has(m.id) && (pdfCfg.modelo !== 'cliente' || !m.interno));
          tabela = `<table><thead><tr><th>Faixa</th>${faixas.quebrarPor !== 'nada' ? `<th>${faixas.quebrarPor === 'provedor' ? 'Provedor' : 'Cliente'}</th>` : ''}${ms.map(m => `<th class="r">${esc(m.rot)}</th>`).join('')}</tr></thead><tbody>${faixasCalc.lista.map(b => `<tr><td><b>${esc(b.rot)}</b></td>${faixas.quebrarPor !== 'nada' ? `<td>${esc(faixas.quebrarPor === 'provedor' ? provNome(b.quebra) : (b.quebra === VAZIO ? 'Sem cliente' : b.quebra))}</td>` : ''}${ms.map(m => `<td class="r">${esc(valorMetrica(b, m.id))}</td>`).join('')}</tr>`).join('')}<tr class="tot"><td><b>Total</b></td>${faixas.quebrarPor !== 'nada' ? '<td></td>' : ''}${ms.map(m => `<td class="r">${esc(m.id === 'corridas' ? String(faixasCalc.total) : m.id === 'tempo' ? fmtMin(totais.tempoMedio) : m.id === 'mediana' ? fmtMin(totais.tempoMediana) : m.id === 'prazo' ? pctF(totais.pctPrazo) : m.id === 'hub' ? brlS(totais.corridas ? totais.hub / totais.corridas : 0) : m.id === 'custo' ? brlS(totais.corridas ? totais.custo / totais.corridas : 0) : m.id === 'margem' ? brlS(totais.ticket) : '')}</td>`).join('')}</tr></tbody></table>`;
        } else if (visao === 'clientes') {
          const interno = pdfCfg.modelo === 'cliente';
          tabela = `<table><thead><tr><th>Cliente</th><th class="r">Corridas</th><th class="r">KM</th><th class="r">Tempo médio</th><th class="r">No prazo</th>${interno ? '' : '<th class="r">Valor Hub</th><th class="r">Custo</th><th class="r">Margem</th>'}</tr></thead><tbody>${clientesCalc.map(c => `<tr><td>${esc(c.nome)}</td><td class="r">${c.n}</td><td class="r">${kmF(c.km)}</td><td class="r">${fmtMin(c.tempo)}</td><td class="r">${pctF(c.prazo)}</td>${interno ? '' : `<td class="r">${brlS(c.hub)}</td><td class="r">${brlS(c.custo)}</td><td class="r">${brlS(c.margem)}</td>`}</tr>`).join('')}</tbody></table>`;
        } else {
          const cs = COLS.filter(c => c.fixa || pdfCfg.colunas.has(c.id)).filter(c => pdfCfg.modelo !== 'cliente' || !c.interno);
          tabela = `<table><thead><tr>${cs.map(c => `<th${c.num ? ' class="r"' : ''}>${esc(c.rot)}</th>`).join('')}</tr></thead><tbody>${rowsView.map(r => `<tr>${cs.map(c => `<td${c.num ? ' class="r"' : ''}>${esc(c.pdf(r))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
        }
      }
      const filtrosTxt = cab.has('filtros') ? `<div class="filtros">Filtros: ${esc([f.provedores ? 'provedor ' + [...f.provedores].map(provNome).join('/') : null, statusModo === 'faturaveis' ? 'faturáveis (Entregue + Devolvido)' : statusModo === 'todas' ? 'todas as etapas' : 'status ' + [...f.status].join('/'), (num(f.kmDe) != null || num(f.kmAte) != null) ? `km ${f.kmDe || 0}–${f.kmAte || '∞'}` : null, f.busca ? `busca "${f.busca}"` : null].filter(Boolean).join(' · ') || 'nenhum')}</div>` : '';
      return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório</title><style>
        @page{size:A4 landscape;margin:12mm}
        body{margin:0;font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#111827;font-size:10.5px}
        .cab{display:flex;align-items:center;gap:12px;padding-bottom:10px;border-bottom:2px solid #6d28d9;margin-bottom:14px}
        .logo{width:38px;height:38px;border-radius:9px;background:#6d28d9;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px}
        .t{font-size:16px;font-weight:800}.s{color:#6b7280;font-size:10px}
        .kpis{display:grid;grid-template-columns:repeat(${Math.min(6, Math.max(1, kp.size))},1fr);gap:8px;margin-bottom:14px}
        .kpi{border:1px solid #e5e7eb;border-radius:9px;padding:8px 10px}.kl{font-size:8px;font-weight:700;text-transform:uppercase;color:#6b7280;letter-spacing:.03em}.kv{font-size:18px;font-weight:800;margin-top:2px}.ks{font-size:8.5px;color:#9ca3af}
        .kpi-tempo{background:#faf5ff;border-color:#ddd6fe}.kpi-tempo .kv,.kpi-tempo .kl{color:#5b21b6}.kpi-prazo{background:#ecfdf5;border-color:#a7f3d0}.kpi-prazo .kv,.kpi-prazo .kl{color:#047857}.kpi-margem .kv{color:#047857}
        .grafs{display:grid;grid-template-columns:repeat(${Math.min(2, Math.max(1, grafs.length))},1fr);gap:10px;margin-bottom:14px}
        .box{border:1px solid #e5e7eb;border-radius:9px;padding:10px;break-inside:avoid}.bt{font-weight:800;margin-bottom:6px}
        table{width:100%;border-collapse:collapse;font-size:9.5px}th{background:#f9fafb;color:#6b7280;font-size:8px;text-transform:uppercase;letter-spacing:.03em;text-align:left;padding:6px 7px;border-bottom:1px solid #e5e7eb}td{padding:5px 7px;border-bottom:1px solid #f3f4f6;vertical-align:top}.r{text-align:right}tr{break-inside:avoid}tr.tot td{background:#faf5ff;font-weight:800;color:#5b21b6}
        .filtros{font-size:9px;color:#6b7280;margin:-8px 0 12px}
        .rod{margin-top:12px;font-size:8.5px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:6px}
      </style></head><body>
        <div class="cab">${cab.has('logo') ? '<div class="logo">tutts</div>' : ''}<div style="flex:1"><div class="t">Relatório de entregas${cab.has('cliente') ? ' — ' + esc(tituloCliente) : ''}</div><div class="s">${cab.has('periodo') ? `Período ${fmtDataBR(de)} a ${fmtDataBR(ate)} · ` : ''}gerado em ${new Date().toLocaleString('pt-BR', { timeZone: TZ })} · Central Tutts</div></div><div class="s" style="text-align:right">Visão: ${visao === 'faixas' ? `por faixa de km (${faixas.tamanho} em ${faixas.tamanho})` : visao === 'clientes' ? 'por cliente' : 'corridas'}<br>${rowsView.length} corridas${statusModo === 'faturaveis' ? ' faturáveis' : ''}</div></div>
        ${filtrosTxt}
        ${kp.size ? `<div class="kpis">${kpisHtml}</div>` : ''}
        ${grafs.length ? `<div class="grafs">${grafs.join('')}</div>` : ''}
        ${tabela}
        <div class="rod">Tempo de atendimento = da 1ª solicitação à entrega. No prazo = dentro do prazo por distância. ${pdfCfg.modelo === 'cliente' ? 'Versão para o cliente — sem valores internos.' : 'Versão interna.'}</div>
      </body></html>`;
    };
    const gerarPdf = async () => {
      setPdfGerando(true);
      try {
        const html = gerarHtmlPdf();
        const r = await fetchAuth(`${API_URL}/logistics/relatorio/pdf`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html, filename: `relatorio-hub-${visao}-${de}-a-${ate}.pdf`, landscape: true }) });
        if (!r.ok) { let j = null; try { j = await r.json(); } catch (_) {} throw new Error((j && j.error) || 'HTTP ' + r.status); }
        const blob = await r.blob(); const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `relatorio-hub-${visao}-${de}-a-${ate}.pdf`; a.click(); URL.revokeObjectURL(url);
        toast('PDF gerado'); setPdfAberto(false);
      } catch (e) { toast('Erro ao gerar PDF: ' + e.message, 'error'); }
      finally { setPdfGerando(false); }
    };

    // ═════════════ RENDER ═════════════
    const pills = [['1d', 'Hoje'], ['7d', '7 dias'], ['30d', '30 dias'], ['custom', 'Período']];
    const chip = (id, rot, resumo, ativo) => h('button', { type: 'button', onClick: () => setChipAberto(chipAberto === id ? null : id), className: `h-[34px] px-3 rounded-full text-[12.5px] font-semibold inline-flex items-center gap-1.5 border ${ativo ? 'border-purple-300 bg-purple-50 text-purple-900' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'} ${chipAberto === id ? 'ring-2 ring-purple-200' : ''}` }, rot, h('span', { className: ativo ? 'font-extrabold' : 'text-gray-400 font-medium' }, resumo), h('span', { className: ativo ? 'text-purple-600' : 'text-gray-400' }, '▾'));
    const resumoSel = (chave, fmt) => f[chave] === null ? 'todos' : f[chave].size === 0 ? 'nenhum' : f[chave].size === 1 ? fmt([...f[chave]][0]) : String(f[chave].size);
    const listaOpcoes = (chave, fmt, colunas) => h('div', { className: `grid ${colunas || 'grid-cols-1'} gap-x-3 gap-y-0.5 max-h-72 overflow-y-auto pr-1` },
      (opcoes[chave] || []).map(o => h('label', { key: String(o.v), className: `flex items-center gap-2 h-[30px] px-2 rounded-lg cursor-pointer ${marcado(chave, o.v) && f[chave] !== null ? 'bg-purple-50' : 'hover:bg-gray-50'}` },
        h('input', { type: 'checkbox', checked: marcado(chave, o.v), onChange: () => alternar(chave, o.v), className: 'w-[15px] h-[15px] accent-purple-600 shrink-0' }),
        h('span', { className: `text-[12px] truncate flex-1 ${o.v === VAZIO ? 'text-gray-400 italic' : 'text-gray-700'}` }, fmt(o.v)),
        h('span', { className: 'text-[10px] text-gray-400' }, o.n),
        h('button', { type: 'button', onClick: (ev) => { ev.preventDefault(); soEste(chave, o.v); }, className: 'text-[10px] text-purple-600 font-semibold opacity-0 group-hover:opacity-100 hover:underline', title: 'Só este' }, 'só'))));
    const cabecalhoSecao = (titulo, chave, extra) => h('div', { className: 'flex items-center gap-2 mb-2' }, h('span', { className: 'text-[13px] font-extrabold text-gray-900' }, titulo), f[chave] !== null && h('span', { className: 'px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold' }, `${f[chave].size} selecionado${f[chave].size === 1 ? '' : 's'}`), extra, h('button', { type: 'button', onClick: () => marcarTodos(chave), className: 'ml-auto text-[11px] font-semibold text-purple-600 hover:underline' }, 'todos'), h('button', { type: 'button', onClick: () => marcarNenhum(chave), className: 'text-[11px] font-semibold text-gray-500 hover:underline' }, 'nenhum'));
    const fmtCli = (v) => v === VAZIO ? 'Sem cliente' : v;
    const fmtProv = (v) => v === VAZIO ? 'Sem provedor' : provNome(v);
    const fmtCanal = (v) => v === VAZIO ? 'Sem canal' : canalNome(v);
    const fmtStatus = (v) => v === VAZIO ? 'Sem status' : v;
    const popover = (id, corpo, largura) => chipAberto === id && h('div', { className: 'absolute z-40 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-3', style: { width: largura || 320, left: 0 } }, corpo);
    const gruposStatus = () => h('div', { className: 'space-y-2' },
      h('div', { className: 'flex bg-gray-100 rounded-lg p-0.5 w-fit' }, [['faturaveis', 'Faturáveis'], ['todas', 'Todas'], ['escolha', 'Escolher']].map(([m, rot]) => h('button', { key: m, type: 'button', onClick: () => setStatusModo(m), className: `h-[30px] px-3 rounded-md text-[12px] font-semibold ${statusModo === m ? 'bg-white shadow-sm text-purple-700' : 'text-gray-500'}` }, rot))),
      h('div', { className: 'text-[11px] text-gray-500' }, statusModo === 'faturaveis' ? 'Entregue + Devolvido — o que fatura. É o padrão.' : statusModo === 'todas' ? 'Inclui canceladas e em andamento; os totais somam tudo o que está na tabela.' : 'Marque as etapas que quer ver e somar:'),
      statusModo === 'escolha' && h('div', { className: 'flex flex-wrap gap-1.5' }, STATUS_GRUPOS.filter(g => statusDoGrupo(g).length).map(g => h('button', { key: g.id, type: 'button', onClick: () => alternarGrupo(g), className: `h-[32px] px-3 rounded-full text-[12px] font-semibold border ${grupoMarcado(g) ? g.cls : 'border-gray-200 bg-white text-gray-400'}` }, (grupoMarcado(g) ? '✓ ' : '') + g.rot, h('span', { className: 'text-gray-400 font-normal ml-1' }, `(${contaStatus(g)})`)))));
    const ativosChips = [];
    if (f.clientes) [...f.clientes].forEach(v => ativosChips.push({ rot: 'Cliente: ' + fmtCli(v), del: () => alternar('clientes', v) }));
    if (f.provedores) [...f.provedores].forEach(v => ativosChips.push({ rot: 'Provedor: ' + fmtProv(v), del: () => alternar('provedores', v) }));
    if (f.canais) [...f.canais].forEach(v => ativosChips.push({ rot: 'Canal: ' + fmtCanal(v), del: () => alternar('canais', v) }));
    if (statusModo === 'todas') ativosChips.push({ rot: 'Status: todas (inclui canceladas e em andamento)', del: () => setStatusModo('faturaveis') });
    else if (statusModo === 'escolha') ativosChips.push({ rot: 'Status: ' + [...f.status].join(', '), del: () => setStatusModo('faturaveis') });
    if (num(f.kmDe) != null || num(f.kmAte) != null) ativosChips.push({ rot: `Km: ${f.kmDe || 0} – ${f.kmAte || '∞'}`, del: () => setF(p => ({ ...p, kmDe: '', kmAte: '' })) });
    if (num(f.margemDe) != null || num(f.margemAte) != null) ativosChips.push({ rot: `Margem: ${f.margemDe || '−∞'} – ${f.margemAte || '∞'}`, del: () => setF(p => ({ ...p, margemDe: '', margemAte: '' })) });
    if (f.busca.trim()) ativosChips.push({ rot: `Busca: "${f.busca.trim()}"`, del: () => setF(p => ({ ...p, busca: '' })) });

    const kpiCard = (rot, val, cls, sub, destaque) => h('div', { className: `rounded-2xl border p-3.5 ${destaque || 'bg-white border-gray-200'}` }, h('div', { className: `text-[10px] font-bold uppercase tracking-wide ${destaque ? '' : 'text-gray-400'}` }, rot), h('div', { className: `text-2xl font-extrabold mt-1 leading-none ${cls || 'text-gray-800'}` }, val), sub && h('div', { className: 'text-[10.5px] text-gray-400 mt-1.5' }, sub));

    // ── tabela de corridas ──
    const tabelaCorridas = () => h('div', { className: 'overflow-x-auto' }, h('table', { className: 'w-full text-xs' },
      h('thead', null, h('tr', { className: 'bg-gray-50 text-[10.5px] font-bold uppercase tracking-wide text-gray-500' }, colsVis.map(c => h('th', { key: c.id, className: `px-3 py-2.5 ${c.num ? 'text-right' : 'text-left'}` }, c.rot)))),
      h('tbody', null, rowsView.length === 0 ? h('tr', null, h('td', { colSpan: colsVis.length, className: 'px-4 py-12 text-center text-gray-400' }, 'Nenhuma corrida bate com o filtro.')) :
        rowsView.map(r => h('tr', { key: r.delivery_id || r.os + '-' + r.tentativa, className: `border-t border-gray-100 hover:bg-gray-50 ${r.redespacho ? 'bg-amber-50/40' : ''}` }, colsVis.map(c => h('td', Object.assign({ key: c.id, className: c.tdCls + (c.tdClsFn ? ' ' + c.tdClsFn(r) : '') }, c.tdProps ? c.tdProps(r) : {}), c.cel(r))))))));

    // ── visão por faixa ──
    const visaoFaixas = () => {
      const ms = METRICAS_FAIXA.filter(m => faixas.metricas.has(m.id));
      const quebra = faixas.quebrarPor !== 'nada';
      const seg = (opts, val, set) => h('div', { className: 'flex bg-gray-100 rounded-lg p-0.5' }, opts.map(([v, rot]) => h('button', { key: String(v), type: 'button', onClick: () => set(v), className: `h-[30px] px-3 rounded-md text-[12px] font-semibold ${String(val) === String(v) ? 'bg-white shadow-sm text-purple-700' : 'text-gray-500'}` }, rot)));
      const graf = faixasCalc.lista.filter(b => !quebra);
      const maxT = Math.max(1, ...graf.map(b => b.tempo || 0));
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-white rounded-2xl border border-gray-200 p-4 grid grid-cols-1 xl:grid-cols-[230px_230px_1fr_220px] gap-5 items-start' },
          h('div', null, h('div', { className: 'text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5' }, 'Tamanho da faixa'), h('div', { className: 'flex items-center gap-1.5' }, seg([[3, '3 km'], [5, '5 km'], [10, '10 km']], faixas.tamanho, v => setFaixas(p => ({ ...p, tamanho: v }))), h('input', { type: 'number', min: 1, max: 100, value: faixas.tamanho, 'aria-label': 'Tamanho da faixa em km', onChange: e => setFaixas(p => ({ ...p, tamanho: Math.max(1, Number(e.target.value) || 1) })), className: 'w-[56px] h-[32px] border border-gray-200 rounded-lg text-center text-[12.5px] font-bold' }))),
          h('div', null, h('div', { className: 'text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5' }, 'Agrupar acima de'), h('div', { className: 'flex items-center gap-2' }, h('input', { type: 'number', min: faixas.tamanho, step: faixas.tamanho, value: faixas.teto, 'aria-label': 'Teto em km', onChange: e => setFaixas(p => ({ ...p, teto: Math.max(p.tamanho, Number(e.target.value) || p.tamanho) })), className: 'w-[72px] h-[36px] border border-gray-200 rounded-lg text-center text-[14px] font-bold' }), h('span', { className: 'text-[12px] text-gray-500' }, 'km → última faixa ', h('b', { className: 'text-gray-700' }, `“${faixas.teto}+”`)))),
          h('div', null, h('div', { className: 'text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5' }, 'Métricas na tabela'), h('div', { className: 'flex flex-wrap gap-1.5' }, METRICAS_FAIXA.map(m => h('button', { key: m.id, type: 'button', onClick: () => setFaixas(p => { const n = new Set(p.metricas); if (n.has(m.id)) n.delete(m.id); else n.add(m.id); return { ...p, metricas: n }; }), className: `h-[28px] px-2.5 rounded-full text-[11.5px] font-semibold ${faixas.metricas.has(m.id) ? 'bg-purple-700 text-white' : 'bg-white border border-gray-200 text-gray-600'}` }, m.rot)))),
          h('div', null, h('div', { className: 'text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5' }, 'Quebrar por'), seg([['nada', 'Nada'], ['provedor', 'Provedor'], ['cliente', 'Cliente']], faixas.quebrarPor, v => setFaixas(p => ({ ...p, quebrarPor: v }))), h('div', { className: 'text-[10.5px] text-gray-400 mt-1.5' }, 'Provedor abre 99 e Uber lado a lado em cada faixa.'))),
        h('div', { className: 'grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-3 items-start' },
          h('div', { className: 'bg-white rounded-2xl border border-gray-200 overflow-hidden' },
            h('table', { className: 'w-full text-[12.5px]' },
              h('thead', null, h('tr', { className: 'bg-gray-50 text-[10.5px] font-bold uppercase tracking-wide text-gray-500' }, h('th', { className: 'px-4 py-2.5 text-left' }, 'Faixa'), quebra && h('th', { className: 'px-3 py-2.5 text-left' }, faixas.quebrarPor === 'provedor' ? 'Provedor' : 'Cliente'), ms.map(m => h('th', { key: m.id, className: 'px-3 py-2.5 text-right' }, m.rot)))),
              h('tbody', null, faixasCalc.lista.length === 0 ? h('tr', null, h('td', { colSpan: 2 + ms.length, className: 'px-4 py-12 text-center text-gray-400' }, 'Sem corridas com km no filtro.')) :
                faixasCalc.lista.map((b, i) => { const pouco = b.n < 5; return h('tr', { key: b.ini + '|' + b.quebra, className: `border-t border-gray-100 ${pouco ? 'text-gray-400' : ''}` },
                  h('td', { className: 'px-4 py-2.5 font-bold whitespace-nowrap' }, (!quebra || i === 0 || faixasCalc.lista[i - 1].ini !== b.ini) ? b.rot : ''),
                  quebra && h('td', { className: 'px-3 py-2.5 whitespace-nowrap' }, faixas.quebrarPor === 'provedor' ? h('span', { className: 'inline-flex items-center gap-1.5' }, h('span', { className: 'w-2 h-2 rounded-full', style: { background: provCor(b.quebra) } }), provNome(b.quebra)) : (b.quebra === VAZIO ? 'Sem cliente' : b.quebra)),
                  ms.map(m => h('td', { key: m.id, className: 'px-3 py-2.5 text-right whitespace-nowrap ' + (m.id === 'tempo' ? 'font-extrabold text-purple-800' : m.id === 'prazo' && b.prazo != null ? (b.prazo >= 90 ? 'text-emerald-700 font-bold' : b.prazo >= 80 ? 'text-amber-700 font-bold' : 'text-red-600 font-bold') : m.id === 'margem' ? 'text-emerald-700 font-bold' : m.id === 'custo' ? 'text-rose-600' : '') },
                    m.id === 'corridas' ? h('span', { className: 'inline-flex items-center gap-2 justify-end' }, h('span', { className: 'h-[14px] rounded', style: { width: Math.max(3, Math.round(b.n / faixasCalc.maxN * 120)), background: pouco ? '#c4b5fd' : '#7c3aed' } }), h('b', null, b.n), h('span', { className: 'text-[10px] text-gray-400' }, faixasCalc.total ? pctF(b.n / faixasCalc.total * 100) : '')) : valorMetrica(b, m.id)))); }),
                faixasCalc.lista.length > 0 && h('tr', { className: 'border-t border-purple-100 bg-purple-50/60 font-extrabold text-purple-900' }, h('td', { className: 'px-4 py-2.5' }, 'Total'), quebra && h('td', null), ms.map(m => h('td', { key: m.id, className: 'px-3 py-2.5 text-right' }, m.id === 'corridas' ? faixasCalc.total : m.id === 'tempo' ? fmtMin(totais.tempoMedio) : m.id === 'mediana' ? fmtMin(totais.tempoMediana) : m.id === 'prazo' ? pctF(totais.pctPrazo) : m.id === 'hub' ? brlS(totais.corridas ? totais.hub / totais.corridas : 0) : m.id === 'custo' ? brlS(totais.corridas ? totais.custo / totais.corridas : 0) : m.id === 'margem' ? brlS(totais.ticket) : ''))))),
            h('div', { className: 'px-4 py-2 text-[10.5px] text-gray-400 border-t border-gray-100' }, `${faixasCalc.total} corridas com km${faixasCalc.semKm ? ` · ${faixasCalc.semKm} sem km (fora)` : ''} · faixas com menos de 5 corridas ficam em cinza · tempo = 1ª solicitação → entrega`)),
          h('div', { className: 'space-y-3' },
            !quebra && graf.length > 0 && h('div', { className: 'bg-white rounded-2xl border border-gray-200 p-4' },
              h('div', { className: 'text-[13px] font-extrabold text-gray-800' }, 'Tempo médio por faixa'), h('div', { className: 'text-[11px] text-gray-500 mb-2' }, 'Da 1ª solicitação à entrega.'),
              h('div', { className: 'flex items-end gap-2 border-b border-gray-200', style: { height: 150 } }, graf.map(b => h('div', { key: b.ini, className: 'flex-1 flex flex-col items-center justify-end gap-1', title: `${b.rot}: ${fmtMin(b.tempo)} (${b.n} corridas)` }, h('span', { className: 'text-[10px] font-bold text-purple-800' }, b.tempo != null ? Math.round(b.tempo) : '—'), h('div', { className: 'w-full rounded-t', style: { height: Math.max(2, Math.round((b.tempo || 0) / maxT * 120)), background: b.n < 5 ? '#c4b5fd' : '#7c3aed' } })))),
              h('div', { className: 'flex gap-2 text-[9.5px] text-gray-500 text-center mt-1' }, graf.map(b => h('span', { key: b.ini, className: 'flex-1 truncate' }, b.rot.replace(' km', ''))))),
            h('div', { className: 'bg-white rounded-2xl border border-gray-200 p-4 text-[12px] text-gray-700 space-y-1.5' },
              h('div', { className: 'text-[13px] font-extrabold text-gray-900' }, 'Leitura rápida'),
              (function () { const g = faixasCalc.lista.filter(b => b.quebra === '_' || !quebra).filter(b => b.n >= 5 && b.tempo != null); if (g.length < 2) return h('div', { className: 'text-gray-400' }, 'Poucos dados pra concluir.'); const a = g[0], z = g[g.length - 1]; const porFaixa = (z.tempo - a.tempo) / Math.max(1, g.length - 1); const pior = g.reduce((m, b) => (b.prazo != null && (m == null || b.prazo < m.prazo)) ? b : m, null); return h(React.Fragment, null, h('div', null, `• Cada ${faixas.tamanho} km adiciona ~${Math.round(porFaixa)} min: de ${fmtMin(a.tempo)} (${a.rot}) a ${fmtMin(z.tempo)} (${z.rot}).`), pior && pior.prazo != null && h('div', null, `• Pior faixa no prazo: ${pior.rot} com ${pctF(pior.prazo)}${pior.prazo < 85 ? ' — o SLA da tabela está apertado aí.' : '.'}`), totais.tempoMedio != null && h('div', null, `• Média geral ${fmtMin(totais.tempoMedio)} · mediana ${fmtMin(totais.tempoMediana)}.`)); })()))));
    };

    // ── visão por cliente ──
    const visaoClientes = () => h('div', { className: 'bg-white rounded-2xl border border-gray-200 overflow-hidden' },
      h('table', { className: 'w-full text-[12.5px]' },
        h('thead', null, h('tr', { className: 'bg-gray-50 text-[10.5px] font-bold uppercase tracking-wide text-gray-500' }, ['Cliente', 'Corridas', 'Canceladas', 'KM', 'Tempo médio', 'No prazo', 'Valor Hub', 'Custo', 'Margem', 'Ticket margem'].map((t, i) => h('th', { key: t, className: `px-3 py-2.5 ${i === 0 ? 'text-left' : 'text-right'}` }, t)))),
        h('tbody', null, clientesCalc.length === 0 ? h('tr', null, h('td', { colSpan: 10, className: 'px-4 py-12 text-center text-gray-400' }, 'Sem corridas no filtro.')) : clientesCalc.map(c => h('tr', { key: c.nome, className: 'border-t border-gray-100 hover:bg-gray-50' },
          h('td', { className: 'px-3 py-2.5 font-semibold text-gray-800' }, c.nome), h('td', { className: 'px-3 py-2.5 text-right' }, c.n), h('td', { className: 'px-3 py-2.5 text-right ' + (c.cancel ? 'text-red-600' : 'text-gray-400') }, c.cancel), h('td', { className: 'px-3 py-2.5 text-right' }, kmF(c.km)), h('td', { className: 'px-3 py-2.5 text-right font-bold text-purple-800' }, fmtMin(c.tempo)), h('td', { className: 'px-3 py-2.5 text-right ' + (c.prazo == null ? 'text-gray-400' : c.prazo >= 90 ? 'text-emerald-700 font-bold' : c.prazo >= 80 ? 'text-amber-700 font-bold' : 'text-red-600 font-bold') }, pctF(c.prazo)), h('td', { className: 'px-3 py-2.5 text-right' }, brlS(c.hub)), h('td', { className: 'px-3 py-2.5 text-right text-rose-600' }, brlS(c.custo)), h('td', { className: 'px-3 py-2.5 text-right font-bold ' + (c.margem >= 0 ? 'text-emerald-700' : 'text-rose-600') }, brlS(c.margem)), h('td', { className: 'px-3 py-2.5 text-right ' + (c.ticket >= 0 ? 'text-emerald-700' : 'text-rose-600') }, brlS(c.ticket)))))));

    // ── GAVETA ──
    const gavetaEl = gaveta && h('div', { className: 'fixed inset-0 z-50', style: { background: 'rgba(17,24,39,.35)' }, onMouseDown: (ev) => { if (ev.target === ev.currentTarget) setGaveta(false); } },
      h('aside', { 'aria-label': 'Filtros do relatório', className: 'absolute top-0 right-0 h-full bg-white shadow-2xl flex flex-col', style: { width: 'min(900px, 96vw)' } },
        h('div', { className: 'px-6 py-4 border-b border-gray-200 flex items-start gap-3' }, h('div', { className: 'flex-1' }, h('h3', { className: 'text-lg font-extrabold text-gray-900' }, 'Filtros'), h('div', { className: 'text-[12px] text-gray-500' }, 'Resultado atualiza conforme você marca · ', h('b', { className: 'text-purple-700' }, `${rowsView.length} de ${rows.length} corridas`))), h('button', { type: 'button', onClick: () => setGaveta(false), 'aria-label': 'Fechar', className: 'w-[34px] h-[34px] border border-gray-200 rounded-lg text-gray-500 text-xl leading-none' }, '×')),
        h('div', { className: 'px-6 py-3 flex items-center gap-2 flex-wrap border-b', style: { background: '#faf5ff', borderColor: '#ede9fe' } }, h('span', { className: 'text-[11px] font-bold uppercase tracking-wide text-purple-700 mr-1' }, 'Presets'),
          presets.map(p => h('span', { key: p.id, className: `inline-flex items-center h-[30px] rounded-full border text-[12px] font-semibold ${presetAtivo === p.id ? 'bg-purple-700 text-white border-purple-700' : 'bg-white border-purple-200 text-purple-900'}` }, h('button', { type: 'button', onClick: () => aplicarPreset(p), className: 'pl-3 pr-1.5 h-full' }, p.nome), h('button', { type: 'button', onClick: () => apagarPreset(p), 'aria-label': `Apagar preset ${p.nome}`, className: 'pr-2.5 pl-1 h-full opacity-60 hover:opacity-100' }, '×'))),
          h('button', { type: 'button', onClick: salvarPreset, className: 'h-[30px] px-3 rounded-full border border-dashed border-purple-300 text-[12px] font-semibold text-purple-700' }, '+ salvar atual')),
        h('div', { className: 'flex-1 overflow-auto px-6 py-2 grid grid-cols-1 md:grid-cols-2 gap-x-7', style: { alignContent: 'start' } },
          h('section', { className: 'py-4 border-b border-gray-100' }, h('div', { className: 'flex items-center gap-2 mb-2.5' }, h('span', { className: 'text-[13px] font-extrabold' }, 'Período'), h('span', { className: 'text-[11px] text-gray-400 ml-auto' }, 'recarrega do servidor')),
            h('div', { className: 'flex items-center gap-2 flex-wrap' }, h('div', { className: 'flex bg-gray-100 rounded-lg p-0.5' }, pills.map(([p, l]) => h('button', { key: p, type: 'button', onClick: () => setPeriodo(p), className: `h-[32px] px-3 rounded-md text-[12.5px] font-semibold ${periodo === p ? 'bg-white shadow-sm text-purple-700' : 'text-gray-500'}` }, l))), periodo === 'custom' && h(React.Fragment, null, h('input', { type: 'date', value: deCustom, 'aria-label': 'De', onChange: e => setDeCustom(e.target.value), className: 'h-[36px] px-2 border border-gray-200 rounded-lg text-[12px]' }), h('span', { className: 'text-gray-400' }, '→'), h('input', { type: 'date', value: ateCustom, 'aria-label': 'Até', onChange: e => setAteCustom(e.target.value), className: 'h-[36px] px-2 border border-gray-200 rounded-lg text-[12px]' })))),
          h('section', { className: 'py-4 border-b border-gray-100 grid grid-cols-2 gap-4' },
            h('div', null, h('div', { className: 'text-[13px] font-extrabold mb-2' }, 'Provedor'), h('div', { className: 'flex flex-wrap gap-1.5' }, (opcoes.provedores || []).map(o => h('button', { key: String(o.v), type: 'button', onClick: () => alternar('provedores', o.v), className: `h-[32px] px-3 rounded-full text-[12px] font-semibold border inline-flex items-center gap-1.5 ${marcado('provedores', o.v) ? 'bg-purple-700 border-purple-700 text-white' : 'bg-white border-gray-200 text-gray-500'}` }, h('span', { className: 'w-2 h-2 rounded-full', style: { background: marcado('provedores', o.v) ? '#fff' : provCor(o.v) } }), fmtProv(o.v), h('span', { className: 'opacity-70' }, o.n))))),
            h('div', null, h('div', { className: 'text-[13px] font-extrabold mb-2' }, 'Canal'), h('div', { className: 'flex flex-wrap gap-1.5' }, (opcoes.canais || []).map(o => h('button', { key: String(o.v), type: 'button', onClick: () => alternar('canais', o.v), className: `h-[32px] px-3 rounded-full text-[12px] font-semibold border ${marcado('canais', o.v) ? 'bg-purple-700 border-purple-700 text-white' : 'bg-white border-gray-200 text-gray-500'}` }, fmtCanal(o.v), ' ', h('span', { className: 'opacity-70' }, o.n)))))),
          h('section', { className: 'py-4 border-b border-gray-100' }, cabecalhoSecao('Cliente', 'clientes'), h('input', { type: 'text', value: f.busca, onChange: e => setF(p => ({ ...p, busca: e.target.value })), placeholder: 'Buscar (OS, cliente, motoboy, endereço, NF…)', className: 'w-full h-[36px] px-3 border border-gray-200 rounded-lg text-[12.5px] mb-2' }), listaOpcoes('clientes', fmtCli, 'grid-cols-2')),
          h('section', { className: 'py-4 border-b border-gray-100' }, h('div', { className: 'flex items-center gap-2 mb-2' }, h('span', { className: 'text-[13px] font-extrabold' }, 'Status'), h('span', { className: 'text-[11px] text-gray-400' }, 'o que aparece é o que soma')), gruposStatus()),
          h('section', { className: 'py-4 border-b border-gray-100 grid grid-cols-2 gap-4' },
            h('div', null, h('div', { className: 'text-[13px] font-extrabold mb-2' }, 'Distância (km)'), h('div', { className: 'flex items-center gap-2' }, h('input', { type: 'number', min: 0, placeholder: 'de', 'aria-label': 'Km de', value: f.kmDe, onChange: e => setF(p => ({ ...p, kmDe: e.target.value })), className: 'w-[80px] h-[36px] px-2 border border-gray-200 rounded-lg text-[12.5px]' }), h('span', { className: 'text-gray-400' }, '–'), h('input', { type: 'number', min: 0, placeholder: 'até', 'aria-label': 'Km até', value: f.kmAte, onChange: e => setF(p => ({ ...p, kmAte: e.target.value })), className: 'w-[80px] h-[36px] px-2 border border-gray-200 rounded-lg text-[12.5px]' }), h('span', { className: 'text-[11px] text-gray-400' }, 'ex.: 5 – 10'))),
            h('div', null, h('div', { className: 'text-[13px] font-extrabold mb-2' }, 'Margem (R$)'), h('div', { className: 'flex items-center gap-2 flex-wrap' }, h('input', { type: 'number', placeholder: 'de', 'aria-label': 'Margem de', value: f.margemDe, onChange: e => setF(p => ({ ...p, margemDe: e.target.value })), className: 'w-[80px] h-[36px] px-2 border border-gray-200 rounded-lg text-[12.5px]' }), h('span', { className: 'text-gray-400' }, '–'), h('input', { type: 'number', placeholder: 'até', 'aria-label': 'Margem até', value: f.margemAte, onChange: e => setF(p => ({ ...p, margemAte: e.target.value })), className: 'w-[80px] h-[36px] px-2 border border-gray-200 rounded-lg text-[12.5px]' }), h('button', { type: 'button', onClick: () => setF(p => ({ ...p, margemDe: '', margemAte: '-0.01' })), className: 'h-[30px] px-2.5 rounded-full border border-red-200 bg-red-50 text-red-700 text-[11.5px] font-bold' }, 'só negativas')))),
          h('section', { className: 'py-4 md:col-span-2' }, h('div', { className: 'flex items-center gap-2 mb-2' }, h('span', { className: 'text-[13px] font-extrabold' }, 'Colunas da tabela'), h('span', { className: 'text-[11px] text-gray-400' }, 'valem pra tela e pro CSV'), h('button', { type: 'button', onClick: () => setCols(new Set(COLS.filter(c => !c.fixa).map(c => c.id))), className: 'ml-auto text-[11px] font-semibold text-purple-600 hover:underline' }, 'todas'), h('button', { type: 'button', onClick: () => setCols(new Set(['data', 'tentativa', 'cliente', 'enderecos', 'motoboy', 'status', 'km', 'valor', 'mapp', 'custo', 'liquido'])), className: 'text-[11px] font-semibold text-gray-500 hover:underline' }, 'padrão')),
            h('div', { className: 'flex flex-wrap gap-1.5' }, COLS.filter(c => !c.fixa).map(c => h('button', { key: c.id, type: 'button', onClick: () => alternarCol(c.id), className: `h-[30px] px-2.5 rounded-lg text-[12px] font-semibold ${colVisivel(c.id) ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}` }, c.rotFiltro || c.rot))))),
        h('div', { className: 'px-6 py-3.5 border-t border-gray-200 flex items-center gap-3' }, h('button', { type: 'button', onClick: limparTudo, className: 'h-[40px] px-3.5 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-500' }, 'Limpar tudo'), h('span', { className: 'ml-auto text-[12px] text-gray-500' }, `${qtdFiltros} filtro${qtdFiltros === 1 ? '' : 's'} ativo${qtdFiltros === 1 ? '' : 's'}`), h('button', { type: 'button', onClick: () => setGaveta(false), className: 'h-[40px] px-4 rounded-lg bg-purple-700 text-white text-[13px] font-extrabold' }, `Ver ${rowsView.length} corridas`))));

    // ── MODAL PDF ──
    const pdfEl = pdfAberto && h('div', { className: 'fixed inset-0 z-50 flex items-center justify-center p-4', style: { background: 'rgba(17,24,39,.45)' }, onMouseDown: (ev) => { if (ev.target === ev.currentTarget && !pdfGerando) setPdfAberto(false); } },
      h('div', { role: 'dialog', 'aria-label': 'Exportar PDF', className: 'bg-white rounded-2xl shadow-2xl w-full overflow-hidden grid', style: { maxWidth: 1320, height: 'min(920px, 94vh)', gridTemplateColumns: 'minmax(360px, 430px) 1fr' } },
        h('div', { className: 'border-r border-gray-200 flex flex-col min-h-0' },
          h('div', { className: 'px-6 py-4 border-b border-gray-200' }, h('h3', { className: 'text-lg font-extrabold text-gray-900' }, 'Exportar PDF'), h('div', { className: 'text-[12px] text-gray-500' }, `Mesmo filtro e visão da tela · ${rowsView.length} corridas · ${fmtDataBR(de)} → ${fmtDataBR(ate)}`)),
          h('div', { className: 'px-6 py-3.5 border-b border-gray-100' }, h('div', { className: 'text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2' }, 'Modelo'), h('div', { className: 'grid grid-cols-2 gap-2' },
            [['interno', 'Interno (completo)', 'tudo, inclusive custos e margem'], ['cliente', 'Para o cliente', 'esconde Mapp, Hub, custo e margem']].map(([id, t, s]) => h('button', { key: id, type: 'button', onClick: () => aplicarModeloPdf(id), className: `h-[56px] rounded-xl text-left px-3 border ${pdfCfg.modelo === id ? 'border-2 border-purple-600 bg-purple-50' : 'border-gray-200 bg-white'}` }, h('div', { className: `text-[13px] font-extrabold ${pdfCfg.modelo === id ? 'text-purple-900' : 'text-gray-700'}` }, t), h('div', { className: `text-[11px] ${pdfCfg.modelo === id ? 'text-purple-600' : 'text-gray-400'}` }, s))))),
          h('div', { className: 'flex-1 overflow-auto px-6 py-1' },
            (function () { const bloco = (titulo, itens, campo, extra) => h('section', { className: 'py-3 border-b border-gray-100' }, h('div', { className: 'flex items-center gap-2 mb-1.5' }, h('span', { className: 'text-[13px] font-extrabold' }, titulo), extra), h('div', { className: 'grid grid-cols-2 gap-x-3' }, itens.map(it => { const on = pdfCfg[campo].has(it.id); const esc = pdfCfg.modelo === 'cliente' && it.interno; return h('label', { key: it.id, className: `flex items-center gap-2 h-[30px] text-[12.5px] cursor-pointer ${esc && !on ? 'text-gray-400 line-through' : 'text-gray-800'}` }, h('input', { type: 'checkbox', checked: on, onChange: () => togglePdf(campo, it.id), className: 'w-[15px] h-[15px] accent-purple-600' }), h('span', { className: 'truncate' }, it.rot), it.interno && h('span', { className: 'text-[9.5px] font-bold px-1.5 rounded-full bg-amber-100 text-amber-800 no-underline', style: { textDecoration: 'none' } }, 'interno')); }))); return h(React.Fragment, null,
              bloco('Cabeçalho', [{ id: 'logo', rot: 'Logo Tutts' }, { id: 'cliente', rot: 'Nome do cliente' }, { id: 'periodo', rot: 'Período' }, { id: 'filtros', rot: 'Filtros aplicados' }], 'cabecalho'),
              bloco('Cards (KPIs)', KPIS, 'kpis', h('span', { className: 'text-[11px] text-gray-400' }, `${pdfCfg.kpis.size} de ${KPIS.length}`)),
              bloco('Gráficos', GRAFICOS, 'graficos'),
              h('section', { className: 'py-3' }, h('div', { className: 'flex items-center gap-2 mb-1.5' }, h('span', { className: 'text-[13px] font-extrabold' }, 'Tabela'), h('label', { className: 'inline-flex items-center gap-1.5 text-[12px] ml-1 cursor-pointer' }, h('input', { type: 'checkbox', checked: pdfCfg.tabela, onChange: e => setPdfCfg(p => ({ ...p, tabela: e.target.checked })), className: 'w-[15px] h-[15px] accent-purple-600' }), 'incluir'), visao === 'corridas' && h('span', { className: 'ml-auto text-[11px] text-gray-400' }, `colunas: ${pdfCfg.colunas.size}`)),
                visao === 'corridas' ? h('div', { className: 'flex flex-wrap gap-1.5' }, COLS.filter(c => !c.fixa).map(c => { const on = pdfCfg.colunas.has(c.id); const escondido = pdfCfg.modelo === 'cliente' && c.interno; return h('button', { key: c.id, type: 'button', onClick: () => togglePdf('colunas', c.id), className: `h-[28px] px-2.5 rounded-lg text-[11.5px] font-semibold ${on ? 'bg-gray-900 text-white' : escondido ? 'bg-amber-50 text-amber-700 line-through' : 'bg-gray-100 text-gray-500'}` }, c.rotFiltro || c.rot); })) : h('div', { className: 'text-[11.5px] text-gray-500' }, visao === 'faixas' ? `Tabela por faixa de km com as métricas escolhidas na tela${pdfCfg.modelo === 'cliente' ? ' (valores internos ficam fora)' : ''}.` : `Tabela por cliente${pdfCfg.modelo === 'cliente' ? ' sem Hub/custo/margem' : ''}.`),
                h('div', { className: 'text-[11px] text-gray-400 mt-2' }, 'Riscado = escondido pelo modelo “Para o cliente”. Dá pra reativar um a um.'))); })()),
          h('div', { className: 'px-6 py-3.5 border-t border-gray-200 flex items-center gap-2.5' }, h('label', { className: 'inline-flex items-center gap-2 text-[12px] text-gray-700 cursor-pointer' }, h('input', { type: 'checkbox', checked: pdfCfg.lembrar, onChange: e => setPdfCfg(p => ({ ...p, lembrar: e.target.checked })), className: 'w-[15px] h-[15px] accent-purple-600' }), 'Lembrar no preset'), h('button', { type: 'button', disabled: pdfGerando, onClick: () => setPdfAberto(false), className: 'ml-auto h-[40px] px-3.5 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-500' }, 'Cancelar'), h('button', { type: 'button', disabled: pdfGerando, onClick: gerarPdf, className: 'h-[40px] px-4 rounded-lg bg-purple-700 text-white text-[13px] font-extrabold inline-flex items-center gap-2 disabled:opacity-60' }, Ico('download', 15), pdfGerando ? 'Gerando…' : 'Gerar PDF'))),
        h('div', { className: 'bg-gray-100 flex flex-col min-h-0' }, h('div', { className: 'px-6 py-3 text-[12px] text-gray-500 flex items-center gap-2' }, h('b', { className: 'text-gray-700' }, 'Prévia'), 'A4 paisagem · o arquivo sai idêntico', h('span', { className: 'ml-auto' }, `${rowsView.length} linhas`)), h('div', { className: 'flex-1 overflow-auto px-6 pb-6' }, h(PreviewPdf, { html: gerarHtmlPdf() })))));

    // ── página ──
    return h('div', { className: 'max-w-[1400px] mx-auto p-4 space-y-3.5' },
      h('div', { className: 'flex items-start gap-3 flex-wrap' },
        h('div', { className: 'flex-1 min-w-[260px]' }, h('h2', { className: 'text-2xl font-bold text-gray-800' }, 'Relatório de corridas'), h('p', { className: 'text-xs text-gray-500 mt-0.5' }, 'OS, endereços, motoboy, km, valor do Hub, custo do provedor e líquido — ou agregado por faixa de km / por cliente.')),
        h('button', { type: 'button', onClick: carregar, title: 'Recarregar', className: 'h-[38px] w-[38px] border border-gray-200 rounded-lg bg-white text-gray-600 inline-flex items-center justify-center' }, Ico('refresh', 16)),
        h('button', { type: 'button', onClick: salvarPreset, className: 'h-[38px] px-3.5 border border-gray-200 rounded-lg bg-white text-[13px] font-semibold text-gray-700 inline-flex items-center gap-2' }, Ico('save', 15), 'Salvar como preset'),
        h('button', { type: 'button', onClick: baixarCSV, className: 'h-[38px] px-3.5 border border-gray-200 rounded-lg bg-white text-[13px] font-semibold text-gray-700 inline-flex items-center gap-2' }, Ico('download', 15), 'CSV'),
        h('button', { type: 'button', onClick: () => setPdfAberto(true), className: 'h-[38px] px-3.5 rounded-lg text-[13px] font-bold inline-flex items-center gap-2', style: { border: '1px solid #ddd6fe', background: '#f5f3ff', color: '#6d28d9' } }, Ico('filetext', 15), 'PDF')),

      // BARRA DE FILTROS
      h('div', { ref: barraRef, className: 'bg-white rounded-2xl border border-gray-200 px-3 py-2.5 space-y-2.5' },
        h('div', { className: 'flex items-center gap-2 flex-wrap' },
          h('div', { className: 'flex bg-gray-100 rounded-lg p-0.5' }, pills.map(([p, l]) => h('button', { key: p, type: 'button', onClick: () => setPeriodo(p), className: `h-[30px] px-3 rounded-md text-[12px] font-semibold ${periodo === p ? 'bg-white shadow-sm text-purple-700' : 'text-gray-500'}` }, p === 'custom' && periodo === 'custom' ? `${fmtDia(deCustom)} → ${fmtDia(ateCustom)}` : l))),
          periodo === 'custom' && h('span', { className: 'inline-flex items-center gap-1' }, h('input', { type: 'date', value: deCustom, 'aria-label': 'De', onChange: e => setDeCustom(e.target.value), className: 'h-[32px] px-2 border border-gray-200 rounded-lg text-[12px]' }), h('span', { className: 'text-gray-400' }, '→'), h('input', { type: 'date', value: ateCustom, 'aria-label': 'Até', onChange: e => setAteCustom(e.target.value), className: 'h-[32px] px-2 border border-gray-200 rounded-lg text-[12px]' })),
          h('div', { className: 'w-px h-6 bg-gray-200' }),
          h('div', { className: 'relative' }, chip('clientes', 'Cliente', resumoSel('clientes', fmtCli), f.clientes !== null), popover('clientes', h('div', null, cabecalhoSecao('Cliente', 'clientes'), listaOpcoes('clientes', fmtCli)), 340)),
          h('div', { className: 'relative' }, chip('status', 'Status', statusModo === 'faturaveis' ? 'faturáveis' : statusModo === 'todas' ? 'todas' : [...f.status].length + ' etapas', statusModo !== 'faturaveis'), popover('status', h('div', null, h('div', { className: 'text-[13px] font-extrabold mb-2' }, 'Status'), gruposStatus()), 440)),
          h('div', { className: 'relative' }, chip('provedores', 'Provedor', resumoSel('provedores', fmtProv), f.provedores !== null), popover('provedores', h('div', null, cabecalhoSecao('Provedor', 'provedores'), listaOpcoes('provedores', fmtProv)), 260)),
          false && h('div', { className: 'relative' }, chip('canais', 'Canal', resumoSel('canais', fmtCanal), f.canais !== null), popover('canais', h('div', null, cabecalhoSecao('Canal', 'canais'), listaOpcoes('canais', fmtCanal)), 240)),
          false && h('div', { className: 'relative' }, chip('km', 'Faixa de km', (num(f.kmDe) != null || num(f.kmAte) != null) ? `${f.kmDe || 0} – ${f.kmAte || '∞'}` : 'qualquer', num(f.kmDe) != null || num(f.kmAte) != null), popover('km', h('div', { className: 'space-y-2' }, h('div', { className: 'text-[13px] font-extrabold' }, 'Distância (km)'), h('div', { className: 'flex items-center gap-2' }, h('input', { type: 'number', min: 0, placeholder: 'de', 'aria-label': 'Km de', value: f.kmDe, onChange: e => setF(p => ({ ...p, kmDe: e.target.value })), className: 'w-[80px] h-[36px] px-2 border border-gray-200 rounded-lg text-[12.5px]' }), h('span', { className: 'text-gray-400' }, '–'), h('input', { type: 'number', min: 0, placeholder: 'até', 'aria-label': 'Km até', value: f.kmAte, onChange: e => setF(p => ({ ...p, kmAte: e.target.value })), className: 'w-[80px] h-[36px] px-2 border border-gray-200 rounded-lg text-[12.5px]' })), h('div', { className: 'flex flex-wrap gap-1.5' }, [[0, 5], [5, 10], [10, 15], [15, 20], [20, null]].map(([a, b]) => h('button', { key: a, type: 'button', onClick: () => setF(p => ({ ...p, kmDe: String(a), kmAte: b == null ? '' : String(b) })), className: 'h-[28px] px-2.5 rounded-full bg-gray-100 text-[11.5px] font-semibold text-gray-700' }, b == null ? `${a}+` : `${a}–${b}`))), h('button', { type: 'button', onClick: () => setF(p => ({ ...p, kmDe: '', kmAte: '' })), className: 'text-[11px] font-semibold text-gray-500 hover:underline' }, 'limpar')), 300)),
          false && h('div', { className: 'relative' }, chip('margem', 'Margem', (num(f.margemDe) != null || num(f.margemAte) != null) ? `${f.margemDe || '−∞'} – ${f.margemAte || '∞'}` : 'qualquer', num(f.margemDe) != null || num(f.margemAte) != null), popover('margem', h('div', { className: 'space-y-2' }, h('div', { className: 'text-[13px] font-extrabold' }, 'Margem (R$)'), h('div', { className: 'flex items-center gap-2' }, h('input', { type: 'number', placeholder: 'de', 'aria-label': 'Margem de', value: f.margemDe, onChange: e => setF(p => ({ ...p, margemDe: e.target.value })), className: 'w-[80px] h-[36px] px-2 border border-gray-200 rounded-lg text-[12.5px]' }), h('span', { className: 'text-gray-400' }, '–'), h('input', { type: 'number', placeholder: 'até', 'aria-label': 'Margem até', value: f.margemAte, onChange: e => setF(p => ({ ...p, margemAte: e.target.value })), className: 'w-[80px] h-[36px] px-2 border border-gray-200 rounded-lg text-[12.5px]' })), h('div', { className: 'flex gap-1.5' }, h('button', { type: 'button', onClick: () => setF(p => ({ ...p, margemDe: '', margemAte: '-0.01' })), className: 'h-[28px] px-2.5 rounded-full border border-red-200 bg-red-50 text-red-700 text-[11.5px] font-bold' }, 'só negativas'), h('button', { type: 'button', onClick: () => setF(p => ({ ...p, margemDe: '', margemAte: '' })), className: 'text-[11px] font-semibold text-gray-500 hover:underline' }, 'limpar'))), 300)),
          h('button', { type: 'button', onClick: () => setGaveta(true), className: `h-[34px] px-3 rounded-full border text-[12.5px] font-semibold inline-flex items-center gap-1.5 ${(f.canais !== null || num(f.kmDe) != null || num(f.kmAte) != null || num(f.margemDe) != null || num(f.margemAte) != null) ? 'border-purple-300 bg-purple-50 text-purple-900' : 'border-dashed border-gray-300 bg-white text-gray-600'}` }, Ico('filter', 13), 'Mais filtros', (f.canais !== null || num(f.kmDe) != null || num(f.kmAte) != null || num(f.margemDe) != null || num(f.margemAte) != null) && h('span', { className: 'w-2 h-2 rounded-full bg-purple-600' })),
          h('div', { className: 'ml-auto relative', style: { width: 280 } }, h('span', { className: 'absolute left-3 top-2.5 text-gray-400' }, Ico('search', 14)), h('input', { type: 'text', value: f.busca, onChange: e => setF(p => ({ ...p, busca: e.target.value })), placeholder: 'OS, cliente, motoboy, endereço…', 'aria-label': 'Buscar', className: 'w-full h-[34px] pl-8 pr-3 border border-gray-200 rounded-full text-[12.5px]' }))),
        ativosChips.length > 0 && h('div', { className: 'flex items-center gap-2 flex-wrap text-[12px]' },
          h('span', { className: 'text-gray-400 font-semibold' }, 'Ativos:'),
          ativosChips.map((c, i) => h('span', { key: i, className: 'inline-flex items-center gap-1.5 pl-2.5 pr-2 py-1 rounded-lg bg-purple-100 text-purple-900 font-semibold' }, c.rot, h('button', { type: 'button', onClick: c.del, 'aria-label': 'Remover ' + c.rot, className: 'text-purple-600 font-extrabold' }, '×'))),
          h('button', { type: 'button', onClick: limparTudo, className: 'text-gray-500 font-semibold underline' }, 'limpar tudo'))),

      // VISÃO + contagem + preset
      h('div', { className: 'flex items-center gap-3 flex-wrap' },
        h('div', { className: 'flex bg-gray-200 rounded-lg p-0.5' }, [['corridas', 'list', 'Corridas'], ['faixas', 'chart', 'Por faixa de km'], ['clientes', 'building', 'Por cliente']].map(([id, ic, rot]) => h('button', { key: id, type: 'button', onClick: () => setVisao(id), className: `h-[32px] px-3.5 rounded-md text-[13px] font-semibold inline-flex items-center gap-2 ${visao === id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'}` }, Ico(ic, 14), rot))),
        h('span', { className: 'text-[12.5px] text-gray-500' }, h('b', { className: 'text-gray-800' }, `${rowsView.length} corridas`), statusModo === 'faturaveis' ? ` faturáveis · ${rows.length - rows.filter(r => STATUS_FATURAVEIS.includes(r.status)).length} canceladas/em andamento fora` : statusModo === 'todas' ? ' (todas as etapas)' : ' nas etapas escolhidas'),
        h('span', { className: 'ml-auto text-[12px] text-gray-500 inline-flex items-center gap-1.5' }, 'Preset: ', presetAtivo && presets.find(p => p.id === presetAtivo) ? h('span', { className: 'px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold' }, presets.find(p => p.id === presetAtivo).nome) : h('b', { className: 'text-gray-700' }, 'nenhum'), presets.length > 0 && h('select', { 'aria-label': 'Aplicar preset', value: '', onChange: e => { const p = presets.find(x => String(x.id) === e.target.value); if (p) aplicarPreset(p); }, className: 'h-[28px] border border-gray-200 rounded-lg text-[12px] px-1.5 bg-white' }, h('option', { value: '' }, 'aplicar…'), presets.map(p => h('option', { key: p.id, value: p.id }, p.nome))))),

      // KPIs
      h('div', { className: 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3' },
        kpiCard('Corridas', String(totais.corridas), null, `${totais.entregues} entregues${statusModo === 'faturaveis' ? ' · só faturáveis' : ''}`),
        kpiCard('KM total', kmF(totais.km), null, `${kmF(totais.corridas ? totais.km / totais.corridas : 0)} km por corrida`),
        kpiCard('Tempo médio de atendimento', fmtMin(totais.tempoMedio), 'text-purple-800', `mediana ${fmtMin(totais.tempoMediana)} · ${pctF(totais.pctPrazo)} no prazo (${totais.avaliadas} aval.)`, 'bg-purple-50 border-purple-200 text-purple-700'),
        kpiCard('Valor Mapp', brlS(totais.mapp), 'text-gray-700', totais.semMapp ? `${totais.semMapp} sem valor Mapp` : 'o que a OS trazia'),
        kpiCard('Valor do Hub (regra)', brlS(totais.hub), 'text-purple-900', totais.mapp > 0 ? `${totais.hub - totais.mapp >= 0 ? '+' : '−'} ${brlS(Math.abs(totais.hub - totais.mapp))} vs Mapp (${pctF(Math.abs((totais.hub - totais.mapp) / totais.mapp * 100), 1)})` : null, 'bg-purple-50 border-purple-200 text-purple-700'),
        kpiCard('Margem (Hub − provedor)', (totais.margem >= 0 ? '+ ' : '− ') + brlS(Math.abs(totais.margem)), totais.margem >= 0 ? 'text-emerald-700' : 'text-rose-600', `custo ${brlS(totais.custo)} · ticket ${brlS(totais.ticket)}${totais.hub ? ` · ${pctF(totais.margem / totais.hub * 100, 1)}` : ''}`, 'bg-emerald-50 border-emerald-200 text-emerald-700')),

      loading ? h('div', { className: 'flex items-center justify-center py-16' }, h('div', { className: 'animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full' }))
        : visao === 'corridas' ? h('div', { className: 'bg-white rounded-2xl border border-gray-200 overflow-hidden' }, tabelaCorridas(), h('div', { className: 'px-4 py-2 text-[11px] text-gray-400 border-t border-gray-100 flex gap-3' }, h('span', null, `${rowsView.length} linhas (uma por tentativa)`), h('span', { className: 'ml-auto' }, `Colunas: ${colsVis.length} de ${COLS.length} · ajustar em “Todos os filtros”`)))
        : visao === 'faixas' ? visaoFaixas() : visaoClientes(),
      gavetaEl, pdfEl);
  }

  window.ModuloLogisticaRelatorio = TabRelatorioV2;
})();
