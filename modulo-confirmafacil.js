// ==================== MÓDULO CONFIRMA FÁCIL ====================
// modulo-confirmafacil.js — v4
// NFs Recebidas: listagem completa com filtros + drawer de detalhes
// Configuração: credenciais + embarcadores
// ===============================================================
(function () {
  'use strict';
  const { useState, useEffect, useCallback } = React;
  const h = React.createElement;

  const fmtD = d => { try { return d ? new Date(d).toLocaleString('pt-BR') : '—'; } catch (_) { return d || '—'; } };
  const fmtDt = d => { try { return d ? new Date(d).toLocaleDateString('pt-BR') : '—'; } catch (_) { return d || '—'; } };
  const fmtCNPJ = v => { if (!v) return ''; const n = v.replace(/\D/g, ''); return n.length === 14 ? n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : v; };
  const fmt = v => v || '—';

  // ─── Badges ─────────────────────────────────────────────────
  function BadgeStatus({ status }) {
    const m = {
      'A_EMBARCAR':  ['bg-amber-100 text-amber-800',  'A embarcar'],
      'EM_TRANSITO': ['bg-blue-100 text-blue-800',    'Em trânsito'],
      'ENTREGUE':    ['bg-green-100 text-green-800',  'Entregue'],
      'enviado':     ['bg-blue-100 text-blue-800',    'Enviado'],
      'finalizado':  ['bg-green-100 text-green-800',  'Finalizado'],
      'cancelado':   ['bg-red-100 text-red-800',      'Cancelado'],
    };
    const [cls, label] = m[status] || ['bg-gray-100 text-gray-600', status || '—'];
    return h('span', { className: `text-xs font-medium px-2 py-0.5 rounded-full ${cls}` }, label);
  }

  // ─── Drawer de detalhes da OS ────────────────────────────────
  function DrawerOS({ solicitacaoId, onFechar, fetchAuth, API_URL, showToast }) {
    const [dados, setDados] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fotoAtiva, setFotoAtiva] = useState(null);

    useEffect(() => {
      if (!solicitacaoId) return;
      setLoading(true);
      fetchAuth(API_URL + '/confirmafacil/os-detalhes/' + solicitacaoId)
        .then(r => r.json())
        .then(d => setDados(d))
        .catch(() => showToast('Erro ao carregar detalhes', 'error'))
        .finally(() => setLoading(false));
    }, [solicitacaoId]);

    const trilhaIcones = {
      'finalizado_ponto': ['✅', 'bg-green-100 text-green-700'],
      'coletado':         ['📦', 'bg-amber-100 text-amber-700'],
      'chegou':           ['📍', 'bg-blue-100 text-blue-700'],
      'default':          ['🔔', 'bg-gray-100 text-gray-600'],
    };

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
                dados.fotos?.length > 0 && h('div', null,
                  h('p', { className: 'text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2' }, '📸 Fotos do protocolo'),
                  h('div', { className: 'grid grid-cols-3 gap-2' },
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
                        const [icon, cls] = trilhaIcones[t.status_tutts] || trilhaIcones.default;
                        return h('div', { key: i, className: 'flex gap-3 relative' },
                          h('div', { className: `w-6 h-6 rounded-full ${cls} flex items-center justify-center text-xs flex-shrink-0 z-10` }, icon),
                          h('div', { className: 'flex-1 pb-1' },
                            h('div', { className: 'flex items-baseline justify-between' },
                              h('p', { className: 'text-sm font-medium text-gray-800' }, t.status_tutts || '—'),
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
        !loading && dados && h('div', { className: 'p-3 border-t border-gray-100 bg-gray-50 flex gap-2' },
          dados.sc?.tutts_url_rastreamento && h('a', {
            href: dados.sc.tutts_url_rastreamento, target: '_blank', rel: 'noopener noreferrer',
            className: 'flex-1 text-center text-xs py-2 border border-gray-200 rounded-xl hover:border-purple-300 text-gray-600',
          }, '🗺️ Rastrear'),
          h('button', {
            onClick: () => {
              fetchAuth(API_URL + '/confirmafacil/testar-ocorrencia', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ solicitacao_id: solicitacaoId, status: 'finalizado_ponto' }),
              }).then(r => r.json()).then(d => {
                if (d.ok) showToast('✅ CF recebeu!', 'success');
                else showToast('❌ ' + d.mensagem, 'error');
                // Recarregar
                fetchAuth(API_URL + '/confirmafacil/os-detalhes/' + solicitacaoId)
                  .then(r => r.json()).then(setDados);
              });
            },
            className: 'flex-1 text-xs py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700',
          }, '🔔 Testar CF')
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
    const hoje = new Date();
    const h7 = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fmtInput = d => d.toISOString().split('T')[0];

    const [nfs, setNfs]             = useState([]);
    const [total, setTotal]         = useState(0);
    const [loading, setLoading]     = useState(false);
    const [pagina, setPagina]       = useState(0);
    const [osAberta, setOsAberta]   = useState(null);
    const [embarcadores, setEmbs]   = useState([]);

    // Filtros
    const [de, setDe]               = useState(fmtInput(h7));
    const [ate, setAte]             = useState(fmtInput(hoje));
    const [embCnpj, setEmbCnpj]    = useState('');
    const [statusFiltro, setStatus] = useState('');
    const [corridaFiltro, setCorrida] = useState('');
    const [busca, setBusca]         = useState('');
    const POR_PAG = 50;

    // Carregar embarcadores p/ filtro
    useEffect(() => {
      fetchAuth(API_URL + '/confirmafacil/embarcadores-todos')
        .then(r => r.json()).then(d => setEmbs(d.embarcadores || [])).catch(() => {});
      carregar(0);
    }, []);

    async function carregar(pg = 0) {
      setLoading(true);
      const params = new URLSearchParams({
        page: pg, size: POR_PAG,
        de: de + 'T00:00:00',
        ate: ate + 'T23:59:59',
        ...(embCnpj && { embarcador_cnpj: embCnpj }),
        ...(corridaFiltro && { tem_corrida: corridaFiltro }),
        ...(busca && { busca }),
      });
      try {
        const r = await fetchAuth(API_URL + '/confirmafacil/nfs-lista?' + params);
        const d = await r.json();
        setNfs(d.nfs || []);
        setTotal(d.total || 0);
        setPagina(pg);
      } catch (_) { showToast('Erro ao carregar NFs', 'error'); }
      finally { setLoading(false); }
    }

    // Contadores
    const totalComOS = nfs.filter(n => n.solicitacao_id).length;
    const totalSemOS = nfs.filter(n => !n.solicitacao_id).length;
    const totalCFOk  = nfs.filter(n => n.ultimo_cf_sucesso).length;

    const pagTotal = Math.ceil(total / POR_PAG);

    return h('div', { className: 'space-y-4' },

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

      // Cards resumo
      h('div', { className: 'grid grid-cols-4 gap-3' },
        [
          { label: 'NFs vinculadas', val: total, bg: 'bg-gray-50', txt: 'text-gray-800' },
          { label: 'Com corrida', val: totalComOS, bg: 'bg-purple-50', txt: 'text-purple-800' },
          { label: 'CF confirmou', val: totalCFOk, bg: 'bg-green-50', txt: 'text-green-800' },
          { label: 'Sem corrida', val: totalSemOS, bg: 'bg-amber-50', txt: 'text-amber-800' },
        ].map(({ label, val, bg, txt }) =>
          h('div', { key: label, className: `${bg} rounded-2xl p-4` },
            h('p', { className: 'text-xs text-gray-500 mb-1' }, label),
            h('p', { className: `text-2xl font-semibold ${txt}` }, val)
          )
        )
      ),

      // Tabela
      h('div', { className: 'bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden' },

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
                      ['NF / Série', 'Embarcador', 'Destinatário', 'Status CF', 'OS Tutts', 'Recebido em'].map(col =>
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
                          h('p', { className: 'font-medium text-gray-800 text-xs' }, v.nome_embarcador || '—'),
                          h('p', { className: 'text-xs text-gray-400 font-mono' }, fmtCNPJ(v.cnpj_embarcador))
                        ),
                        h('td', { className: 'px-3 py-3' },
                          h('p', { className: 'text-xs text-gray-600' }, v.cliente_nome || '—'),
                          v.centro_custo_mapp && h('span', { className: 'text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-mono' }, v.centro_custo_mapp)
                        ),
                        h('td', { className: 'px-3 py-3' },
                          v.ultimo_cf_sucesso
                            ? h('span', { className: 'text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full' }, '✅ Cod. ' + v.ultimo_cod_cf)
                            : v.solicitacao_id
                              ? h('span', { className: 'text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full' }, '⏳ Pendente')
                              : h('span', { className: 'text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full' }, '— Sem corrida')
                        ),
                        h('td', { className: 'px-3 py-3' },
                          v.tutts_os_numero
                            ? h('button', {
                                onClick: () => setOsAberta(v.solicitacao_id),
                                className: 'text-xs font-mono text-purple-700 bg-purple-50 px-2 py-1 rounded-full hover:bg-purple-100 cursor-pointer underline',
                              }, v.tutts_os_numero)
                            : h('span', { className: 'text-xs text-gray-400' }, '—')
                        ),
                        h('td', { className: 'px-3 py-3 text-xs text-gray-500' }, fmtDt(v.criado_em))
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
        [{ id: 'nfs', label: '📄 NFs Recebidas' }, { id: 'config', label: '⚙️ Configuração' }].map(a =>
          h('button', {
            key: a.id, onClick: () => setAba(a.id),
            className: 'px-4 py-2 text-sm font-medium rounded-lg transition-all ' + (aba === a.id ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'),
          }, a.label)
        )
      ),
      aba === 'config' ? h(AbaConfig, { fetchAuth, API_URL, showToast }) : h(AbaNFs, { fetchAuth, API_URL, showToast })
    );
  };
})();
