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

  const TIPOS = {
    manual:     { label: 'Manual',            cls: 'bg-blue-50 text-blue-700' },
    cron:       { label: 'Fechamento D-1',    cls: 'bg-violet-50 text-violet-700' },
    cron_dia:   { label: 'Automática do dia', cls: 'bg-emerald-50 text-emerald-700' },
    reprocesso: { label: 'Reprocesso',        cls: 'bg-sky-50 text-sky-700' },
  };
  const STATUS = {
    sucesso:     { label: 'Sucesso',     cls: 'bg-green-50 text-green-700' },
    falhou:      { label: 'Falhou',      cls: 'bg-red-50 text-red-700' },
    processando: { label: 'Importando',  cls: 'bg-violet-50 text-violet-700' },
    pendente:    { label: 'Na fila',     cls: 'bg-gray-100 text-gray-700' },
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

  function Pill(props) {
    return h('span', { className: 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ' + props.cls }, props.children);
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

    // ── render ──
    const cartao = 'bg-white border border-violet-100 rounded-2xl';
    const btnSec = 'inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[36px] rounded-lg text-sm font-semibold border bg-white transition disabled:opacity-50 disabled:cursor-not-allowed';

    return h('div', { className: 'flex flex-col gap-5', style: { fontVariantNumeric: 'tabular-nums' } },

      // Cabeçalho
      h('div', { className: 'flex items-end justify-between gap-4 flex-wrap' },
        h('div', null,
          h('h2', { className: 'text-2xl font-extrabold text-gray-900 tracking-tight' }, 'Importação de dados'),
          h('p', { className: 'text-sm text-gray-500 mt-1' }, 'O agente baixa a planilha do sistema, trata os dados e atualiza o BI. Tudo o que entra aparece no histórico abaixo.')
        ),
        filaAtiva
          ? h('span', { className: 'inline-flex items-center gap-2 text-sm font-bold text-violet-700 bg-violet-50 border border-violet-200 px-3 py-2 rounded-full', role: 'status' },
              h('span', { className: 'w-2 h-2 rounded-full bg-violet-600 animate-pulse' }),
              emAndamento ? ('Importando · ' + fila.length + (fila.length === 1 ? ' na fila' : ' na fila')) : (fila.length + ' na fila'))
          : h('span', { className: 'inline-flex items-center gap-2 text-sm font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-full', role: 'status' },
              h('span', { className: 'w-2 h-2 rounded-full bg-green-600' }), 'Fila vazia')
      ),

      // Cartões de resumo
      h('section', { 'aria-label': 'Resumo', className: 'grid grid-cols-1 md:grid-cols-3 gap-4' },
        h('div', { className: cartao + ' p-5 flex flex-col gap-2' },
          h('div', { className: 'flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wide' }, ico('check'), 'Última importação'),
          h('div', { className: 'text-2xl font-extrabold text-gray-900' }, ultima ? fmtQuando(ultima.finalizado_em) : (painel ? 'Nenhuma ainda' : '…')),
          h('div', { className: 'text-sm text-gray-500' }, ultima
            ? (fmtDiaMes(ultima.data_referencia) + ' · ' + fmtNum(ultima.linhas_inseridas) + ' linhas · ' + (limparNome(ultima.usuario_nome) === 'Sistema' ? 'automática' : 'por ' + limparNome(ultima.usuario_nome)))
            : '')
        ),
        h('div', { className: cartao + ' p-5 flex flex-col gap-2' },
          h('div', { className: 'flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wide' }, ico('clock'), 'Próxima automática'),
          h('div', { className: 'text-2xl font-extrabold text-gray-900' },
            proxima ? ((proxima.quando.slice(0, 10) === hojeISO(0) ? '' : fmtDiaMes(proxima.quando) + ', ') + proxima.quando.slice(11, 16)) : (painel ? '—' : '…')),
          h('div', { className: 'text-sm text-gray-500' }, proxima
            ? (proxima.tipo === 'fechamento'
                ? (proxima.fecha_fim_de_semana ? 'Fecha sexta, sábado e domingo' : 'Fecha o dia anterior (' + fmtDiaMes(proxima.data_referencia) + ')')
                : 'Atualiza o dia (' + fmtDiaMes(proxima.data_referencia) + ')')
            : (painel ? 'Horário automático não identificado' : ''))
        ),
        h('div', { className: 'bg-violet-50/60 border border-violet-200 rounded-2xl p-5 flex flex-col gap-2' },
          h('div', { className: 'flex items-center gap-2 text-xs font-bold text-violet-700 uppercase tracking-wide' }, ico('refresh'), 'OS em aberto no BI'),
          h('div', { className: 'flex items-baseline justify-between gap-3 flex-wrap' },
            h('div', { className: 'text-2xl font-extrabold text-gray-900' },
              abertas ? fmtNum(abertas.total_os) + ' OS ' : (painel ? '—' : '…'),
              abertas && abertas.total_os > 0 && h('span', { className: 'text-sm font-semibold text-gray-500' }, 'em ' + abertas.datas.length + (abertas.datas.length === 1 ? ' data' : ' datas'))
            ),
            h('button', {
              type: 'button', onClick: reprocessar,
              disabled: reprocessando || !abertas || abertas.total_os === 0,
              className: btnSec + ' text-violet-700 border-violet-300 hover:bg-violet-50',
            }, reprocessando ? 'Agendando...' : 'Reprocessar agora')
          ),
          h('div', { className: 'text-sm text-gray-500' },
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
        return h('section', { 'aria-labelledby': 'imp-agora', className: 'bg-white border border-violet-200 rounded-2xl p-5 md:p-6 flex flex-col gap-4 shadow-sm' },
          h('div', { className: 'flex items-start justify-between gap-4 flex-wrap' },
            h('div', null,
              h('div', { className: 'text-xs font-bold text-violet-700 uppercase tracking-wide' }, 'Importando agora'),
              h('h3', { id: 'imp-agora', className: 'text-xl font-extrabold text-gray-900 mt-1' },
                fmtDataRef(emAndamento.data_referencia) + ' · ' + tipo.label),
              h('p', { className: 'text-sm text-gray-500 mt-1' },
                (limparNome(emAndamento.usuario_nome) === 'Sistema' ? 'Automática' : 'Pedido por ' + limparNome(emAndamento.usuario_nome)) +
                ' · costuma levar de 3 a 5 minutos')
            ),
            h('div', { className: 'text-3xl font-extrabold text-violet-700' }, pct + '%')
          ),
          h('div', { className: 'h-2.5 rounded-full bg-violet-100 overflow-hidden', role: 'progressbar', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': 'Progresso da importação' },
            h('div', { className: 'h-full rounded-full bg-violet-600 transition-all duration-500', style: { width: pct + '%' } })
          ),
          h('ol', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3' },
            PASSOS.map((nome, i) => {
              const n = i + 1;
              const feito = n < passo, atual = n === passo;
              return h('li', { key: n, className: 'flex items-center gap-2.5 p-3 rounded-xl ' + (feito ? 'bg-green-50' : atual ? 'bg-violet-50 ring-2 ring-violet-300' : 'bg-gray-50') },
                h('span', { className: 'w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0 ' + (feito ? 'bg-green-600 text-white' : atual ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-500') },
                  feito ? ico('check', 14) : String(n)),
                h('span', null,
                  h('span', { className: 'block text-sm font-bold text-gray-900' }, nome),
                  h('span', { className: 'block text-xs ' + (feito ? 'text-green-700' : atual ? 'text-violet-700' : 'text-gray-500') },
                    feito ? (n === 2 && emAndamento.total_linhas ? fmtNum(emAndamento.total_linhas) + ' linhas' : 'Feito') : atual ? 'Em andamento' : 'Aguardando')
                )
              );
            })
          )
        );
      })(),

      // Na fila
      naFila.length > 0 && h('section', { 'aria-labelledby': 'imp-fila', className: cartao + ' overflow-hidden' },
        h('div', { className: 'px-6 py-4 border-b border-violet-50' },
          h('h3', { id: 'imp-fila', className: 'text-base font-extrabold text-gray-900' }, 'Na fila (' + naFila.length + ')')
        ),
        h('ul', null, naFila.map((item, i) => {
          const tipo = TIPOS[item.origem] || TIPOS.manual;
          return h('li', { key: item.id, className: 'px-6 py-3.5 flex items-center gap-4 flex-wrap border-b border-violet-50 last:border-b-0' },
            h('span', { className: 'font-extrabold text-gray-900 w-28' }, fmtDataRef(item.data_referencia)),
            h(Pill, { cls: tipo.cls }, tipo.label),
            h('span', { className: 'flex-1 min-w-[200px] text-sm text-gray-700' }, item.detalhe || (limparNome(item.usuario_nome) === 'Sistema' ? 'Automática' : 'Pedido por ' + limparNome(item.usuario_nome))),
            h('span', { className: 'text-sm text-gray-500' }, 'Aguardando · ' + (i + (emAndamento ? 2 : 1)) + 'º'),
            h('button', {
              type: 'button', onClick: () => cancelar(item), disabled: acaoId === item.id,
              className: btnSec + ' text-gray-700 border-gray-200 hover:bg-gray-50',
            }, acaoId === item.id ? 'Cancelando...' : 'Cancelar')
          );
        }))
      ),

      // Importar uma data agora
      h('section', { 'aria-labelledby': 'imp-data', className: cartao + ' p-5 md:p-6 flex flex-col gap-4' },
        h('div', null,
          h('h3', { id: 'imp-data', className: 'text-lg font-extrabold text-gray-900' }, 'Importar uma data agora'),
          h('p', { className: 'text-sm text-gray-500 mt-1' }, 'O agente baixa a planilha dessa data e substitui as OS que já estão no BI pelos dados atuais.')
        ),
        h('div', { className: 'flex items-end gap-3 flex-wrap' },
          h('div', { role: 'group', 'aria-label': 'Atalhos de data', className: 'flex gap-2 flex-wrap' },
            [['hoje', 'Hoje · ' + fmtDiaMes(hojeISO(0))], ['ontem', 'Ontem · ' + fmtDiaMes(hojeISO(1))]].map(([id, label]) =>
              h('button', {
                key: id, type: 'button', onClick: () => setEscolha(id), 'aria-pressed': escolha === id,
                className: 'px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-bold border transition ' +
                  (escolha === id ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'),
              }, label))
          ),
          h('div', { className: 'flex flex-col gap-1.5' },
            h('label', { htmlFor: 'imp-outra-data', className: 'text-xs font-bold text-gray-500' }, 'Outra data'),
            h('input', {
              id: 'imp-outra-data', type: 'date', value: dataOutra, max: hojeISO(0),
              onChange: (e) => { setDataOutra(e.target.value); setEscolha(e.target.value ? 'outra' : 'hoje'); },
              className: 'px-3 py-2.5 min-h-[44px] border rounded-xl text-sm bg-white ' + (escolha === 'outra' ? 'border-violet-500 ring-2 ring-violet-200' : 'border-gray-200'),
            })
          ),
          h('div', { className: 'flex-1' }),
          h('button', {
            type: 'button', onClick: importar, disabled: enviando || !dataEscolhida,
            className: 'inline-flex items-center gap-2 px-6 py-3 min-h-[48px] rounded-xl text-base font-extrabold text-white bg-violet-700 hover:bg-violet-800 transition disabled:opacity-50 disabled:cursor-not-allowed',
          }, enviando ? 'Enfileirando...' : h(React.Fragment, null, ico('download', 18), 'Importar ' + (dataEscolhida ? fmtDiaMes(dataEscolhida) : '')))
        ),
        h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-violet-50' },
          [
            ['clock', 'bg-green-50 text-green-700', 'De hora em hora, 9h–19h', 'Atualiza o dia de hoje (seg a sex)'],
            ['calendar', 'bg-violet-50 text-violet-700', '12h fecha o dia anterior', 'Segunda fecha sexta, sábado e domingo'],
            ['refresh', 'bg-sky-50 text-sky-700', 'Reprocesso de OS em aberto', 'Reimporta datas com OS sem finalização (até 7 dias)'],
          ].map(([icone, cor, titulo, sub]) => h('div', { key: titulo, className: 'flex gap-2.5 items-start' },
            h('span', { className: 'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ' + cor }, ico(icone)),
            h('span', null,
              h('span', { className: 'block text-sm font-bold text-gray-900' }, titulo),
              h('span', { className: 'block text-xs text-gray-500 mt-0.5' }, sub))
          ))
        )
      ),

      // Histórico
      h('section', { 'aria-labelledby': 'imp-hist', className: cartao + ' overflow-hidden' },
        h('div', { className: 'px-6 py-4 flex items-center justify-between gap-3 flex-wrap border-b border-violet-50' },
          h('div', null,
            h('h3', { id: 'imp-hist', className: 'text-lg font-extrabold text-gray-900' }, 'Histórico de importações'),
            h('p', { className: 'text-sm text-gray-500 mt-1' },
              fmtNum(painel ? painel.total : total) + ' importações · últimas 24h: ' + u24.sucesso + ' com sucesso, ' + u24.falhou + (u24.falhou === 1 ? ' com falha' : ' com falha'))
          ),
          h('div', { className: 'flex gap-2 items-center flex-wrap' },
            h('div', { role: 'group', 'aria-label': 'Filtrar por tipo', className: 'flex flex-wrap bg-gray-100 rounded-xl p-1 gap-0.5' },
              FILTROS.map(f => h('button', {
                key: f.id, type: 'button', onClick: () => trocarFiltro(f.id), 'aria-pressed': filtro === f.id,
                className: 'px-3 py-1.5 min-h-[36px] rounded-lg text-sm transition ' +
                  (filtro === f.id ? 'bg-white font-bold text-gray-900 shadow-sm' : 'font-semibold ' + (f.id === 'falhas' ? 'text-red-700' : 'text-gray-500') + ' hover:text-gray-800'),
              }, f.id === 'falhas' && u24.falhou > 0 ? f.label + ' (' + u24.falhou + ')' : f.label))
            ),
            h('label', { htmlFor: 'imp-filtro-data', className: 'sr-only' }, 'Filtrar por data de referência'),
            h('input', {
              id: 'imp-filtro-data', type: 'date', value: filtroData,
              onChange: (e) => trocarData(e.target.value),
              className: 'px-3 py-2 min-h-[40px] border border-gray-200 rounded-xl text-sm bg-white',
            }),
            filtroData && h('button', { type: 'button', onClick: () => trocarData(''), className: btnSec + ' text-gray-600 border-gray-200 hover:bg-gray-50' }, 'Limpar data')
          )
        ),
        h('div', { className: 'overflow-x-auto' },
          h('table', { className: 'w-full text-sm', style: { minWidth: 980 } },
            h('thead', null,
              h('tr', { className: 'text-left text-xs text-gray-500 uppercase tracking-wide' },
                h('th', { className: 'px-6 py-3 font-bold' }, 'Data ref.'),
                h('th', { className: 'px-3 py-3 font-bold' }, 'Tipo'),
                h('th', { className: 'px-3 py-3 font-bold' }, 'Status'),
                h('th', { className: 'px-3 py-3 font-bold' }, 'Resultado'),
                h('th', { className: 'px-3 py-3 font-bold' }, 'Por'),
                h('th', { className: 'px-3 py-3 font-bold' }, 'Quando'),
                h('th', { className: 'px-6 py-3' }, h('span', { className: 'sr-only' }, 'Ações'))
              )
            ),
            h('tbody', null,
              dados.length === 0
                ? h('tr', null, h('td', { colSpan: 7, className: 'px-6 py-10 text-center text-gray-500' },
                    carregandoHist ? 'Carregando...' : (filtro !== 'todas' || filtroData ? 'Nenhuma importação com esses filtros.' : 'Nenhuma importação ainda. Use "Importar uma data agora" acima.')))
                : dados.flatMap(item => {
                    const tipo = TIPOS[item.origem] || TIPOS.manual;
                    const st = STATUS[item.status] || { label: item.status, cls: 'bg-gray-100 text-gray-700' };
                    const falhou = item.status === 'falhou';
                    const linhas = [
                      h('tr', { key: item.id, className: 'border-t border-violet-50 ' + (falhou ? 'bg-red-50/40' : 'hover:bg-gray-50') },
                        h('td', { className: 'px-6 py-3.5 font-extrabold text-gray-900 whitespace-nowrap' }, fmtDataRef(item.data_referencia)),
                        h('td', { className: 'px-3 py-3.5' }, h(Pill, { cls: tipo.cls }, tipo.label)),
                        h('td', { className: 'px-3 py-3.5' }, h(Pill, { cls: st.cls }, st.label)),
                        h('td', { className: 'px-3 py-3.5' },
                          item.status === 'sucesso'
                            ? h(React.Fragment, null,
                                h('div', { className: 'font-bold text-gray-900' }, fmtNum(item.linhas_inseridas) + ' linhas'),
                                item.detalhe && h('div', { className: 'text-sky-700 mt-0.5' }, item.detalhe))
                            : falhou
                              ? h('div', { className: 'text-red-700 font-semibold' }, primeiraLinha(item.erro, 120) || 'Falhou sem mensagem de erro')
                              : h('div', { className: 'text-gray-600' }, item.detalhe || (item.status === 'processando' ? 'Em andamento (' + (item.progresso || 0) + '%)' : 'Aguardando na fila'))
                        ),
                        h('td', { className: 'px-3 py-3.5 text-gray-700' }, limparNome(item.usuario_nome)),
                        h('td', { className: 'px-3 py-3.5 text-gray-500 whitespace-nowrap' }, fmtQuando(item.finalizado_em || item.criado_em)),
                        h('td', { className: 'px-6 py-3.5 text-right whitespace-nowrap' },
                          falhou && h('button', {
                            type: 'button', onClick: () => tentarDeNovo(item), disabled: acaoId === item.id,
                            className: btnSec + ' text-violet-700 border-violet-200 hover:bg-violet-50',
                          }, acaoId === item.id ? 'Enfileirando...' : 'Tentar de novo'),
                          item.erro && h('button', {
                            type: 'button', onClick: () => setLogAberto(logAberto === item.id ? null : item.id), 'aria-expanded': logAberto === item.id,
                            className: btnSec + ' ml-1.5 text-gray-700 border-gray-200 hover:bg-gray-50',
                          }, logAberto === item.id ? 'Ocultar log' : 'Ver log')
                        )
                      ),
                    ];
                    if (logAberto === item.id && item.erro) {
                      linhas.push(h('tr', { key: item.id + '-log', className: 'bg-gray-50' },
                        h('td', { colSpan: 7, className: 'px-6 py-3' },
                          h('div', { className: 'flex items-center justify-between mb-1.5' },
                            h('span', { className: 'text-xs font-bold text-gray-600' }, 'Log do agente · importação #' + item.id),
                            h('button', {
                              type: 'button',
                              onClick: () => { try { navigator.clipboard.writeText(item.erro); toast('Log copiado.', 'success'); } catch (e) {} },
                              className: 'text-xs font-semibold text-violet-700 hover:underline',
                            }, 'Copiar log')
                          ),
                          h('pre', { className: 'text-xs text-red-800 bg-white border border-gray-200 rounded-lg p-3 whitespace-pre-wrap break-words max-h-64 overflow-y-auto' }, item.erro)
                        )
                      ));
                    }
                    return linhas;
                  })
            )
          )
        ),
        h('div', { className: 'px-6 py-3.5 flex items-center justify-between gap-3 flex-wrap border-t border-violet-50 text-sm text-gray-500' },
          h('span', null, total > 0 ? ('Mostrando ' + ((page - 1) * PER_PAGE + 1) + '–' + Math.min(page * PER_PAGE, total) + ' de ' + fmtNum(total)) : ''),
          h('div', { className: 'flex gap-1.5' },
            h('button', { type: 'button', disabled: page <= 1 || carregandoHist, onClick: () => carregarHistorico(page - 1, filtro, filtroData), className: btnSec + ' text-gray-700 border-gray-200 hover:bg-gray-50' }, 'Anterior'),
            h('button', { type: 'button', disabled: page >= totalPaginas || carregandoHist, onClick: () => carregarHistorico(page + 1, filtro, filtroData), className: btnSec + ' text-gray-700 border-gray-200 hover:bg-gray-50' }, 'Próxima')
          )
        )
      ),

      // Ferramentas avançadas
      (props.onUploadManual || props.onRecalcularPrazos) && h('section', { 'aria-labelledby': 'imp-avancado', className: cartao },
        h('button', {
          type: 'button', onClick: () => setAvancadoAberto(!avancadoAberto), 'aria-expanded': avancadoAberto, 'aria-controls': 'imp-avancado-corpo',
          className: 'w-full px-6 py-4 min-h-[56px] flex items-center justify-between gap-3 text-left ' + (avancadoAberto ? 'border-b border-violet-50' : ''),
        },
          h('span', null,
            h('span', { id: 'imp-avancado', className: 'block text-base font-extrabold text-gray-900' }, 'Ferramentas avançadas'),
            h('span', { className: 'block text-sm text-gray-500 mt-0.5' }, 'Subir planilha à mão e recalcular prazos. Use só se o agente estiver fora do ar.')
          ),
          ico('arrowdown', 20, { color: '#6b7280', transform: avancadoAberto ? 'rotate(180deg)' : 'none', transition: 'transform .15s' })
        ),
        avancadoAberto && h('div', { id: 'imp-avancado-corpo', className: 'p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4' },
          props.onUploadManual && h('div', { className: 'border-2 border-dashed border-violet-200 rounded-2xl p-5 flex flex-col gap-2.5 items-start' },
            h('div', { className: 'flex items-center gap-2.5' },
              h('span', { className: 'w-9 h-9 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center' }, ico('upload', 18)),
              h('span', { className: 'text-sm font-extrabold text-gray-900' }, 'Subir planilha manualmente')
            ),
            h('p', { className: 'text-sm text-gray-500' }, 'Selecione o arquivo .xlsx exportado do sistema. As OS da planilha substituem as que já estão no BI.'),
            props.uploadManualStatus
              ? h('p', { className: 'text-sm font-semibold text-violet-700', role: 'status' }, props.uploadManualStatus)
              : h(React.Fragment, null,
                  h('input', { id: 'imp-upload-manual', type: 'file', accept: '.xlsx,.xls', multiple: true, className: 'sr-only', onChange: props.onUploadManual }),
                  h('label', { htmlFor: 'imp-upload-manual', className: btnSec + ' cursor-pointer text-gray-800 border-gray-300 hover:bg-gray-50' }, ico('filetext'), 'Selecionar arquivo')
                )
          ),
          props.onRecalcularPrazos && h('div', { className: 'border border-violet-100 rounded-2xl p-5 flex flex-col gap-2.5 items-start' },
            h('div', { className: 'flex items-center gap-2.5' },
              h('span', { className: 'w-9 h-9 rounded-xl bg-orange-50 text-orange-700 flex items-center justify-center' }, ico('clock', 18)),
              h('span', { className: 'text-sm font-extrabold text-gray-900' }, 'Recalcular prazos')
            ),
            h('p', { className: 'text-sm text-gray-500' }, 'Refaz o prazo do cliente e do profissional de todo o histórico. Use depois de mudar as faixas de prazo em Configurações.'),
            h('button', {
              type: 'button', onClick: props.onRecalcularPrazos, disabled: !!props.recalculando,
              className: btnSec + ' text-gray-800 border-gray-300 hover:bg-gray-50',
            }, props.recalculando ? 'Recalculando...' : 'Recalcular prazos')
          )
        )
      )
    );
  }

  window.BiImportAutoTab = BiImportAutoTab;
})();
