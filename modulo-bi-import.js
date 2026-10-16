/* BI_IMPORT_REDESIGN_V1 */
/**
 * modulo-bi-import.js — Aba "Importação" do BI
 * ============================================================================
 * Tela única da importação de dados do BI (redesign 2026-10):
 *   - Status da fila + 3 cartões: última importação, próxima automática, OS em aberto
 *   - "Importar uma data agora" (Hoje / Ontem / outra data) — o agente baixa e sobe
 *   - Importação em andamento (etapas) + fila com "Cancelar"
 *   - Histórico único (automáticas, reprocessos, manuais) com filtros,
 *     "Tentar de novo" e "Ver log" nas falhas
 *   - "Ferramentas avançadas" recolhidas: upload manual (reserva) e recalcular prazos
 *
 * Endpoints (backend /api/agent/...):
 *   GET    /agent/bi-import/painel
 *   POST   /agent/bi-import                     { data_referencia }
 *   GET    /agent/bi-import/historico?page&per_page&status&origem&data_referencia
 *   POST   /agent/bi-import/reprocessar-abertas
 *   POST   /agent/bi-import/:id/tentar-novamente
 *   DELETE /agent/bi-import/:id                 (só pendente)
 *
 * Props: { API_URL, fetchAuth, showToast,
 *          onUploadManual(event), uploadManualStatus, onRecalcularPrazos, recalculando }
 * Mantém o nome window.BiImportAutoTab (já referenciado no app.js).
 * ============================================================================
 */
(function () {
  'use strict';

  const { useState, useEffect, useCallback, useRef } = React;
  const h = React.createElement;

  const PER_PAGE = 30;
  const TZ = 'America/Bahia';

  // ── helpers ─────────────────────────────────────────────────────────────
  function ico(nome, tam, extra) {
    return h('svg', { className: 'ico', style: Object.assign({ width: tam || 16, height: tam || 16, flexShrink: 0 }, extra || {}), 'aria-hidden': 'true' },
      h('use', { href: '#i-' + nome }));
  }
  function hojeISO(offsetDias) {
    const d = new Date(Date.now() - (offsetDias || 0) * 86400000);
    return d.toLocaleDateString('en-CA', { timeZone: TZ });
  }
  function isoDe(v) {
    if (!v) return '';
    return typeof v === 'string' ? v.slice(0, 10) : new Date(v).toISOString().slice(0, 10);
  }
  function fmtDataRef(v) {
    const s = isoDe(v);
    if (!s) return '—';
    const [a, m, d] = s.split('-');
    return d + '/' + m + '/' + a;
  }
  function fmtDiaMes(v) {
    const s = isoDe(v);
    if (!s) return '—';
    const [, m, d] = s.split('-');
    return d + '/' + m;
  }
  // "Hoje, 12:31" | "Ontem, 18:00" | "06/10, 12:00"
  function fmtQuando(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '—';
    const dia = d.toLocaleDateString('en-CA', { timeZone: TZ });
    const hora = d.toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
    if (dia === hojeISO(0)) return 'Hoje, ' + hora;
    if (dia === hojeISO(1)) return 'Ontem, ' + hora;
    return fmtDiaMes(dia) + ', ' + hora;
  }
  function fmtNum(n) { return (Number(n) || 0).toLocaleString('pt-BR'); }
  function limparNome(nome) {
    if (!nome) return '—';
    if (/^Sistema/i.test(nome)) return 'Sistema';
    return String(nome).replace(/\s*\(reprocesso manual\)\s*$/i, '');
  }
  function primeiraLinha(txt, max) {
    const l = String(txt || '').split('\n').find(x => x.trim()) || '';
    return l.length > (max || 140) ? l.slice(0, max || 140) + '…' : l;
  }

  // BI_ABAS_V1: tons da paleta (cinza/roxo/verde/azul/âmbar/vermelho) — sem emerald/sky/violet
  const TIPOS = {
    manual:     { label: 'Manual',            tom: 'cinza' },
    cron:       { label: 'Fechamento D-1',    tom: 'roxo' },
    cron_dia:   { label: 'Automática do dia', tom: 'verde' },
    reprocesso: { label: 'Reprocesso',        tom: 'azul' },
  };
  const STATUS = {
    sucesso:     { label: 'Sucesso',     tom: 'verde' },
    falhou:      { label: 'Falhou',      tom: 'vermelho' },
    processando: { label: 'Importando',  tom: 'roxo' },
    pendente:    { label: 'Na fila',     tom: 'ambar' },
  };
  const FILTROS = [
    { id: 'todas',      label: 'Todas',       params: {} },
    { id: 'auto',       label: 'Automáticas', params: { origem: 'cron,cron_dia' } },
    { id: 'reprocesso', label: 'Reprocessos', params: { origem: 'reprocesso' } },
    { id: 'manual',     label: 'Manuais',     params: { origem: 'manual' } },
    { id: 'falhas',     label: 'Falhas',      params: { status: 'falhou' } },
  ];
  // etapa_atual → passo 1..4 (Entrar / Baixar / Tratar / Atualizar BI)
  function passoDaEtapa(etapa, progresso) {
    if (etapa === 'enviando_bi') return 4;
    if (etapa === 'processando_planilha') return 3;
    if (etapa === 'concluido') return (progresso || 0) >= 70 ? 3 : 2;
    if (['navegando', 'configurando_filtros', 'buscando', 'gerando_excel', 'baixando'].includes(etapa)) return 2;
    return 1;
  }
  const PASSOS = ['Entrar no sistema', 'Baixar planilha', 'Tratar dados', 'Atualizar o BI'];

  // Status = pílula suave (fundo 50 + texto 800 + ponto 6px 600)
  const TONS = {
    roxo: ['#faf7fd', '#5d0b85', '#770fa8'], verde: ['#f0fdf4', '#166534', '#16a34a'], ambar: ['#fffbeb', '#92400e', '#d97706'],
    vermelho: ['#fef2f2', '#991b1b', '#dc2626'], azul: ['#eff6ff', '#1e40af', '#2563eb'], cinza: ['#f3f4f6', '#374151', '#9ca3af'],
  };
  function Pill(props) {
    const t = TONS[props.tom] || TONS.cinza;
    return h('span', { role: props.role, className: 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap', style: { background: t[0], color: t[1] } },
      h('span', { style: { width: 6, height: 6, borderRadius: 999, background: t[2], flexShrink: 0 } }), props.children);
  }

  // ── componente ─────────────────────────────────────────────────────────
  function BiImportAutoTab(props) {
    const { API_URL, fetchAuth } = props;
    const toast = props.showToast || ((m) => alert(m));

    const [painel, setPainel] = useState(null);
    const [dados, setDados] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [filtro, setFiltro] = useState('todas');
    const [filtroData, setFiltroData] = useState('');
    const [carregandoHist, setCarregandoHist] = useState(false);
    const [escolha, setEscolha] = useState('hoje');
    const [dataOutra, setDataOutra] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [reprocessando, setReprocessando] = useState(false);
    const [acaoId, setAcaoId] = useState(null);
    const [logAberto, setLogAberto] = useState(null);
    const [avancadoAberto, setAvancadoAberto] = useState(false);

    const filaIdsRef = useRef('');
    const histRef = useRef({ page: 1, filtro: 'todas', filtroData: '' });
    histRef.current = { page, filtro, filtroData };

    const carregarHistorico = useCallback(async (pg, f, d) => {
      const alvoPg = pg || 1;
      const alvoF = f || 'todas';
      setCarregandoHist(true);
      try {
        const params = new URLSearchParams({ page: alvoPg, per_page: PER_PAGE });
        const cfg = FILTROS.find(x => x.id === alvoF) || FILTROS[0];
        Object.keys(cfg.params).forEach(k => params.set(k, cfg.params[k]));
        if (d) params.set('data_referencia', d);
        const r = await fetchAuth(API_URL + '/agent/bi-import/historico?' + params);
        const j = await r.json();
        if (!r.ok) throw new Error(j.erro || 'HTTP ' + r.status);
        setDados(j.registros || []);
        setTotal(j.total || 0);
        setPage(alvoPg);
      } catch (e) {
        toast('Não foi possível carregar o histórico. Tente atualizar a página.', 'error');
      } finally {
        setCarregandoHist(false);
      }
    }, [API_URL, fetchAuth]);

    const carregarPainel = useCallback(async () => {
      try {
        const r = await fetchAuth(API_URL + '/agent/bi-import/painel');
        if (!r.ok) return;
        const j = await r.json();
        setPainel(j);
        // quando a fila muda (job terminou/entrou), atualiza o histórico também
        const ids = (j.fila || []).map(x => x.id + ':' + x.status).join(',');
        if (filaIdsRef.current && filaIdsRef.current !== ids) {
          const c = histRef.current;
          carregarHistorico(c.page, c.filtro, c.filtroData);
        }
        filaIdsRef.current = ids || '-';
      } catch (e) { /* silencioso — tenta de novo no próximo ciclo */ }
    }, [API_URL, fetchAuth, carregarHistorico]);

    useEffect(() => { carregarPainel(); carregarHistorico(1, 'todas', ''); }, []);

    // polling: 5s com fila ativa, 60s parada
    const filaAtiva = !!(painel && painel.fila && painel.fila.length);
    useEffect(() => {
      const t = setInterval(carregarPainel, filaAtiva ? 5000 : 60000);
      return () => clearInterval(t);
    }, [filaAtiva, carregarPainel]);

    // ── ações ──
    const dataEscolhida = escolha === 'hoje' ? hojeISO(0) : escolha === 'ontem' ? hojeISO(1) : dataOutra;

    async function importar() {
      if (!dataEscolhida) { toast('Escolha a data que deseja importar.', 'error'); return; }
      setEnviando(true);
      try {
        const r = await fetchAuth(API_URL + '/agent/bi-import', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data_referencia: dataEscolhida }),
        });
        const j = await r.json();
        if (!r.ok) { toast(j.erros ? j.erros.join(' ') : (j.erro || 'Não foi possível enfileirar. Tente de novo.'), 'error'); return; }
        toast('Importação de ' + fmtDataRef(dataEscolhida) + ' enfileirada.', 'success');
        carregarPainel();
        carregarHistorico(1, filtro, filtroData);
      } catch (e) {
        toast('Falha de conexão ao enfileirar. Tente de novo.', 'error');
      } finally {
        setEnviando(false);
      }
    }

    async function reprocessar() {
      setReprocessando(true);
      try {
        const r = await fetchAuth(API_URL + '/agent/bi-import/reprocessar-abertas', { method: 'POST' });
        const j = await r.json();
        if (!r.ok) { toast(j.erro || 'Não foi possível agendar o reprocesso. Tente de novo.', 'error'); return; }
        toast(j.mensagem || 'Reprocesso agendado.', j.criados && j.criados.length ? 'success' : 'info');
        carregarPainel();
        carregarHistorico(1, filtro, filtroData);
      } catch (e) {
        toast('Falha de conexão ao agendar o reprocesso.', 'error');
      } finally {
        setReprocessando(false);
      }
    }

    async function tentarDeNovo(item) {
      setAcaoId(item.id);
      try {
        const r = await fetchAuth(API_URL + '/agent/bi-import/' + item.id + '/tentar-novamente', { method: 'POST' });
        const j = await r.json();
        if (!r.ok) { toast(j.erro || 'Não foi possível tentar de novo.', 'error'); return; }
        toast('Nova tentativa de ' + fmtDataRef(item.data_referencia) + ' enfileirada.', 'success');
        carregarPainel();
        carregarHistorico(1, filtro, filtroData);
      } catch (e) {
        toast('Falha de conexão. Tente de novo.', 'error');
      } finally {
        setAcaoId(null);
      }
    }

    async function cancelar(item) {
      setAcaoId(item.id);
      try {
        const r = await fetchAuth(API_URL + '/agent/bi-import/' + item.id, { method: 'DELETE' });
        const j = await r.json();
        if (!r.ok) { toast(j.erro || 'Não foi possível cancelar.', 'error'); return; }
        toast('Importação de ' + fmtDataRef(item.data_referencia) + ' removida da fila.', 'success');
        carregarPainel();
        carregarHistorico(page, filtro, filtroData);
      } catch (e) {
        toast('Falha de conexão. Tente de novo.', 'error');
      } finally {
        setAcaoId(null);
      }
    }

    function trocarFiltro(id) {
      setFiltro(id);
      setLogAberto(null);
      carregarHistorico(1, id, filtroData);
    }
    function trocarData(v) {
      setFiltroData(v);
      carregarHistorico(1, filtro, v);
    }

    // ── derivados ──
    const fila = (painel && painel.fila) || [];
    const emAndamento = fila.find(x => x.status === 'processando') || null;
    const naFila = fila.filter(x => x.status === 'pendente');
    const abertas = painel && painel.abertas;
    const ultima = painel && painel.ultima;
    const proxima = painel && painel.proxima;
    const u24 = (painel && painel.ultimas_24h) || { sucesso: 0, falhou: 0 };
    const totalPaginas = Math.max(1, Math.ceil(total / PER_PAGE));

    // ── render ──  (BI_ABAS_V1: padrão clean — cabeçalho Sora 24, faixa de KPIs, cards brancos, tabela padrão)
    const cartao = 'bg-white border border-gray-200 rounded-[14px]';
    const btnSec = 'inline-flex items-center justify-center gap-1.5 px-3 h-9 rounded-[10px] text-[13px] font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap';
    const btnPri = 'inline-flex items-center justify-center gap-1.5 px-4 h-10 rounded-[10px] text-[13px] font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap';
    const kpiCell = { flex: '1 1 220px', padding: '16px 20px', borderRight: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6', marginBottom: -1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 };
    const kpiLbl = { fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 };
    const kpiNum = { fontFamily: 'Sora, Inter, sans-serif', fontSize: 24, fontWeight: 700, color: '#111827', lineHeight: 1.25, fontVariantNumeric: 'tabular-nums' };
    const kpiSub = { fontSize: 11.5, color: '#6b7280' };
    const h3 = 'text-[15px] font-semibold text-gray-900';

    return h('div', { className: 'flex flex-col gap-4', style: { fontVariantNumeric: 'tabular-nums', color: '#111827' } },

      // Cabeçalho
      h('div', { className: 'flex items-end justify-between gap-3 flex-wrap' },
        h('div', { className: 'min-w-0' },
          h('h1', { style: { margin: 0, fontFamily: 'Sora, Inter, sans-serif', fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em', color: '#111827' } }, 'Importação de dados'),
          h('p', { style: { margin: '4px 0 0', fontSize: 13, color: '#6b7280' } }, 'O agente baixa a planilha do sistema, trata os dados e atualiza o BI. Tudo o que entra aparece no histórico abaixo.')
        ),
        filaAtiva
          ? h(Pill, { tom: 'roxo', role: 'status' },
              emAndamento ? ('Importando · ' + fila.length + ' na fila') : (fila.length + ' na fila'))
          : h(Pill, { tom: 'verde', role: 'status' }, 'Fila vazia')
      ),

      // Faixa de KPIs
      h('section', { 'aria-label': 'Resumo', className: cartao, style: { display: 'flex', flexWrap: 'wrap', overflow: 'hidden' } },
        h('div', { style: kpiCell },
          h('div', { style: kpiLbl }, 'Última importação'),
          h('div', { style: kpiNum }, ultima ? fmtQuando(ultima.finalizado_em) : (painel ? 'Nenhuma ainda' : '…')),
          h('div', { style: kpiSub }, ultima
            ? (fmtDiaMes(ultima.data_referencia) + ' · ' + fmtNum(ultima.linhas_inseridas) + ' linhas · ' + (limparNome(ultima.usuario_nome) === 'Sistema' ? 'automática' : 'por ' + limparNome(ultima.usuario_nome)))
            : '')
        ),
        h('div', { style: kpiCell },
          h('div', { style: kpiLbl }, 'Próxima automática'),
          h('div', { style: kpiNum },
            proxima ? ((proxima.quando.slice(0, 10) === hojeISO(0) ? '' : fmtDiaMes(proxima.quando) + ', ') + proxima.quando.slice(11, 16)) : (painel ? '—' : '…')),
          h('div', { style: kpiSub }, proxima
            ? (proxima.tipo === 'fechamento'
                ? (proxima.fecha_fim_de_semana ? 'Fecha sexta, sábado e domingo' : 'Fecha o dia anterior (' + fmtDiaMes(proxima.data_referencia) + ')')
                : 'Atualiza o dia (' + fmtDiaMes(proxima.data_referencia) + ')')
            : (painel ? 'Horário automático não identificado' : ''))
        ),
        h('div', { style: Object.assign({}, kpiCell, { borderRight: 0 }) },
          h('div', { style: kpiLbl }, 'OS em aberto no BI'),
          h('div', { className: 'flex items-center justify-between gap-3 flex-wrap' },
            h('div', { style: kpiNum },
              abertas ? fmtNum(abertas.total_os) + ' OS ' : (painel ? '—' : '…'),
              abertas && abertas.total_os > 0 && h('span', { style: { fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, color: '#6b7280' } }, 'em ' + abertas.datas.length + (abertas.datas.length === 1 ? ' data' : ' datas'))
            ),
            h('button', {
              type: 'button', onClick: reprocessar,
              disabled: reprocessando || !abertas || abertas.total_os === 0,
              className: btnSec,
            }, ico('refresh', 15), reprocessando ? 'Agendando...' : 'Reprocessar agora')
          ),
          h('div', { style: kpiSub },
            abertas && abertas.total_os > 0
              ? abertas.datas.slice(0, 4).map(x => fmtDiaMes(x.data_ref) + ' (' + x.qtd_os + (x.em_fila ? ', na fila' : '') + ')').join(' · ') + (abertas.datas.length > 4 ? ' · …' : '')
              : 'Reimportadas sozinhas a cada hora, das 9h às 19h')
        )
      ),

      // Importação em andamento
      emAndamento && (function () {
        const passo = passoDaEtapa(emAndamento.etapa_atual, emAndamento.progresso);
        const pct = Math.max(0, Math.min(100, emAndamento.progresso || 0));
        const tipo = TIPOS[emAndamento.origem] || TIPOS.manual;
        return h('section', { 'aria-labelledby': 'imp-agora', className: cartao + ' p-5 flex flex-col gap-4' },
          h('div', { className: 'flex items-start justify-between gap-4 flex-wrap' },
            h('div', null,
              h('div', { className: 'flex items-center gap-2 flex-wrap' }, h(Pill, { tom: 'roxo' }, 'Importando agora'), h(Pill, { tom: tipo.tom }, tipo.label)),
              h('h3', { id: 'imp-agora', className: 'text-[15px] font-semibold text-gray-900 mt-2' }, fmtDataRef(emAndamento.data_referencia)),
              h('p', { className: 'text-[13px] text-gray-500 mt-0.5' },
                (limparNome(emAndamento.usuario_nome) === 'Sistema' ? 'Automática' : 'Pedido por ' + limparNome(emAndamento.usuario_nome)) +
                ' · costuma levar de 3 a 5 minutos')
            ),
            h('div', { style: { fontFamily: 'Sora, Inter, sans-serif', fontSize: 24, fontWeight: 700, color: '#5d0b85' } }, pct + '%')
          ),
          h('div', { className: 'h-2 rounded-full bg-gray-100 overflow-hidden', role: 'progressbar', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': 'Progresso da importação' },
            h('div', { className: 'h-full rounded-full transition-all duration-500', style: { width: pct + '%', background: '#770fa8' } })
          ),
          h('ol', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3' },
            PASSOS.map((nome, i) => {
              const n = i + 1;
              const feito = n < passo, atual = n === passo;
              return h('li', { key: n, className: 'flex items-center gap-2.5 p-3 rounded-[10px] border ' + (atual ? 'border-purple-200 bg-purple-50' : 'border-gray-200 bg-white') },
                h('span', { className: 'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0', style: feito ? { background: '#f0fdf4', color: '#166534' } : atual ? { background: '#770fa8', color: '#ffffff' } : { background: '#f3f4f6', color: '#6b7280' } },
                  feito ? ico('check', 13) : String(n)),
                h('span', null,
                  h('span', { className: 'block text-[13px] font-semibold text-gray-900' }, nome),
                  h('span', { className: 'block text-xs', style: { color: feito ? '#166534' : atual ? '#5d0b85' : '#6b7280' } },
                    feito ? (n === 2 && emAndamento.total_linhas ? fmtNum(emAndamento.total_linhas) + ' linhas' : 'Feito') : atual ? 'Em andamento' : 'Aguardando')
                )
              );
            })
          )
        );
      })(),

      // Na fila
      naFila.length > 0 && h('section', { 'aria-labelledby': 'imp-fila', className: cartao + ' overflow-hidden' },
        h('div', { className: 'px-5 py-3.5 border-b border-gray-100' },
          h('h3', { id: 'imp-fila', className: h3 }, 'Na fila (' + naFila.length + ')')
        ),
        h('ul', null, naFila.map((item, i) => {
          const tipo = TIPOS[item.origem] || TIPOS.manual;
          return h('li', { key: item.id, className: 'px-5 py-3 flex items-center gap-4 flex-wrap text-[13px] ' + (i > 0 ? 'border-t border-gray-100' : '') },
            h('span', { className: 'font-semibold text-gray-900 w-28' }, fmtDataRef(item.data_referencia)),
            h(Pill, { tom: tipo.tom }, tipo.label),
            h('span', { className: 'flex-1 min-w-[200px] text-[13px] text-gray-700' }, item.detalhe || (limparNome(item.usuario_nome) === 'Sistema' ? 'Automática' : 'Pedido por ' + limparNome(item.usuario_nome))),
            h('span', { className: 'text-[13px] text-gray-500' }, 'Aguardando · ' + (i + (emAndamento ? 2 : 1)) + 'º'),
            h('button', {
              type: 'button', onClick: () => cancelar(item), disabled: acaoId === item.id,
              className: btnSec,
            }, acaoId === item.id ? 'Cancelando...' : 'Cancelar')
          );
        }))
      ),

      // Importar uma data agora
      h('section', { 'aria-labelledby': 'imp-data', className: cartao + ' p-5 flex flex-col gap-4' },
        h('div', null,
          h('h3', { id: 'imp-data', className: h3 }, 'Importar uma data agora'),
          h('p', { className: 'text-[13px] text-gray-500 mt-0.5' }, 'O agente baixa a planilha dessa data e substitui as OS que já estão no BI pelos dados atuais.')
        ),
        h('div', { className: 'flex items-end gap-3 flex-wrap' },
          h('div', { className: 'flex flex-col gap-1.5' },
            h('span', { className: 'text-xs font-semibold text-gray-700' }, 'Data'),
            h('div', { role: 'group', 'aria-label': 'Atalhos de data', className: 'inline-flex bg-gray-100 rounded-[10px] p-1 gap-0.5' },
              [['hoje', 'Hoje · ' + fmtDiaMes(hojeISO(0))], ['ontem', 'Ontem · ' + fmtDiaMes(hojeISO(1))]].map(([id, label]) =>
                h('button', {
                  key: id, type: 'button', onClick: () => setEscolha(id), 'aria-pressed': escolha === id,
                  className: 'px-3 h-[30px] rounded-lg text-[13px] transition ' +
                    (escolha === id ? 'bg-white font-semibold text-purple-800 border border-gray-200' : 'font-medium text-gray-600 border border-transparent hover:text-gray-900'),
                }, label))
            )
          ),
          h('div', { className: 'flex flex-col gap-1.5' },
            h('label', { htmlFor: 'imp-outra-data', className: 'text-xs font-semibold text-gray-700' }, 'Outra data'),
            h('input', {
              id: 'imp-outra-data', type: 'date', value: dataOutra, max: hojeISO(0),
              onChange: (e) => { setDataOutra(e.target.value); setEscolha(e.target.value ? 'outra' : 'hoje'); },
              className: 'px-3 h-[38px] border rounded-[10px] text-[13px] bg-white ' + (escolha === 'outra' ? 'border-purple-500 ring-2 ring-purple-100' : 'border-gray-200'),
            })
          ),
          h('div', { className: 'flex-1' }),
          h('button', {
            type: 'button', onClick: importar, disabled: enviando || !dataEscolhida,
            className: btnPri, style: { background: '#770fa8' },
          }, enviando ? 'Enfileirando...' : h(React.Fragment, null, ico('download', 15), 'Importar ' + (dataEscolhida ? fmtDiaMes(dataEscolhida) : '')))
        ),
        h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-gray-100' },
          [
            ['clock', 'De hora em hora, 9h–19h', 'Atualiza o dia de hoje (seg a sex)'],
            ['calendar', '12h fecha o dia anterior', 'Segunda fecha sexta, sábado e domingo'],
            ['refresh', 'Reprocesso de OS em aberto', 'Reimporta datas com OS sem finalização (até 7 dias)'],
          ].map(([icone, titulo, sub]) => h('div', { key: titulo, className: 'flex gap-2.5 items-start' },
            h('span', { className: 'mt-0.5', style: { color: '#6b7280' } }, ico(icone, 16)),
            h('span', null,
              h('span', { className: 'block text-[13px] font-semibold text-gray-900' }, titulo),
              h('span', { className: 'block text-xs text-gray-500 mt-0.5' }, sub))
          ))
        )
      ),

      // Histórico
      h('section', { 'aria-labelledby': 'imp-hist', className: cartao + ' overflow-hidden' },
        h('div', { className: 'px-5 py-4 flex items-center justify-between gap-3 flex-wrap border-b border-gray-100' },
          h('div', null,
            h('h3', { id: 'imp-hist', className: h3 }, 'Histórico de importações'),
            h('p', { className: 'text-[13px] text-gray-500 mt-0.5' },
              fmtNum(painel ? painel.total : total) + ' importações · últimas 24h: ' + u24.sucesso + ' com sucesso, ' + u24.falhou + ' com falha')
          ),
          h('div', { className: 'flex gap-2 items-center flex-wrap' },
            h('div', { role: 'group', 'aria-label': 'Filtrar por tipo', className: 'flex flex-wrap bg-gray-100 rounded-[10px] p-1 gap-0.5' },
              FILTROS.map(f => h('button', {
                key: f.id, type: 'button', onClick: () => trocarFiltro(f.id), 'aria-pressed': filtro === f.id,
                className: 'px-3 h-[30px] rounded-lg text-[13px] transition ' +
                  (filtro === f.id ? 'bg-white font-semibold text-purple-800 border border-gray-200' : 'font-medium border border-transparent ' + (f.id === 'falhas' && u24.falhou > 0 ? 'text-red-800' : 'text-gray-600') + ' hover:text-gray-900'),
              }, f.id === 'falhas' && u24.falhou > 0 ? f.label + ' (' + u24.falhou + ')' : f.label))
            ),
            h('label', { htmlFor: 'imp-filtro-data', className: 'sr-only' }, 'Filtrar por data de referência'),
            h('input', {
              id: 'imp-filtro-data', type: 'date', value: filtroData,
              onChange: (e) => trocarData(e.target.value),
              className: 'px-3 h-[38px] border border-gray-200 rounded-[10px] text-[13px] bg-white',
            }),
            filtroData && h('button', { type: 'button', onClick: () => trocarData(''), className: btnSec }, 'Limpar data')
          )
        ),
        h('div', { className: 'overflow-x-auto relative' },
          h('table', { className: 'w-full text-[13px]', style: { minWidth: 980, borderCollapse: 'collapse' } },
            h('thead', null,
              h('tr', { className: 'text-left text-xs text-gray-500 bg-gray-50' },
                h('th', { className: 'px-5 py-2.5 font-semibold' }, 'Data ref.'),
                h('th', { className: 'px-3 py-2.5 font-semibold' }, 'Tipo'),
                h('th', { className: 'px-3 py-2.5 font-semibold' }, 'Status'),
                h('th', { className: 'px-3 py-2.5 font-semibold' }, 'Resultado'),
                h('th', { className: 'px-3 py-2.5 font-semibold' }, 'Por'),
                h('th', { className: 'px-3 py-2.5 font-semibold' }, 'Quando'),
                h('th', { className: 'px-5 py-2.5' }, h('span', { className: 'sr-only' }, 'Ações'))
              )
            ),
            h('tbody', null,
              dados.length === 0
                ? h('tr', null, h('td', { colSpan: 7, className: 'px-6 py-10 text-center text-gray-500 border-t border-gray-100' },
                    carregandoHist ? 'Carregando...' : (filtro !== 'todas' || filtroData ? 'Nenhuma importação com esses filtros.' : 'Nenhuma importação ainda. Use "Importar uma data agora" acima.')))
                : dados.flatMap(item => {
                    const tipo = TIPOS[item.origem] || TIPOS.manual;
                    const st = STATUS[item.status] || { label: item.status, tom: 'cinza' };
                    const falhou = item.status === 'falhou';
                    const linhas = [
                      h('tr', { key: item.id, className: 'border-t border-gray-100 hover:bg-gray-50' },
                        h('td', { className: 'px-5 py-3 font-semibold text-gray-900 whitespace-nowrap' }, fmtDataRef(item.data_referencia)),
                        h('td', { className: 'px-3 py-3' }, h(Pill, { tom: tipo.tom }, tipo.label)),
                        h('td', { className: 'px-3 py-3' }, h(Pill, { tom: st.tom }, st.label)),
                        h('td', { className: 'px-3 py-3' },
                          item.status === 'sucesso'
                            ? h(React.Fragment, null,
                                h('div', { className: 'font-semibold text-gray-900' }, fmtNum(item.linhas_inseridas) + ' linhas'),
                                item.detalhe && h('div', { className: 'text-gray-500 text-xs mt-0.5' }, item.detalhe))
                            : falhou
                              ? h('div', { className: 'font-medium', style: { color: '#991b1b' } }, primeiraLinha(item.erro, 120) || 'Falhou sem mensagem de erro')
                              : h('div', { className: 'text-gray-600' }, item.detalhe || (item.status === 'processando' ? 'Em andamento (' + (item.progresso || 0) + '%)' : 'Aguardando na fila'))
                        ),
                        h('td', { className: 'px-3 py-3 text-gray-700' }, limparNome(item.usuario_nome)),
                        h('td', { className: 'px-3 py-3 text-gray-500 whitespace-nowrap' }, fmtQuando(item.finalizado_em || item.criado_em)),
                        h('td', { className: 'px-5 py-3 text-right whitespace-nowrap' },
                          falhou && h('button', {
                            type: 'button', onClick: () => tentarDeNovo(item), disabled: acaoId === item.id,
                            className: btnSec,
                          }, ico('refresh', 14), acaoId === item.id ? 'Enfileirando...' : 'Tentar de novo'),
                          item.erro && h('button', {
                            type: 'button', onClick: () => setLogAberto(logAberto === item.id ? null : item.id), 'aria-expanded': logAberto === item.id,
                            className: btnSec + ' ml-1.5',
                          }, logAberto === item.id ? 'Ocultar log' : 'Ver log')
                        )
                      ),
                    ];
                    if (logAberto === item.id && item.erro) {
                      linhas.push(h('tr', { key: item.id + '-log', className: 'bg-gray-50' },
                        h('td', { colSpan: 7, className: 'px-5 py-3' },
                          h('div', { className: 'flex items-center justify-between mb-1.5' },
                            h('span', { className: 'text-xs font-semibold text-gray-600' }, 'Log do agente · importação #' + item.id),
                            h('button', {
                              type: 'button',
                              onClick: () => { try { navigator.clipboard.writeText(item.erro); toast('Log copiado.', 'success'); } catch (e) {} },
                              className: 'inline-flex items-center gap-1 text-xs font-semibold text-purple-700 hover:underline',
                            }, ico('copy', 13), 'Copiar log')
                          ),
                          h('pre', { className: 'text-xs text-gray-700 bg-white border border-gray-200 rounded-[10px] p-3 whitespace-pre-wrap break-words max-h-64 overflow-y-auto font-mono' }, item.erro)
                        )
                      ));
                    }
                    return linhas;
                  })
            )
          )
        ),
        h('div', { className: 'px-5 py-3 flex items-center justify-between gap-3 flex-wrap border-t border-gray-100 text-[13px] text-gray-500' },
          h('span', null, total > 0 ? ('Mostrando ' + ((page - 1) * PER_PAGE + 1) + '–' + Math.min(page * PER_PAGE, total) + ' de ' + fmtNum(total)) : ''),
          h('div', { className: 'flex gap-1.5' },
            h('button', { type: 'button', disabled: page <= 1 || carregandoHist, onClick: () => carregarHistorico(page - 1, filtro, filtroData), className: btnSec }, ico('arrowleft', 14), 'Anterior'),
            h('button', { type: 'button', disabled: page >= totalPaginas || carregandoHist, onClick: () => carregarHistorico(page + 1, filtro, filtroData), className: btnSec }, 'Próxima', ico('arrowright', 14))
          )
        )
      ),

      // Ferramentas avançadas
      (props.onUploadManual || props.onRecalcularPrazos) && h('section', { 'aria-labelledby': 'imp-avancado', className: cartao },
        h('button', {
          type: 'button', onClick: () => setAvancadoAberto(!avancadoAberto), 'aria-expanded': avancadoAberto, 'aria-controls': 'imp-avancado-corpo',
          className: 'w-full px-5 py-4 min-h-[56px] flex items-center justify-between gap-3 text-left ' + (avancadoAberto ? 'border-b border-gray-100' : ''),
        },
          h('span', null,
            h('span', { id: 'imp-avancado', className: 'block ' + h3 }, 'Ferramentas avançadas'),
            h('span', { className: 'block text-[13px] text-gray-500 mt-0.5' }, 'Subir planilha à mão e recalcular prazos. Use só se o agente estiver fora do ar.')
          ),
          ico('arrowdown', 18, { color: '#6b7280', transform: avancadoAberto ? 'rotate(180deg)' : 'none', transition: 'transform .15s' })
        ),
        avancadoAberto && h('div', { id: 'imp-avancado-corpo', className: 'p-5 grid grid-cols-1 md:grid-cols-2 gap-4' },
          props.onUploadManual && h('div', { className: 'border border-dashed border-gray-300 rounded-[14px] p-5 flex flex-col gap-2.5 items-start' },
            h('div', { className: 'flex items-center gap-2' },
              h('span', { style: { color: '#6b7280' } }, ico('upload', 16)),
              h('span', { className: 'text-[13px] font-semibold text-gray-900' }, 'Subir planilha manualmente')
            ),
            h('p', { className: 'text-[13px] text-gray-500' }, 'Selecione o arquivo .xlsx exportado do sistema. As OS da planilha substituem as que já estão no BI.'),
            props.uploadManualStatus
              ? h('p', { className: 'text-[13px] font-semibold text-purple-800', role: 'status' }, props.uploadManualStatus)
              : h(React.Fragment, null,
                  h('input', { id: 'imp-upload-manual', type: 'file', accept: '.xlsx,.xls', multiple: true, className: 'sr-only', onChange: props.onUploadManual }),
                  h('label', { htmlFor: 'imp-upload-manual', className: btnSec + ' cursor-pointer' }, ico('filetext', 15), 'Selecionar arquivo')
                )
          ),
          props.onRecalcularPrazos && h('div', { className: 'border border-gray-200 rounded-[14px] p-5 flex flex-col gap-2.5 items-start' },
            h('div', { className: 'flex items-center gap-2' },
              h('span', { style: { color: '#6b7280' } }, ico('clock', 16)),
              h('span', { className: 'text-[13px] font-semibold text-gray-900' }, 'Recalcular prazos')
            ),
            h('p', { className: 'text-[13px] text-gray-500' }, 'Refaz o prazo do cliente e do profissional de todo o histórico. Use depois de mudar as faixas de prazo em Configurações.'),
            h('button', {
              type: 'button', onClick: props.onRecalcularPrazos, disabled: !!props.recalculando,
              className: btnSec,
            }, ico('refresh', 15), props.recalculando ? 'Recalculando...' : 'Recalcular prazos')
          )
        )
      )
    );
  }

  window.BiImportAutoTab = BiImportAutoTab;
})();
