// ==================== MÓDULO CONFIRMA FÁCIL ====================
// modulo-confirmafacil.js — v4
// NFs Recebidas: listagem completa com filtros + drawer de detalhes
// Configuração: credenciais + embarcadores
// ===============================================================
(function () {
  'use strict';
  const { useState, useEffect, useCallback } = React;
  const h = React.createElement;

  const fmtD = d => { try { return d ? new Date(d).toLocaleString('pt-BR', { timeZone: 'UTC' }) : '—'; } catch (_) { return d || '—'; } };
  const fmtDt = d => { try { return d ? new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—'; } catch (_) { return d || '—'; } };
  const fmtCNPJ = v => { if (!v) return ''; const n = v.replace(/\D/g, ''); return n.length === 14 ? n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : v; };
  const fmt = v => v || '—';

  // ─── SLA ConfirmaFácil (2h, BRT, regra das 16:30) ───────────
  const SLA_TZ = 'America/Sao_Paulo';
  function calcSla(corridaCriadaEm, statusCf) {
    if (!corridaCriadaEm) return null;
    const criado = new Date(corridaCriadaEm);
    if (isNaN(criado.getTime())) return null;
    const partes = {};
    new Intl.DateTimeFormat('en-CA', { timeZone: SLA_TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
      .formatToParts(criado).forEach(p => { partes[p.type] = p.value; });
    const Y = +partes.year, Mo = +partes.month, D = +partes.day, H = +partes.hour, Mi = +partes.minute;
    // BRT = UTC-3 (sem horário de verão): parede BRT -> instante UTC
    const brtParaInstante = (y, mo, d, hh, mm) => Date.UTC(y, mo - 1, d, hh + 3, mm, 0);
    let inicioMs;
    if (H * 60 + Mi > 16 * 60 + 30) inicioMs = brtParaInstante(Y, Mo, D, 8, 0) + 24 * 3600 * 1000; // 08:00 do dia seguinte
    else inicioMs = criado.getTime();
    const deadlineMs = inicioMs + 2 * 3600 * 1000;
    const entregue = ['ENTREGUE', 'CANCELADO', 'DEVOLVIDO'].includes(statusCf);
    const agora = Date.now();
    let status;
    if (entregue) status = 'entregue';
    else if (agora < inicioMs) status = 'agendado';
    else {
      const rem = deadlineMs - agora;
      if (rem <= 0) status = 'estourado';
      else if (rem <= 15 * 60000) status = 'iminente';
      else if (rem <= 30 * 60000) status = 'atencao';
      else status = 'no_prazo';
    }
    return { status, inicioMs, deadlineMs, rem: deadlineMs - agora };
  }
  const fmtRemSla = ms => { if (ms < 0) ms = 0; const t = Math.floor(ms / 60000), hh = Math.floor(t / 60), mm = t % 60; return hh > 0 ? hh + 'h' + String(mm).padStart(2, '0') : mm + 'min'; };
  const hmBRT = ms => new Intl.DateTimeFormat('pt-BR', { timeZone: SLA_TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(ms));
  const SLA_VIS = {
    no_prazo:  ['bg-green-50 text-green-700', false],
    atencao:   ['bg-amber-50 text-amber-700', false],
    iminente:  ['bg-orange-50 text-orange-700', true],
    estourado: ['bg-red-600 text-white', true],
    agendado:  ['bg-blue-50 text-blue-700', false],
    entregue:  ['bg-gray-100 text-gray-500', false],
  };
  function slaChipEl(v) {
    const s = calcSla(v.corrida_criada_em, v.status_cf);
    if (!s) return null;
    if (s.status === 'entregue') return null; // SLA encerrado: não polui a lista
    const [cls, pulse] = SLA_VIS[s.status] || ['bg-gray-100 text-gray-500', false];
    let txt, sub;
    if (s.status === 'agendado') { txt = '🕗 ' + hmBRT(s.inicioMs); sub = 'vence ' + hmBRT(s.deadlineMs); }
    else if (s.status === 'estourado') { txt = '+' + fmtRemSla(-s.rem); sub = 'estourado · venceu ' + hmBRT(s.deadlineMs); }
    else { txt = fmtRemSla(s.rem); sub = 'vence ' + hmBRT(s.deadlineMs) + (s.status === 'atencao' ? ' · atenção' : s.status === 'iminente' ? ' · iminente' : ''); }
    return h('div', { className: 'mt-1' },
      h('span', { className: 'inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ' + cls + (pulse ? ' animate-pulse' : '') }, txt),
      sub && h('span', { className: 'block text-[10px] text-gray-400 mt-0.5' }, sub)
    );
  }

  // ─── Badges ─────────────────────────────────────────────────
  const STATUS_CF_MAP = {
    'A_EMBARCAR':     ['bg-amber-100 text-amber-800',  '📦 A embarcar'],
    'EM_TRANSITO':    ['bg-blue-100 text-blue-800',    '🚚 Em trânsito'],
    'ENTREGUE':       ['bg-green-100 text-green-800',  '✅ Entregue'],
    'REENTREGA':      ['bg-orange-100 text-orange-800','🔄 Reentrega'],
    'DEVOLVIDO':      ['bg-red-100 text-red-800',      '↩️ Devolvido'],
    'CANCELADO':      ['bg-red-100 text-red-800',      '❌ Cancelado'],
    'DESCONHECIDO':   ['bg-gray-100 text-gray-600',    '❓ Desconhecido'],
  };

  function BadgeStatusCF({ status }) {
    const [cls, label] = STATUS_CF_MAP[status] || ['bg-gray-100 text-gray-600', status || '—'];
    return h('span', { className: 'text-xs font-medium px-2 py-0.5 rounded-full ' + cls }, label);
  }

  function BadgeStatus({ status }) {
    const m = {
      'enviado':    ['bg-blue-100 text-blue-800',  '📤 Enviado'],
      'finalizado': ['bg-green-100 text-green-800','✅ Finalizado'],
      'cancelado':  ['bg-red-100 text-red-800',    '❌ Cancelado'],
    };
    const [cls, label] = m[status] || ['bg-gray-100 text-gray-600', status || '—'];
    return h('span', { className: 'text-xs font-medium px-2 py-0.5 rounded-full ' + cls }, label);
  }

  // ─── Drawer de detalhes da OS ────────────────────────────────
  function DrawerOS({ solicitacaoId, onFechar, fetchAuth, API_URL, showToast }) {
    const [dados, setDados] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fotoAtiva, setFotoAtiva] = useState(null);
    const [horarioManual, setHorarioManual] = useState('');
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
      if (!solicitacaoId) return;
      setLoading(true);
      fetchAuth(API_URL + '/confirmafacil/os-detalhes/' + solicitacaoId)
        .then(r => r.json())
        .then(d => setDados(d))
        .catch(() => showToast('Erro ao carregar detalhes', 'error'))
        .finally(() => setLoading(false));
    }, [solicitacaoId]);

    const TRILHA_MAP = {
      'finalizado_ponto': { icon:'✅', bg:'bg-green-100 text-green-700',  label:'Entregue no ponto' },
      'finalizado':       { icon:'🏁', bg:'bg-green-100 text-green-700',  label:'OS finalizada' },
      'coletado':         { icon:'📦', bg:'bg-amber-100 text-amber-700',  label:'Coletado' },
      'chegou':           { icon:'📍', bg:'bg-blue-100 text-blue-700',    label:'Chegou ao local' },
      'ausente':          { icon:'🚪', bg:'bg-orange-100 text-orange-700',label:'Destinatário ausente' },
      'fechado':          { icon:'🔒', bg:'bg-orange-100 text-orange-700',label:'Estabelecimento fechado' },
      'recusou':          { icon:'❌', bg:'bg-red-100 text-red-700',      label:'Recusou receber' },
      'nao_entregue':     { icon:'↩️', bg:'bg-red-100 text-red-700',      label:'Não entregue' },
      'retorno':          { icon:'🔄', bg:'bg-purple-100 text-purple-700',label:'Retorno' },
      'em_andamento':     { icon:'🚚', bg:'bg-blue-100 text-blue-700',    label:'Em andamento' },
      'aceito':           { icon:'👤', bg:'bg-gray-100 text-gray-600',    label:'OS aceita pelo motoboy' },
      'cancelado':        { icon:'🚫', bg:'bg-red-100 text-red-700',      label:'Cancelado' },
    };
    const getTrilha = s => TRILHA_MAP[s] || { icon:'🔔', bg:'bg-gray-100 text-gray-600', label: s || '—' };

    return h('div', {
      className: 'fixed inset-0 z-50 flex',
      onClick: e => e.target === e.currentTarget && onFechar(),
    },
      h('div', { className: 'flex-1 bg-black/30', onClick: onFechar }),
      h('div', { className: 'w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-hidden' },

        // Header
        h('div', { className: 'flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50' },
          loading || !dados
            ? h('p', { className: 'text-sm font-medium text-gray-700' }, 'Carregando...')
            : h('div', null,
                h('p', { className: 'text-base font-semibold text-gray-900' }, 'OS ' + dados.sc?.tutts_os_numero),
                h('p', { className: 'text-xs text-gray-500' },
                  'NF ' + (dados.vinculo?.numero_nf || '—') +
                  ' · Série ' + (dados.vinculo?.serie_nf || '—'))
              ),
          h('button', { onClick: onFechar, className: 'text-gray-400 hover:text-gray-700 text-2xl leading-none' }, '×')
        ),

        loading
          ? h('div', { className: 'flex items-center justify-center flex-1 text-gray-400' }, '⏳ Carregando...')
          : !dados
            ? h('div', { className: 'p-6 text-center text-gray-400' }, 'Erro ao carregar')
            : h('div', { className: 'flex-1 overflow-y-auto p-4 space-y-5' },

                // Status badges
                h('div', { className: 'flex flex-wrap gap-2' },
                  dados.sc?.status && h(BadgeStatus, { status: dados.sc.status }),
                  dados.trilha?.some(t => t.sucesso) &&
                    h('span', { className: 'text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700' },
                      '✓ CF Cod.' + dados.trilha.find(t => t.sucesso)?.cod_ocorrencia),
                ),

                // Fotos do protocolo
                h('div', null,
                  h('p', { className: 'text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2' }, '📸 Fotos do protocolo'),
                  dados.fotos?.length > 0
                    ? h('div', { className: 'grid grid-cols-3 gap-2' },
                        dados.fotos.map((url, i) =>
                          h('div', {
                            key: i,
                            onClick: () => setFotoAtiva(url),
                            className: 'aspect-square rounded-xl border border-gray-100 overflow-hidden cursor-pointer bg-gray-50 hover:border-purple-300 transition-colors',
                          },
                            h('img', { src: url, alt: 'Foto ' + (i + 1), className: 'w-full h-full object-cover' })
                          )
                        )
                      )
                    : h('div', { className: 'bg-gray-50 rounded-xl p-4 text-center border border-dashed border-gray-200' },
                        h('p', { className: 'text-2xl mb-1' }, '📷'),
                        h('p', { className: 'text-xs font-medium text-gray-500' }, 'Nenhuma foto ainda'),
                        h('p', { className: 'text-xs text-gray-400 mt-0.5' }, 'As fotos aparecem quando o motoboy finalizar a entrega no app')
                      )
                ),

                // Recebedor
                (dados.nomeRecebedor || dados.docRecebedor) && h('div', { className: 'bg-gray-50 rounded-xl p-3 text-sm space-y-1.5' },
                  h('p', { className: 'text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1' }, '👤 Recebedor'),
                  dados.nomeRecebedor && h('div', { className: 'flex justify-between' },
                    h('span', { className: 'text-gray-500' }, 'Nome'),
                    h('span', { className: 'font-medium text-gray-800' }, dados.nomeRecebedor)
                  ),
                  dados.docRecebedor && h('div', { className: 'flex justify-between' },
                    h('span', { className: 'text-gray-500' }, 'Documento'),
                    h('span', { className: 'font-mono text-gray-800' }, dados.docRecebedor)
                  ),
                ),

                // Pontos da corrida
                dados.pontos?.length > 0 && h('div', null,
                  h('p', { className: 'text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2' }, '📍 Pontos da corrida'),
                  h('div', { className: 'space-y-2' },
                    dados.pontos.map((p, i) =>
                      h('div', { key: i, className: 'flex gap-3 items-start' },
                        h('div', { className: 'w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs flex items-center justify-center font-medium flex-shrink-0 mt-0.5' }, p.ordem),
                        h('div', null,
                          h('p', { className: 'text-sm font-medium text-gray-800' }, p.nome_fantasia || p.endereco_completo?.split(',')[0] || '—'),
                          h('p', { className: 'text-xs text-gray-500' }, p.endereco_completo || '—'),
                          p.numero_nota && h('span', { className: 'text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded' }, 'NF ' + p.numero_nota)
                        )
                      )
                    )
                  )
                ),

                // Trilha de status
                dados.trilha?.length > 0 && h('div', null,
                  h('p', { className: 'text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3' }, '🕐 Trilha de status CF'),
                  h('div', { className: 'relative' },
                    h('div', { className: 'absolute left-[11px] top-1 bottom-1 w-px bg-gray-200' }),
                    h('div', { className: 'space-y-4' },
                      dados.trilha.map((t, i) => {
                        const tr = getTrilha(t.status_tutts);
                        return h('div', { key: i, className: 'flex gap-3 relative' },
                          h('div', { className: 'w-6 h-6 rounded-full ' + tr.bg + ' flex items-center justify-center text-xs flex-shrink-0 z-10' }, tr.icon),
                          h('div', { className: 'flex-1 pb-1' },
                            h('div', { className: 'flex items-baseline justify-between' },
                              h('p', { className: 'text-sm font-medium text-gray-800' }, tr.label),
                              h('p', { className: 'text-xs text-gray-400' }, fmtD(t.criado_em))
                            ),
                            t.sucesso
                              ? h('p', { className: 'text-xs text-green-600' }, '✅ CF recebeu · Cod. ' + t.cod_ocorrencia)
                              : h('p', { className: 'text-xs text-red-500' }, '❌ ' + (t.erro_msg || 'Falhou')),
                            t.numero_nf && h('p', { className: 'text-xs text-gray-400' }, 'NF ' + t.numero_nf)
                          )
                        );
                      })
                    )
                  )
                ),

                // Sem eventos
                dados.trilha?.length === 0 && h('div', { className: 'text-center py-6 text-gray-400' },
                  h('p', { className: 'text-sm' }, '📭 Nenhum status enviado ao CF ainda'),
                  h('p', { className: 'text-xs mt-1' }, 'Use "Testar CF" para simular')
                )
              ),

        // Footer
        !loading && dados && h('div', { className: 'p-3 border-t border-gray-100 bg-gray-50 space-y-2' },
          // Link para corrida no módulo Solicitações
          dados.sc && h('div', { className: 'flex gap-2' },
            dados.sc.tutts_url_rastreamento && h('a', {
              href: dados.sc.tutts_url_rastreamento, target: '_blank', rel: 'noopener noreferrer',
              className: 'flex-1 text-center text-xs py-2 border border-gray-200 rounded-xl hover:border-purple-300 text-gray-600',
            }, '🗺️ Rastrear no mapa'),
            dados.sc.tutts_os_numero && h('a', {
              href: 'https://tutts.com.br/expresso/expressoat/acompanhamento-servicos?os=' + dados.sc.tutts_os_numero,
              target: '_blank', rel: 'noopener noreferrer',
              className: 'flex-1 text-center text-xs py-2 border border-purple-200 rounded-xl hover:border-purple-400 text-purple-700 bg-purple-50',
            }, '🔗 Ver na Mapp')
          ),
          h('div', { className: 'flex flex-col gap-2' },
            h('div', { className: 'flex items-center gap-1.5 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-1.5 rounded-lg' },
              '🕐 Correção manual de horário (opcional)'
            ),
            h('label', { className: 'text-xs text-gray-500' }, 'Horário real da finalização'),
            h('input', {
              type: 'datetime-local',
              value: horarioManual,
              onChange: (e) => setHorarioManual(e.target.value),
              className: 'w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:border-purple-400 focus:outline-none',
            }),
            h('p', { className: 'text-[11px] text-gray-400 -mt-1' }, 'Deixe em branco para usar o horário atual. Fuso de Salvador (BRT).'),

            h('button', {
              disabled: enviando,
              onClick: () => {
                if (!window.confirm('Enviar CONCLUIDO / ENTREGUE ao ConfirmaFacil para esta NF?\n\nIsso informa o CF que a entrega foi finalizada. E uma acao real, nao e teste.')) return;
                setEnviando(true);
                fetchAuth(API_URL + '/confirmafacil/testar-ocorrencia', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ solicitacao_id: solicitacaoId, status: 'finalizado_ponto', data_finalizacao: horarioManual || undefined }),
                }).then(r => r.json()).then(d => {
                  if (d.ok) showToast('✅ Finalizado enviado ao CF' + (horarioManual ? ' (horário corrigido)' : ''), 'success');
                  else showToast('❌ ' + (d.mensagem || 'Erro'), 'error');
                  return fetchAuth(API_URL + '/confirmafacil/os-detalhes/' + solicitacaoId).then(r => r.json()).then(setDados);
                }).finally(() => setEnviando(false));
              },
              className: 'w-full text-sm py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-60',
            }, enviando ? '⏳ Enviando...' : '✅ Finalizar no CF'),

            h('button', {
              disabled: enviando,
              onClick: () => {
                if (!window.confirm('Enviar as FOTOS do protocolo ao ConfirmaFacil para esta NF?')) return;
                setEnviando(true);
                fetchAuth(API_URL + '/confirmafacil/enviar-protocolo', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ solicitacao_id: solicitacaoId, status: 'finalizado_ponto', data_finalizacao: horarioManual || undefined }),
                }).then(r => r.json()).then(d => {
                  if (d.ok) showToast(d.mensagem || '✅ Protocolo enviado', 'success');
                  else showToast('❌ ' + (d.mensagem || 'Erro'), 'error');
                  return fetchAuth(API_URL + '/confirmafacil/os-detalhes/' + solicitacaoId).then(r => r.json()).then(setDados);
                }).finally(() => setEnviando(false));
              },
              className: 'w-full text-sm py-2.5 bg-white text-purple-700 border border-purple-200 rounded-xl hover:border-purple-400 disabled:opacity-60',
            }, '📸 Enviar protocolo (fotos)'),

            h('p', { className: 'text-[11px] text-gray-400 text-center' }, 'Toda correção fica registrada na auditoria.')
          )
        )
      ),

      // Lightbox foto
      fotoAtiva && h('div', {
        className: 'fixed inset-0 z-60 bg-black/80 flex items-center justify-center',
        onClick: () => setFotoAtiva(null),
      },
        h('img', { src: fotoAtiva, className: 'max-w-[90vw] max-h-[90vh] rounded-xl', alt: 'Foto protocolo' })
      )
    );
  }

  // ─── ABA NFs RECEBIDAS ───────────────────────────────────────
  function AbaNFs({ fetchAuth, API_URL, showToast }) {
    const [nfs, setNfs]             = useState([]);
    const [total, setTotal]         = useState(0);
    const [loading, setLoading]     = useState(false);
    const [pagina, setPagina]       = useState(0);
    const [contadores, setContadores]   = useState({});
    const [ultimaSync, setUltimaSync]   = useState(null);
    const [totalCache, setTotalCache]   = useState(0);
    const [sincronizando, setSinc]      = useState(false);
    const [totalComOS, setTotalComOS] = useState(0);
    const [totalSemOS, setTotalSemOS] = useState(0);
    const [totalCFOk, setTotalCFOk]   = useState(0);
    const [osAberta, setOsAberta]     = useState(null);
    const [nfParaCriar, setNfParaCriar] = useState(null);
    const [clientesCorrida, setClientesCorrida] = useState([]);
    const [clienteSelCorrida, setClienteSelCorrida] = useState('');
    const [criandoCorrida, setCriandoCorrida] = useState(false);
    const [reprocessando, setReproc] = useState(false);

    useEffect(() => {
      if (!nfParaCriar) return;
      fetchAuth(API_URL + '/admin/solicitacao/clientes')
        .then(r => r.json()).then(d => setClientesCorrida(d.clientes || d || [])).catch(() => {});
    }, [nfParaCriar]);
    const [embarcadores, setEmbs]   = useState([]);

    // Filtros
    const [de, setDe]               = useState('');
    const [ate, setAte]             = useState('');
    const [embCnpj, setEmbCnpj]    = useState('');
    const [statusFiltro, setStatus] = useState('');
    const [corridaFiltro, setCorrida] = useState('');
    const [busca, setBusca]         = useState('');
    const [statusCF, setStatusCF]   = useState('');
    const [slaFiltro, setSlaFiltro] = useState('');
    const [, setSlaTick]            = useState(0);
    // 🆕 SLA finalizadas: modo alternativo da pagina (toggle + data + dentro/fora)
    const hojeBRT = () => new Intl.DateTimeFormat('en-CA', { timeZone: SLA_TZ }).format(new Date());
    const [slaModo, setSlaModo] = useState(false);
    const [slaFilt, setSlaFilt] = useState('todas'); // todas | dentro | fora
    const [slaFinalizadas, setSlaFinalizadas] = useState([]);
    const [slaLoad, setSlaLoad] = useState(false);
    const POR_PAG = 100;

    // Atualiza os chips de SLA periodicamente (sem refazer fetch)
    useEffect(() => {
      const id = setInterval(() => setSlaTick(t => t + 1), 30000);
      return () => clearInterval(id);
    }, []);

    // 🆕 Carrega as finalizadas do dia quando o modo SLA esta ligado (reusa /sla-painel)
    useEffect(() => {
      if (!slaModo) return;
      const dia = de || ate || hojeBRT();   // 🆕 segue o filtro De/Até
      let vivo = true;
      setSlaLoad(true);
      fetchAuth(API_URL + '/confirmafacil/sla-painel?data=' + encodeURIComponent(dia))
        .then(r => r.json())
        .then(j => { if (vivo) setSlaFinalizadas((j && j.finalizadas) || []); })
        .catch(() => { if (vivo) showToast('Erro ao carregar SLA das finalizadas', 'error'); })
        .finally(() => { if (vivo) setSlaLoad(false); });
      return () => { vivo = false; };
    }, [slaModo, de, ate]);

    // Carregar embarcadores p/ filtro
    useEffect(() => {
      fetchAuth(API_URL + '/confirmafacil/embarcadores-todos')
        .then(r => r.json()).then(d => setEmbs(d.embarcadores || [])).catch(() => {});
      carregar(0);
    }, []);

    async function sincronizar() {
      setSinc(true);
      try {
        await fetchAuth(API_URL + '/confirmafacil/sincronizar', { method: 'POST',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
        showToast('🔄 Sincronização iniciada — aguarde 2-3 minutos e clique em Buscar', 'success');
      } catch(_) { showToast('Erro ao sincronizar', 'error'); }
      finally { setSinc(false); }
    }

    async function reprocessar() {
      setReproc(true);
      try {
        const r = await fetchAuth(API_URL + '/confirmafacil/reprocessar-barradas', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
        const d = await r.json();
        if (d.ok) showToast('♻️ ' + (d.backoff_limpo || 0) + ' barrada(s) liberada(s) — reprocessando agora (aguarde ~1 min)', 'success');
        else showToast(d.erro || 'Erro ao reprocessar', 'error');
      } catch(_) { showToast('Erro ao reprocessar', 'error'); }
      finally { setReproc(false); }
    }

    async function carregar(pg = 0, statusOverride) {
      setLoading(true);
      const sCF = statusOverride !== undefined ? statusOverride : statusCF;
      const params = new URLSearchParams({ page: pg, size: POR_PAG });
      if (de)            params.set('de',  de  + 'T00:00:00');
      if (ate)           params.set('ate', ate + 'T23:59:59');
      if (embCnpj)       params.set('embarcador_cnpj', embCnpj);
      if (corridaFiltro) params.set('tem_corrida', corridaFiltro);
      if (busca)         params.set('busca', busca);
      if (sCF)           params.set('status_cf', sCF);
      if (slaFiltro)     params.set('sla', slaFiltro);
      try {
        const r = await fetchAuth(API_URL + '/confirmafacil/nfs-lista?' + params);
        const d = await r.json();
        setNfs(d.nfs || []);
        setTotal(d.total || 0);
        setContadores(d.contadores || {});
        setTotalComOS(d.totalComOS || 0);
        setTotalSemOS(d.totalSemOS || 0);
        setTotalCFOk(d.totalCFOk || 0);
        if (d.ultima_sync) setUltimaSync(d.ultima_sync);
        if (d.total_cache) setTotalCache(d.total_cache);
        setPagina(pg);
      } catch (_) { showToast('Erro ao carregar NFs', 'error'); }
      finally { setLoading(false); }
    }

    // Contadores vêm do backend (sobre todos os resultados, não só a página atual)

    const pagTotal = Math.ceil(total / POR_PAG);

    // 🆕 Helpers do modo SLA finalizadas
    const fmtFinSla = (iso) => {
      if (!iso) return '—';
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '—';
      const dia = new Intl.DateTimeFormat('pt-BR', { timeZone: SLA_TZ, day: '2-digit', month: '2-digit' }).format(d);
      return dia + ' ' + hmBRT(d.getTime());
    };
    // 🆕 finalizadas respeitam Embarcador + Busca (busca casa OS e NF)
    const _soDig = (s) => String(s || '').replace(/\D/g, '');
    const _bSla = (busca || '').trim().toLowerCase();
    const slaBase = slaFinalizadas.filter(r => {
      if (embCnpj && _soDig(r.cnpj) !== _soDig(embCnpj)) return false;
      if (_bSla) {
        const alvo = [r.os, r.numero_nf, r.serie_nf, r.cliente].map(x => String(x || '').toLowerCase()).join(' ');
        if (!alvo.includes(_bSla)) return false;
      }
      return true;
    });
    const slaDentro = slaBase.filter(r => r.bucket === 'no_prazo').length;
    const slaFora   = slaBase.filter(r => r.bucket === 'estourada').length;
    const slaLista  = slaBase.filter(r =>
      slaFilt === 'todas' || (slaFilt === 'dentro' && r.bucket === 'no_prazo') || (slaFilt === 'fora' && r.bucket === 'estourada'));

    return h('div', { className: 'space-y-4' },

      // Acoes (sincronizar / reprocessar) - separadas dos filtros
      h('div', { className: 'flex items-center justify-end gap-2 flex-wrap' },
        ultimaSync && h('span', { className: 'text-xs text-gray-400 mr-1' }, 'Última sync: ' + fmtD(ultimaSync)),
        h('button', {
          onClick: sincronizar, disabled: sincronizando,
          className: 'px-4 py-2 border border-purple-300 text-purple-700 text-sm font-medium rounded-xl hover:bg-purple-50 disabled:opacity-50',
        }, sincronizando ? '⏳ Sincronizando...' : '🔄 Sincronizar'),
        h('button', {
          onClick: reprocessar, disabled: reprocessando,
          className: 'px-4 py-2 border border-amber-300 text-amber-700 text-sm font-medium rounded-xl hover:bg-amber-50 disabled:opacity-50',
          title: 'Limpa o backoff e dispara o ciclo agora — reprocessa as notas recusadas (ex.: faltava modalidade)'
        }, reprocessando ? '⏳ Reprocessando...' : '♻️ Reprocessar barradas')
      ),

      // Filtros
      h('div', { className: 'bg-white rounded-2xl border border-gray-100 shadow-sm p-4' },
        h('div', { className: 'flex flex-wrap gap-3 items-end' },
          h('div', null,
            h('label', { className: 'block text-xs font-medium text-gray-600 mb-1' }, 'De'),
            h('input', { type: 'date', value: de, onChange: e => setDe(e.target.value),
              className: 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400' })
          ),
          h('div', null,
            h('label', { className: 'block text-xs font-medium text-gray-600 mb-1' }, 'Até'),
            h('input', { type: 'date', value: ate, onChange: e => setAte(e.target.value),
              className: 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400' })
          ),
          embarcadores.length > 0 && h('div', null,
            h('label', { className: 'block text-xs font-medium text-gray-600 mb-1' }, 'Embarcador'),
            h('select', { value: embCnpj, onChange: e => setEmbCnpj(e.target.value),
              className: 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400' },
              h('option', { value: '' }, 'Todos'),
              embarcadores.map(e => h('option', { key: e.id, value: e.cnpj_embarcador },
                e.nome_embarcador || fmtCNPJ(e.cnpj_embarcador)))
            )
          ),
          h('div', null,
            h('label', { className: 'block text-xs font-medium text-gray-600 mb-1' }, 'Corrida'),
            h('select', { value: corridaFiltro, onChange: e => setCorrida(e.target.value),
              className: 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400' },
              h('option', { value: '' }, 'Todas'),
              h('option', { value: 'sim' }, 'Com corrida'),
              h('option', { value: 'nao' }, 'Sem corrida')
            )
          ),
          h('div', null,
            h('label', { className: 'block text-xs font-medium text-gray-600 mb-1' }, 'Status CF'),
            h('select', { value: statusCF, onChange: e => setStatusCF(e.target.value),
              className: 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400' },
              h('option', { value: '' }, 'Todos'),
              h('option', { value: 'A_EMBARCAR' }, '📦 A embarcar'),
              h('option', { value: 'EM_TRANSITO' }, '🚚 Em trânsito'),
              h('option', { value: 'ENTREGUE' }, '✅ Entregue'),
              h('option', { value: 'REENTREGA' }, '🔄 Reentrega'),
              h('option', { value: 'DEVOLVIDO' }, '↩️ Devolvido'),
              h('option', { value: 'CANCELADO' }, '❌ Cancelado'),
            )
          ),
          h('div', null,
            h('label', { className: 'block text-xs font-medium text-gray-600 mb-1' }, 'SLA'),
            h('select', { value: slaFiltro, onChange: e => setSlaFiltro(e.target.value),
              className: 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400' },
              h('option', { value: '' }, 'Todos'),
              h('option', { value: 'no_prazo' }, '🟢 No prazo'),
              h('option', { value: 'atencao' }, '🟡 Atenção (≤30m)'),
              h('option', { value: 'iminente' }, '🟠 Iminente (≤15m)'),
              h('option', { value: 'estourado' }, '🔴 Estourado'),
              h('option', { value: 'agendado' }, '🕗 Agendado')
            )
          ),
          h('div', { className: 'flex-1 min-w-[200px]' },
            h('label', { className: 'block text-xs font-medium text-gray-600 mb-1' }, 'Buscar'),
            h('input', { type: 'text', placeholder: 'NF, OS, CNPJ...', value: busca,
              onChange: e => setBusca(e.target.value),
              onKeyDown: e => e.key === 'Enter' && carregar(0),
              className: 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400' })
          ),
          h('button', {
            onClick: () => carregar(0), disabled: loading,
            className: 'px-5 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 disabled:opacity-50',
          }, loading ? '⏳' : '🔍 Buscar')
        )
      ),

      // 🆕 Toggle SLA finalizadas + data + filtros dentro/fora
      h('div', { className: 'flex items-center gap-3 flex-wrap' },
        h('label', { className: 'flex items-center gap-2 cursor-pointer select-none', onClick: () => setSlaModo(v => !v) },
          h('span', { className: 'relative inline-block w-9 h-5 rounded-full transition-colors ' + (slaModo ? 'bg-purple-600' : 'bg-gray-300') },
            h('span', { className: 'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow', style: { transform: slaModo ? 'translateX(16px)' : 'translateX(0)', transition: 'transform .15s' } })
          ),
          h('span', { className: 'text-sm font-medium text-gray-700' }, '🏁 Ver SLA das finalizadas')
        ),
        slaModo && h('span', { className: 'ml-auto text-xs text-gray-500' },
          'Dia ' + ((de || ate || hojeBRT()).split('-').reverse().slice(0, 2).join('/')) + ' · segue o filtro De/Até acima')
      ),

      slaModo && h('div', { className: 'flex flex-wrap gap-2' },
        [['todas', 'Todas', slaBase.length], ['dentro', '🟢 Dentro do prazo', slaDentro], ['fora', '🔴 Fora do prazo', slaFora]].map(function (o) {
          const id = o[0];
          return h('button', { key: id, onClick: () => setSlaFilt(id),
            className: 'text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ' + (slaFilt === id ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'),
          }, o[1] + ' ', h('span', { className: 'opacity-60' }, o[2]));
        })
      ),

      slaModo && h('div', { className: 'bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sla-fin-modo' },
        slaLoad
          ? h('div', { className: 'text-center text-gray-400 py-10 text-sm' }, 'Carregando finalizadas…')
          : slaLista.length
            ? h('table', { className: 'w-full text-sm' },
                h('thead', null, h('tr', { className: 'bg-gray-50 text-gray-500 text-[11px] text-left' },
                  h('th', { className: 'px-4 py-2' }, 'OS'),
                  h('th', { className: 'px-4 py-2' }, 'Destinatário'),
                  h('th', { className: 'px-4 py-2' }, 'Vence'),
                  h('th', { className: 'px-4 py-2' }, 'Finalizado'),
                  h('th', { className: 'px-4 py-2 text-right' }, 'SLA')
                )),
                h('tbody', null, slaLista.map(function (r) {
                  const noPrazo = r.bucket === 'no_prazo';
                  return h('tr', { key: r.solicitacao_id, className: 'border-t border-gray-100' },
                    h('td', { className: 'px-4 py-2.5 font-semibold text-purple-700 whitespace-nowrap' }, r.os || '—'),
                    h('td', { className: 'px-4 py-2.5' },
                      h('div', { className: 'font-medium text-gray-800 truncate max-w-[240px]' }, r.cliente || ''),
                      r.destino && h('div', { className: 'text-[10px] text-gray-400 truncate max-w-[240px]' }, r.destino)
                    ),
                    h('td', { className: 'px-4 py-2.5 text-gray-500 whitespace-nowrap' }, r.deadline ? hmBRT(new Date(r.deadline).getTime()) : '—'),
                    h('td', { className: 'px-4 py-2.5 tabular-nums text-gray-700 whitespace-nowrap' }, fmtFinSla(r.entregue_em)),
                    h('td', { className: 'px-4 py-2.5 text-right' },
                      h('span', { className: 'inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ' + (noPrazo ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700') },
                        noPrazo ? '✅ no prazo' : '⚠️ estourada')
                    )
                  );
                }))
              )
            : h('div', { className: 'text-gray-400 text-sm py-10 text-center' },
                'Nenhuma finalizada' + (slaFilt !== 'todas' ? ' nesse filtro' : ' nesse dia') + '.')
      ),

      // Cards KPI por status
      !slaModo && h('div', { className: 'grid grid-cols-6 gap-3' },
        [
          { label: 'Total', val: total, bg: 'bg-gray-50', txt: 'text-gray-800', icon: '📋', filter: '' },
          { label: 'A embarcar', val: contadores['A_EMBARCAR'] || 0, bg: 'bg-amber-50', txt: 'text-amber-800', icon: '📦', filter: 'A_EMBARCAR' },
          { label: 'Em trânsito', val: contadores['EM_TRANSITO'] || 0, bg: 'bg-blue-50', txt: 'text-blue-800', icon: '🚚', filter: 'EM_TRANSITO' },
          { label: 'Entregue', val: contadores['ENTREGUE'] || 0, bg: 'bg-green-50', txt: 'text-green-800', icon: '✅', filter: 'ENTREGUE' },
          { label: 'Reentrega', val: contadores['REENTREGA'] || 0, bg: 'bg-orange-50', txt: 'text-orange-800', icon: '🔄', filter: 'REENTREGA' },
          { label: 'Sem corrida', val: totalSemOS, bg: 'bg-red-50', txt: 'text-red-800', icon: '⚠️', filter: null },
        ].map(({ label, val, bg, txt, icon, filter }) =>
          h('div', {
            key: label,
            onClick: filter !== null ? () => { setStatusCF(filter); carregar(0, filter); } : undefined,
            className: `${bg} rounded-2xl p-3 ${filter !== null ? 'cursor-pointer hover:opacity-80' : ''} ${statusCF === filter && filter !== null ? 'ring-2 ring-purple-400' : ''}`,
          },
            h('p', { className: 'text-xs text-gray-500 mb-1' }, icon + ' ' + label),
            h('p', { className: `text-xl font-semibold ${txt}` }, val)
          )
        )
      ),

      // Tabela (some no modo SLA finalizadas)
      !slaModo && h('div', { className: 'bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden' },

        // Header tabela
        h('div', { className: 'flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100' },
          h('span', { className: 'text-xs text-gray-500' }, total + ' NFs · página ' + (pagina + 1) + (pagTotal > 1 ? ' de ' + pagTotal : '')),
          h('div', { className: 'flex gap-2' },
            h('button', { onClick: () => carregar(0), className: 'text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:border-purple-300' }, '🔄')
          )
        ),

        loading
          ? h('div', { className: 'flex items-center justify-center h-32 text-gray-400 text-sm' }, '⏳ Carregando...')
          : nfs.length === 0
            ? h('div', { className: 'flex flex-col items-center justify-center h-32 text-gray-400' },
                h('span', { className: 'text-3xl mb-2' }, '📭'),
                h('p', { className: 'text-sm' }, 'Nenhuma NF encontrada'),
                h('p', { className: 'text-xs mt-1' }, 'Ajuste os filtros e busque novamente')
              )
            : h('div', { className: 'overflow-x-auto' },
                h('table', { className: 'w-full text-sm' },
                  h('thead', null,
                    h('tr', { className: 'bg-gray-50 border-b border-gray-100' },
                      ['NF / Série', 'Emissão', 'Embarcador', 'Destinatário', 'Status CF', 'OS Tutts'].map(col =>
                        h('th', { key: col, className: 'px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide' }, col)
                      )
                    )
                  ),
                  h('tbody', null,
                    nfs.map((v, i) =>
                      h('tr', { key: v.id, className: (i % 2 === 0 ? 'hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-50') },
                        h('td', { className: 'px-3 py-3' },
                          h('p', { className: 'font-semibold text-gray-900' }, v.numero_nf || '—'),
                          h('p', { className: 'text-xs text-gray-400' }, 'Série ' + (v.serie_nf || '—'))
                        ),
                        h('td', { className: 'px-3 py-3' },
                          v.data_emissao
                            ? h('p', { className: 'text-xs text-gray-600' }, fmtD(v.data_emissao))
                            : h('p', { className: 'text-xs text-gray-400' }, '—'),
                          v.data_previsao && h('p', { className: 'text-xs text-gray-400' },
                            'Prev: ' + fmtD(v.data_previsao))
                        ),
                        h('td', { className: 'px-3 py-3' },
                          h('p', { className: 'font-medium text-gray-800 text-xs' }, v.nome_embarcador || '—'),
                          h('p', { className: 'text-xs text-gray-400 font-mono' }, fmtCNPJ(v.cnpj_embarcador))
                        ),
                        h('td', { className: 'px-3 py-3' },
                          h('p', { className: 'text-xs font-medium text-gray-700' }, v.destinatario_nome || v.cliente_nome || '—'),
                          (v.destinatario_cidade||v.destinatario_uf) && h('p', { className: 'text-xs text-gray-400' },
                            [v.destinatario_cidade, v.destinatario_uf].filter(Boolean).join(' / ')),
                          v.centro_custo_mapp && h('span', { className: 'text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-mono block mt-0.5' }, v.centro_custo_mapp)
                        ),
                        h('td', { className: 'px-3 py-3 space-y-1' },
                          h(BadgeStatusCF, { status: v.status_cf }),
                          v.dias_atraso > 0 && h('span', { className: 'text-xs text-red-500 font-medium block' }, v.dias_atraso + 'd atraso'),
                          v.ultimo_cf_sucesso && h('span', { className: 'text-xs text-green-600 block' }, '✓ CF notificado')
                        ),
                        h('td', { className: 'px-3 py-3' },
                          v.tutts_os_numero
                            ? h('div', null,
                                h('button', {
                                  onClick: () => setOsAberta(v.solicitacao_id),
                                  className: 'text-xs font-mono text-purple-700 bg-purple-50 px-2 py-1 rounded-full hover:bg-purple-100 cursor-pointer font-semibold',
                                  title: 'Ver detalhes da corrida',
                                }, '🔍 ' + v.tutts_os_numero),
                                slaChipEl(v)
                              )
                            : h('button', {
                                onClick: () => setNfParaCriar(v),
                                className: 'text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full hover:bg-purple-100 cursor-pointer font-medium',
                              }, '🚀 Criar corrida')
                        ),

                      )
                    )
                  )
                )
              ),

        // Paginação
        pagTotal > 1 && h('div', { className: 'flex items-center justify-between px-4 py-3 border-t border-gray-100' },
          h('span', { className: 'text-xs text-gray-500' }, total + ' NFs · página ' + (pagina + 1) + ' de ' + pagTotal),
          h('div', { className: 'flex gap-2' },
            h('button', { onClick: () => carregar(pagina - 1), disabled: pagina === 0,
              className: 'px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40' }, '← Ant'),
            h('button', { onClick: () => carregar(pagina + 1), disabled: pagina >= pagTotal - 1,
              className: 'px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40' }, 'Próx →')
          )
        )
      ),

      // Modal criar corrida
      nfParaCriar && h('div', {
        className: 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4',
        onClick: e => e.target === e.currentTarget && setNfParaCriar(null),
      },
        h('div', { className: 'bg-white rounded-2xl shadow-xl w-full max-w-md p-6' },
          h('div', { className: 'flex items-center justify-between mb-4' },
            h('div', null,
              h('h3', { className: 'text-base font-semibold text-gray-900' }, '🚀 Criar Corrida'),
              h('p', { className: 'text-sm text-gray-500' }, 'NF ' + nfParaCriar.numero_nf + ' · ' + (nfParaCriar.nome_embarcador || ''))
            ),
            h('button', { onClick: () => setNfParaCriar(null), className: 'text-gray-400 hover:text-gray-700 text-2xl leading-none' }, '×')
          ),
          h('label', { className: 'block text-xs font-medium text-gray-600 mb-1' }, 'Cliente'),
          h('select', {
            value: clienteSelCorrida,
            onChange: e => setClienteSelCorrida(e.target.value),
            className: 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-purple-400',
          },
            h('option', { value: '' }, 'Selecione o cliente...'),
            clientesCorrida.map(c => h('option', { key: c.id, value: c.id }, c.nome || c.empresa))
          ),
          h('div', { className: 'bg-gray-50 rounded-xl p-3 text-xs text-gray-500 mb-4 space-y-1' },
            h('p', null, '📍 Coleta: ' + (nfParaCriar.nome_embarcador || nfParaCriar.cnpj_embarcador)),
            h('p', null, '📦 Entrega: ' + nfParaCriar.destinatario_nome),
            h('p', null, '🏙️ ' + [nfParaCriar.destinatario_cidade, nfParaCriar.destinatario_uf].filter(Boolean).join(' / ')),
            nfParaCriar.centro_custo_mapp && h('p', null, '💼 Centro de custo: ' + nfParaCriar.centro_custo_mapp)
          ),
          h('div', { className: 'flex gap-3' },
            h('button', { onClick: () => setNfParaCriar(null), className: 'flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50' }, 'Cancelar'),
            h('button', {
              disabled: !clienteSelCorrida || criandoCorrida,
              onClick: async () => {
                if (!clienteSelCorrida) { showToast('Selecione o cliente', 'error'); return; }
                setCriandoCorrida(true);
                try {
                  const r2 = await fetchAuth(API_URL + '/confirmafacil/criar-corrida', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nf: nfParaCriar, cliente_id: Number(clienteSelCorrida) }),
                  });
                  const d2 = await r2.json();
                  if (d2.ok) {
                    showToast('✅ OS ' + d2.os_numero + ' criada!', 'success');
                    setNfParaCriar(null);
                    setClienteSelCorrida('');
                    carregar(pagina);
                  } else {
                    showToast('❌ ' + (d2.mensagem || 'Erro'), 'error');
                  }
                } catch(e) { showToast('Erro: ' + e.message, 'error'); }
                finally { setCriandoCorrida(false); }
              },
              className: 'flex-1 py-2 text-sm bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 font-medium',
            }, criandoCorrida ? '⏳ Criando...' : '🚀 Criar Corrida')
          )
        )
      ),

      // Drawer OS
      osAberta && h(DrawerOS, {
        solicitacaoId: osAberta,
        onFechar: () => setOsAberta(null),
        fetchAuth, API_URL, showToast,
      })
    );
  }

  // ─── MODAL EMBARCADOR ────────────────────────────────────────
  function ModalEmbarcador({ clienteId, embarcador, onSalvar, onFechar, fetchAuth, API_URL, showToast }) {
    const [form, setForm] = useState({
      cnpj_embarcador: embarcador?.cnpj_embarcador || '',
      nome_embarcador: embarcador?.nome_embarcador || '',
      endereco_texto: embarcador
        ? [embarcador.coleta_rua, embarcador.coleta_numero, embarcador.coleta_bairro,
           embarcador.coleta_cidade, embarcador.coleta_uf].filter(Boolean).join(', ')
        : '',
      coleta_lat: embarcador?.coleta_lat || '',
      coleta_lng: embarcador?.coleta_lng || '',
      centro_custo_mapp: embarcador?.centro_custo_mapp || '',
    });
    const [opcoesCentroCusto, setOpcoesCentroCusto] = useState([]);
    const [salvando, setSalvando] = useState(false);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    useEffect(() => {
      if (!clienteId) return;
      fetchAuth(API_URL + '/confirmafacil/centros-custo/' + clienteId)
        .then(r => r.json()).then(d => setOpcoesCentroCusto(d.centros || [])).catch(() => {});
    }, [clienteId]);

    async function salvar() {
      if (!form.cnpj_embarcador || !form.endereco_texto) {
        showToast('CNPJ e endereço são obrigatórios', 'error'); return;
      }
      setSalvando(true);
      try {
        const r = await fetchAuth(API_URL + '/confirmafacil/embarcadores', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cliente_id: clienteId, ...form }),
        });
        const d = await r.json();
        d.ok ? (showToast('✅ Salvo!', 'success'), onSalvar()) : showToast(d.error || 'Erro', 'error');
      } catch (_) { showToast('Erro', 'error'); }
      finally { setSalvando(false); }
    }

    return h('div', { className: 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4', onClick: e => e.target === e.currentTarget && onFechar() },
      h('div', { className: 'bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto' },
        h('div', { className: 'flex items-center justify-between p-5 border-b border-gray-100' },
          h('h3', { className: 'text-base font-semibold text-gray-800' }, embarcador ? '✏️ Editar Embarcador' : '➕ Nova Filial'),
          h('button', { onClick: onFechar, className: 'text-gray-400 hover:text-gray-600 text-xl leading-none' }, '×')
        ),
        h('div', { className: 'p-5 space-y-4' },
          ...[
            { label: 'CNPJ Embarcador *', campo: 'cnpj_embarcador', ph: '00.000.000/0000-00' },
            { label: 'Nome Embarcador', campo: 'nome_embarcador' },
          ].map(({ label, campo, ph }) =>
            h('div', { key: campo },
              h('label', { className: 'block text-xs font-medium text-gray-600 mb-1' }, label),
              h('input', { type: 'text', value: form[campo], onChange: e => set(campo, e.target.value),
                placeholder: ph || '', className: 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400' })
            )
          ),
          h('div', { className: 'border-t border-gray-100 pt-3' },
            h('p', { className: 'text-xs font-semibold text-purple-700 uppercase tracking-wide mb-3' }, '📍 Endereço de Coleta')
          ),
          h('div', null,
            h('label', { className: 'block text-xs font-medium text-gray-600 mb-1' },
              'Endereço completo ',
              h('span', { className: 'text-gray-400 font-normal' }, '— rua, número, bairro, cidade, UF')
            ),
            h('input', { type: 'text', value: form.endereco_texto, onChange: e => set('endereco_texto', e.target.value),
              placeholder: 'Ex: Rodovia BA-262, 262, Vitória da Conquista, BA',
              className: 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400' })
          ),
          h('div', { className: 'grid grid-cols-2 gap-4' },
            ...[
              { label: 'Latitude (opcional)', campo: 'coleta_lat', ph: '-12.9877' },
              { label: 'Longitude (opcional)', campo: 'coleta_lng', ph: '-38.4647' },
            ].map(({ label, campo, ph }) =>
              h('div', { key: campo },
                h('label', { className: 'block text-xs font-medium text-gray-600 mb-1' }, label),
                h('input', { type: 'text', value: form[campo], onChange: e => set(campo, e.target.value),
                  placeholder: ph, className: 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-400' })
              )
            )
          ),
          h('div', { className: 'border-t border-gray-100 pt-3' },
            h('p', { className: 'text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2' }, 'MAPP')
          ),
          h('div', null,
            h('label', { className: 'block text-xs font-medium text-gray-600 mb-1' },
              'Centro de custo Mapp ',
              h('span', { className: 'text-gray-400 font-normal' }, '— identifica esta filial nas corridas')
            ),
            opcoesCentroCusto.length > 0
              ? h('select', { value: form.centro_custo_mapp, onChange: e => set('centro_custo_mapp', e.target.value),
                  className: 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white' },
                  h('option', { value: '' }, 'Selecione...'),
                  opcoesCentroCusto.map(o => h('option', { key: o, value: o }, o))
                )
              : h('input', { type: 'text', value: form.centro_custo_mapp, onChange: e => set('centro_custo_mapp', e.target.value),
                  placeholder: 'Ex: BR autoparts VTQ', className: 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-400' })
          )
        ),
        h('div', { className: 'flex justify-end gap-3 p-5 border-t border-gray-100' },
          h('button', { onClick: onFechar, className: 'px-4 py-2 text-sm text-gray-600' }, 'Cancelar'),
          h('button', { onClick: salvar, disabled: salvando,
            className: 'px-5 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 disabled:opacity-50' },
            salvando ? 'Salvando...' : 'Salvar')
        )
      )
    );
  }

  // ─── ABA CONFIG ──────────────────────────────────────────────
  function AbaConfig({ fetchAuth, API_URL, showToast }) {
    const [clientes, setClientes]     = useState([]);
    const [clienteSel, setClienteSel] = useState('');
    const [config, setConfig]         = useState(null);
    const [embs, setEmbs]             = useState([]);
    const [formC, setFormC]           = useState({ cf_email: '', cf_senha: '', cf_id_cliente: '320', cnpj_transportadora: '', polling_ativo: true, ativo: true });
    const [modalEmb, setModalEmb]     = useState(null);
    const [loading, setLoading]       = useState(false);
    const [testando, setTestando]     = useState(false);

    useEffect(() => {
      fetchAuth(API_URL + '/admin/solicitacao/clientes').then(r => r.json()).then(d => setClientes(d.clientes || d || [])).catch(() => {});
    }, []);

    useEffect(() => {
      if (!clienteSel) return;
      setConfig(null); setEmbs([]);
      fetchAuth(API_URL + '/confirmafacil/config/' + clienteSel).then(r => r.json()).then(d => {
        if (d.config) {
          setConfig(d.config);
          setFormC({ cf_email: d.config.cf_email || '', cf_senha: '', cf_id_cliente: String(d.config.cf_id_cliente || '320'), cnpj_transportadora: d.config.cnpj_transportadora || '', polling_ativo: d.config.polling_ativo !== false, ativo: d.config.ativo !== false });
        }
      }).catch(() => {});
      fetchAuth(API_URL + '/confirmafacil/embarcadores/' + clienteSel).then(r => r.json()).then(d => setEmbs(d.embarcadores || [])).catch(() => {});
    }, [clienteSel]);

    const setF = (k, v) => setFormC(f => ({ ...f, [k]: v }));

    async function salvarConfig() {
      if (!clienteSel) { showToast('Selecione um cliente', 'error'); return; }
      if (!formC.cf_email || !formC.cf_senha || !formC.cnpj_transportadora) { showToast('Email, senha e CNPJ obrigatórios', 'error'); return; }
      setLoading(true);
      try {
        const r = await fetchAuth(API_URL + '/confirmafacil/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cliente_id: Number(clienteSel), ...formC, cf_id_cliente: Number(formC.cf_id_cliente) || 320 }) });
        const d = await r.json();
        d.ok ? (showToast('✅ Salvo!', 'success'), setConfig(d.config)) : showToast(d.error || 'Erro', 'error');
      } catch (_) { showToast('Erro', 'error'); } finally { setLoading(false); }
    }

    async function testar() {
      if (!clienteSel) return;
      setTestando(true);
      try {
        const r = await fetchAuth(API_URL + '/confirmafacil/test/' + clienteSel, { method: 'POST' });
        const d = await r.json();
        d.ok ? showToast('✅ Credenciais válidas!', 'success') : showToast('❌ ' + (d.mensagem || 'Inválidas'), 'error');
      } catch (_) { showToast('Erro', 'error'); } finally { setTestando(false); }
    }

    return h('div', { className: 'space-y-5' },
      h('div', { className: 'bg-white rounded-2xl border border-gray-100 shadow-sm p-5' },
        h('h3', { className: 'text-sm font-semibold text-gray-700 mb-3' }, '🏢 Cliente'),
        h('select', { value: clienteSel, onChange: e => setClienteSel(e.target.value), className: 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400' },
          h('option', { value: '' }, 'Selecione o cliente...'),
          clientes.map(c => h('option', { key: c.id, value: c.id }, c.nome || c.empresa || c.email))
        )
      ),
      clienteSel && h('div', { className: 'bg-white rounded-2xl border border-gray-100 shadow-sm p-5' },
        h('h3', { className: 'text-sm font-semibold text-gray-700 mb-4' }, '🔑 Credenciais ConfirmaFácil'),
        h('div', { className: 'grid grid-cols-2 gap-4' },
          ...[
            { l: 'Email CF', c: 'cf_email', t: 'email', f: true },
            { l: 'Senha CF', c: 'cf_senha', t: 'password', f: true },
            { l: 'ID Cliente CF', c: 'cf_id_cliente', t: 'number' },
            { l: 'CNPJ Transportadora', c: 'cnpj_transportadora' },
          ].map(({ l, c, t, f }) =>
            h('div', { key: c, className: f ? 'col-span-2' : 'col-span-1' },
              h('label', { className: 'block text-xs font-medium text-gray-600 mb-1' }, l),
              h('input', { type: t || 'text', value: formC[c], onChange: e => setF(c, e.target.value), className: 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400' })
            )
          ),
          h('div', { className: 'col-span-2 flex gap-6' },
            h('label', { className: 'flex items-center gap-2 text-sm cursor-pointer' }, h('input', { type: 'checkbox', checked: formC.ativo, onChange: e => setF('ativo', e.target.checked), className: 'accent-purple-600' }), 'Ativo'),
            h('label', { className: 'flex items-center gap-2 text-sm cursor-pointer' }, h('input', { type: 'checkbox', checked: formC.polling_ativo, onChange: e => setF('polling_ativo', e.target.checked), className: 'accent-purple-600' }), 'Polling automático')
          )
        ),
        h('div', { className: 'flex items-center gap-3 mt-4' },
          h('button', { onClick: salvarConfig, disabled: loading, className: 'px-5 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 disabled:opacity-50' }, loading ? 'Salvando...' : '💾 Salvar'),
          config && h('button', { onClick: testar, disabled: testando, className: 'px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 disabled:opacity-50' }, testando ? 'Testando...' : '🔌 Testar'),
          config?.ultimo_polling && h('span', { className: 'text-xs text-gray-400' }, 'Último polling: ' + fmtD(config.ultimo_polling))
        )
      ),
      clienteSel && config && h('div', { className: 'bg-white rounded-2xl border border-gray-100 shadow-sm p-5' },
        h('div', { className: 'flex items-center justify-between mb-4' },
          h('h3', { className: 'text-sm font-semibold text-gray-700' }, '🏭 Filiais e endereços de coleta'),
          h('button', { onClick: () => setModalEmb('novo'), className: 'px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700' }, '+ Nova Filial')
        ),
        embs.length === 0
          ? h('p', { className: 'text-sm text-gray-400 text-center py-6' }, '📭 Nenhuma filial configurada ainda')
          : h('div', { className: 'space-y-3' },
              embs.map(emb => h('div', { key: emb.id, className: 'border border-gray-100 rounded-xl p-4 hover:border-purple-200' },
                h('div', { className: 'flex items-start justify-between gap-4' },
                  h('div', null,
                    h('p', { className: 'font-medium text-sm text-gray-800' }, emb.nome_embarcador || fmtCNPJ(emb.cnpj_embarcador)),
                    h('p', { className: 'text-xs text-gray-500 font-mono' }, fmtCNPJ(emb.cnpj_embarcador)),
                    h('p', { className: 'text-xs text-gray-600 mt-1' }, '📍 ' + ([emb.coleta_rua, emb.coleta_numero, emb.coleta_cidade, emb.coleta_uf].filter(Boolean).join(', ') || '—')),
                    emb.centro_custo_mapp && h('span', { className: 'text-xs bg-purple-50 text-purple-700 font-mono px-2 py-0.5 rounded mt-1 inline-block' }, emb.centro_custo_mapp)
                  ),
                  h('div', { className: 'flex gap-2' },
                    h('button', { onClick: () => setModalEmb(emb), className: 'text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:border-purple-300' }, '✏️'),
                    h('button', {
                      onClick: async () => { if (!confirm('Desativar?')) return; await fetchAuth(API_URL + '/confirmafacil/embarcadores/' + emb.id, { method: 'DELETE' }); setEmbs(prev => prev.filter(e => e.id !== emb.id)); showToast('Desativado', 'success'); },
                      className: 'text-xs px-3 py-1.5 border border-red-100 rounded-lg hover:border-red-300 text-red-500'
                    }, '🗑️')
                  )
                )
              ))
          )
      ),
      modalEmb !== null && h(ModalEmbarcador, {
        clienteId: Number(clienteSel), embarcador: modalEmb === 'novo' ? null : modalEmb,
        fetchAuth, API_URL, showToast,
        onFechar: () => setModalEmb(null),
        onSalvar: () => { setModalEmb(null); fetchAuth(API_URL + '/confirmafacil/embarcadores/' + clienteSel).then(r => r.json()).then(d => setEmbs(d.embarcadores || [])); }
      })
    );
  }

  // ─── ABA: RISCO DE SLA (painel por filial + lista de risco) ──
  function AbaRiscoSLA({ fetchAuth, API_URL, showToast }) {
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [, setTick]           = useState(0);

    async function carregar() {
      try {
        const r = await fetchAuth(API_URL + '/confirmafacil/sla-painel');
        const j = await r.json();
        setData(j);
      } catch (e) {
        if (showToast) showToast('Erro ao carregar painel de SLA', 'erro');
      } finally { setLoading(false); }
    }
    useEffect(() => { carregar(); const id = setInterval(carregar, 60000); return () => clearInterval(id); }, []);
    useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(id); }, []);

    async function testarAlerta() {
      try {
        const r = await fetchAuth(API_URL + '/confirmafacil/sla-teste', { method: 'POST' });
        const j = await r.json().catch(() => ({}));
        if (j && j.enviado) { if (showToast) showToast('Mensagem de teste enviada ao grupo ✅', 'sucesso'); }
        else if (showToast) showToast('Não enviou: ' + ((j && j.motivo) || 'erro') + (j && j.status ? ' (' + j.status + ')' : ''), 'erro');
      } catch (e) { if (showToast) showToast('Erro ao enviar teste', 'erro'); }
    }

    if (loading && !data) return h('div', { className: 'text-center text-gray-400 py-12' }, 'Carregando painel de SLA…');
    const filiais = (data && data.filiais) || [];
    const riscos  = (data && data.riscos)  || [];

    const painel = h('div', { className: 'grid gap-3 md:grid-cols-2' },
      filiais.length ? filiais.map(f => {
        const acima = f.pct >= f.meta, perto = f.pct >= f.meta - 1;
        const cor = acima ? 'text-green-600' : perto ? 'text-amber-600' : 'text-red-600';
        const barCor = acima ? 'bg-green-500' : perto ? 'bg-amber-500' : 'bg-red-500';
        return h('div', { key: f.cnpj, className: 'bg-white border border-gray-200 rounded-2xl p-4' },
          h('div', { className: 'flex items-start justify-between' },
            h('div', null,
              h('div', { className: 'font-bold text-gray-900' }, f.nome),
              h('div', { className: 'text-[11px] text-gray-400 font-mono' }, f.cnpj)
            ),
            h('div', { className: 'text-right' },
              h('div', { className: 'text-3xl font-extrabold ' + cor }, f.pct.toFixed(1) + '%'),
              h('div', { className: 'text-[11px] text-gray-500' }, 'meta ' + f.meta + '%')
            )
          ),
          h('div', { className: 'relative h-2 rounded-full bg-gray-100 mt-3 mb-3' },
            h('div', { className: 'h-full rounded-full ' + barCor, style: { width: Math.min(100, f.pct) + '%' } }),
            h('div', { className: 'absolute w-0.5 bg-gray-800', style: { left: f.meta + '%', top: '-3px', bottom: '-3px' } })
          ),
          h('div', { className: 'grid grid-cols-4 gap-2 text-center' },
            [['No prazo', f.no_prazo, 'text-green-600'], ['Estouradas', f.estourada, 'text-red-600'], ['Em risco', f.em_risco, 'text-orange-600'], ['Em rota', f.em_rota, 'text-blue-600']].map((c, i) =>
              h('div', { key: i, className: 'border border-gray-100 rounded-lg py-1.5' },
                h('div', { className: 'text-lg font-bold ' + c[2] }, c[1]),
                h('div', { className: 'text-[10px] text-gray-500' }, c[0])
              )
            )
          ),
          h('div', { className: 'flex flex-wrap gap-2 mt-3' },
            h('span', { className: 'text-[11px] font-bold px-2 py-1 rounded-lg ' + (f.margem <= 0 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700') },
              '🎯 Margem hoje: ' + (f.margem <= 0 ? '0 — no limite' : f.margem)),
            h('span', { className: 'text-[11px] font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-700' }, '📉 Projeção: ' + f.proj.toFixed(1) + '%')
          )
        );
      }) : h('div', { className: 'text-gray-400 text-sm py-8 text-center md:col-span-2 bg-white border border-gray-200 rounded-2xl' }, 'Nenhuma corrida com SLA hoje.')
    );

    const lista = h('div', { className: 'space-y-2 mt-5' },
      h('div', { className: 'font-bold text-gray-900 flex items-center gap-2 mb-1' }, '🚨 Em risco agora',
        h('span', { className: 'text-[11px] bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full' }, riscos.length)
      ),
      riscos.length ? riscos.map(r => {
        const dl = new Date(r.deadline).getTime(), rem = dl - Date.now();
        const estourou = rem <= 0, crit = rem <= 5 * 60000;
        return h('div', { key: r.solicitacao_id, className: 'bg-white border rounded-xl p-3 flex items-center justify-between gap-3 ' + (estourou || crit ? 'border-red-200 bg-red-50/40' : 'border-gray-200') },
          h('div', null,
            h('div', { className: 'text-xs font-bold text-purple-700' }, '🔍 OS ' + (r.os || '—') + ' · ' + (r.filial || '')),
            h('div', { className: 'font-semibold text-sm text-gray-800' }, r.cliente || ''),
            h('div', { className: 'text-[11px] text-gray-500' }, '📍 ' + (r.destino || ''))
          ),
          h('div', { className: 'text-right' },
            h('div', { className: 'text-lg font-extrabold ' + (estourou || crit ? 'text-red-600 animate-pulse' : 'text-orange-600') },
              estourou ? 'ESTOUROU ' + fmtRemSla(-rem) : fmtRemSla(rem)),
            h('div', { className: 'text-[10px] text-gray-400' }, 'vence ' + hmBRT(dl))
          )
        );
      }) : h('div', { className: 'text-gray-400 text-sm py-5 text-center bg-white border border-gray-200 rounded-xl' }, 'Nenhuma corrida em risco no momento. 🎉')
    );

    return h('div', { className: 'space-y-1' },
      h('div', { className: 'flex items-center justify-between mb-2' },
        h('div', { className: 'text-[11px] text-gray-400' }, 'Meta diária por filial · risco a ≤15 min · alerta automático no WhatsApp'),
        h('button', { onClick: testarAlerta, className: 'text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100' }, '📲 Enviar teste')
      ),
      painel, lista
    );
  }

  // ─── COMPONENTE PRINCIPAL ────────────────────────────────────
  window.ModuloConfirmaFacil = function (props) {
    const fetchAuth = props.fetchAuth;
    const API_URL   = props.API_URL;
    const showToast = props.showToast || props.ja || (() => {});
    const [aba, setAba] = useState('nfs');

    return h('div', { className: 'p-4 md:p-6 max-w-6xl mx-auto space-y-5' },
      h('div', { className: 'flex items-center justify-between' },
        h('div', null,
          h('h1', { className: 'text-xl font-bold text-gray-900' }, '🔗 ConfirmaFácil'),
          h('p', { className: 'text-sm text-gray-500 mt-0.5' }, 'Integração de NFs e rastreamento de entregas')
        )
      ),
      h('div', { className: 'flex gap-1 bg-gray-100 p-1 rounded-xl w-fit' },
        [{ id: 'nfs', label: '📄 NFs Recebidas' }, { id: 'risco', label: '🛡️ Risco de SLA' }, { id: 'config', label: '⚙️ Configuração' }].map(a =>
          h('button', {
            key: a.id, onClick: () => setAba(a.id),
            className: 'px-4 py-2 text-sm font-medium rounded-lg transition-all ' + (aba === a.id ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'),
          }, a.label)
        )
      ),
      aba === 'config' ? h(AbaConfig, { fetchAuth, API_URL, showToast })
        : aba === 'risco' ? h(AbaRiscoSLA, { fetchAuth, API_URL, showToast })
        : h(AbaNFs, { fetchAuth, API_URL, showToast })
    );
  };
})();
