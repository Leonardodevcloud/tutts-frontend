// ============================================================
// MÓDULO ROADMAP - FRONTEND v1
// Tela interna admin: Roadmap + Bugs + Sugestões (3 abas)
// Padrão: Vanilla JS + React via CDN (sem JSX)
// ============================================================

(function () {
  const e = React.createElement;

  // ────────────────────────────────────────────────────────────────────────────
  // CONFIG: status, cores, labels
  // ────────────────────────────────────────────────────────────────────────────

  const TIPOS = ['roadmap', 'bug', 'sugestao'];

  const STATUS_CONFIG = {
    roadmap: [
      { id: 'em_avaliacao',       label: '💡 Em avaliação',      cor: '#888780', bg: '#F1EFE8', txt: '#444441' },
      { id: 'planejado',          label: '📋 Planejado',         cor: '#BA7517', bg: '#FAEEDA', txt: '#854F0B' },
      { id: 'em_desenvolvimento', label: '🚧 Em desenvolvimento',cor: '#185FA5', bg: '#E6F1FB', txt: '#0C447C' },
      { id: 'concluido',          label: '✅ Concluído',         cor: '#1D9E75', bg: '#E1F5EE', txt: '#085041' },
      { id: 'cancelado',          label: '❌ Cancelado',         cor: '#B4B2A9', bg: '#F1EFE8', txt: '#5F5E5A' },
    ],
    bug: [
      { id: 'aberto',           label: '🔴 Aberto',           cor: '#A32D2D', bg: '#FCEBEB', txt: '#791F1F' },
      { id: 'em_correcao',      label: '🟡 Em correção',      cor: '#BA7517', bg: '#FAEEDA', txt: '#854F0B' },
      { id: 'resolvido',        label: '✅ Resolvido',        cor: '#1D9E75', bg: '#E1F5EE', txt: '#085041' },
      { id: 'nao_reproduzivel', label: '⚪ Não reproduzível', cor: '#B4B2A9', bg: '#F1EFE8', txt: '#5F5E5A' },
    ],
    sugestao: [
      { id: 'pendente', label: '💡 Pendente', cor: '#BA7517', bg: '#FAEEDA', txt: '#854F0B' },
      { id: 'aceita',   label: '✓ Aceita',    cor: '#1D9E75', bg: '#E1F5EE', txt: '#085041' },
      { id: 'recusada', label: '✗ Recusada',  cor: '#B4B2A9', bg: '#F1EFE8', txt: '#5F5E5A' },
    ],
  };

  const GRAVIDADE_CONFIG = {
    baixo:   { label: '🟢 Baixo',   cor: '#1D9E75' },
    medio:   { label: '🟡 Médio',   cor: '#BA7517' },
    critico: { label: '🔴 Crítico', cor: '#A32D2D' },
  };

  const PRIORIDADE_CONFIG = {
    baixa: { label: 'Baixa prioridade' },
    media: { label: 'Média prioridade' },
    alta:  { label: 'Alta prioridade' },
  };

  const MODULOS_DISPONIVEIS = [
    'BI', 'Financeiro', 'Filas', 'Solicitação', 'RPA Agent',
    'CS', 'CRM', 'Operacional', 'Disponibilidade', 'Score',
    'Roteirizador', 'Auth', 'Config', 'Outro'
  ];

  const MAX_ANEXO_BYTES = 5 * 1024 * 1024;
  const MIMES_ANEXO_PERMITIDOS = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf', 'text/plain'];

  function statusInfo(tipo, statusId) {
    return (STATUS_CONFIG[tipo] || []).find(s => s.id === statusId) || { label: statusId, cor: '#888780', bg: '#F1EFE8', txt: '#444441' };
  }

  function formatarData(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const dataDia = new Date(d); dataDia.setHours(0,0,0,0);
    const diffDias = Math.round((hoje.getTime() - dataDia.getTime()) / 86400000);
    if (diffDias === 0) return 'Hoje';
    if (diffDias === 1) return 'Ontem';
    if (diffDias < 7) return `Há ${diffDias} dias`;
    if (diffDias < 14) return 'Semana passada';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // COMPONENTE PRINCIPAL
  // ────────────────────────────────────────────────────────────────────────────

  function ModuloRoadmap({ usuario, apiUrl, showToast, fetchAuth: fetchAuthExterno }) {
    // 🆕 2026-05 FIX: useRef pra estabilizar referências e evitar loop infinito.
    // Sem isso, _fetch e _api são recriados a cada render, fazem o useCallback do
    // 'carregar' reidentificar, e o useEffect dispara em loop (~milhares de reqs/s).
    const _fetchRef = React.useRef(fetchAuthExterno || (typeof window !== 'undefined' && window.fetchAuth) || fetch);
    const _apiRef = React.useRef(apiUrl || (typeof window !== 'undefined' && window.API_URL) || '');
    // Atualiza ref se props mudarem (sem disparar re-render)
    React.useEffect(() => { if (fetchAuthExterno) _fetchRef.current = fetchAuthExterno; }, [fetchAuthExterno]);
    React.useEffect(() => { if (apiUrl) _apiRef.current = apiUrl; }, [apiUrl]);
    const _fetch = _fetchRef.current;
    const _api = _apiRef.current;

    const [tab, setTab] = React.useState('roadmap');
    const [itens, setItens] = React.useState([]);
    const [contadores, setContadores] = React.useState({ roadmap: {}, bug: {}, sugestao: {} });
    const [loading, setLoading] = React.useState(true);
    const [filtroStatus, setFiltroStatus] = React.useState('todos');

    const [modalForm, setModalForm] = React.useState(null); // null | { tipo, item? }
    const [formTitulo, setFormTitulo] = React.useState('');
    const [formDescricao, setFormDescricao] = React.useState('');
    const [formModulo, setFormModulo] = React.useState('');
    const [formGravidade, setFormGravidade] = React.useState('medio');
    const [formPrioridade, setFormPrioridade] = React.useState('media');
    const [formDataPrevista, setFormDataPrevista] = React.useState('');
    const [formAnexos, setFormAnexos] = React.useState([]); // [{nome, mime, base64, tamanho}]
    const [formEnviando, setFormEnviando] = React.useState(false);

    const [modalRecusa, setModalRecusa] = React.useState(null); // {item}
    const [motivoRecusa, setMotivoRecusa] = React.useState('');

    const [drawerItem, setDrawerItem] = React.useState(null); // detalhe + anexos

    // ─── Carregar dados ───
    // 🆕 2026-05 FIX: deps reduzidas pra só [tab] — _fetch e _api vêm das refs estáveis.
    // Antes incluía [_fetch, _api, showToast] que mudavam a cada render → loop infinito.
    const carregar = React.useCallback(async () => {
      setLoading(true);
      try {
        const f = _fetchRef.current;
        const api = _apiRef.current;
        const [resItens, resCnt] = await Promise.all([
          f(`${api}/feedback/itens?tipo=${tab}`),
          f(`${api}/feedback/contadores`)
        ]);
        // Trata 404 explícito (backend sem módulo deployado) sem floodar toasts
        if (resItens.status === 404 || resCnt.status === 404) {
          if (showToast) showToast('Backend ainda não tem o módulo Roadmap deployado', 'warning');
          setItens([]);
          setContadores({ roadmap: {}, bug: {}, sugestao: {} });
          return;
        }
        const dItens = await resItens.json();
        const dCnt = await resCnt.json();
        if (dItens.success) setItens(dItens.itens || []);
        if (dCnt.success) setContadores(dCnt.contadores || {});
      } catch (err) {
        console.error('[Roadmap] erro carregar:', err);
        if (showToast) showToast('Erro ao carregar feedback', 'error');
      } finally {
        setLoading(false);
      }
    }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

    React.useEffect(() => {
      carregar();
      setFiltroStatus('todos');
    }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Filtragem ───
    const itensFiltrados = React.useMemo(() => {
      if (filtroStatus === 'todos') return itens;
      return itens.filter(i => i.status === filtroStatus);
    }, [itens, filtroStatus]);

    // ─── Form handlers ───
    const abrirNovo = (tipo) => {
      setModalForm({ tipo, item: null });
      setFormTitulo('');
      setFormDescricao('');
      setFormModulo('');
      setFormGravidade('medio');
      setFormPrioridade('media');
      setFormDataPrevista('');
      setFormAnexos([]);
    };

    const abrirEdicao = (item) => {
      setModalForm({ tipo: item.tipo, item });
      setFormTitulo(item.titulo || '');
      setFormDescricao(item.descricao || '');
      setFormModulo(item.modulo || '');
      setFormGravidade(item.gravidade || 'medio');
      setFormPrioridade(item.prioridade || 'media');
      setFormDataPrevista(item.data_prevista ? item.data_prevista.split('T')[0] : '');
      setFormAnexos([]);
    };

    const fecharForm = () => {
      if (formEnviando) return;
      setModalForm(null);
    };

    const handleAnexo = async (file) => {
      if (!file) return;
      if (!MIMES_ANEXO_PERMITIDOS.includes(file.type)) {
        if (showToast) showToast('Tipo de arquivo não permitido', 'error');
        return;
      }
      if (file.size > MAX_ANEXO_BYTES) {
        if (showToast) showToast(`Arquivo maior que ${MAX_ANEXO_BYTES/1024/1024}MB`, 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        const base64 = dataUrl.split(',')[1] || '';
        setFormAnexos(prev => [...prev, {
          nome: file.name, mime: file.type, base64, tamanho: file.size
        }]);
      };
      reader.readAsDataURL(file);
    };

    const removerAnexoPendente = (idx) => {
      setFormAnexos(prev => prev.filter((_, i) => i !== idx));
    };

    const submeterForm = async () => {
      if (!modalForm) return;
      const tit = (formTitulo || '').trim();
      if (tit.length < 3) { if (showToast) showToast('Título muito curto (mín 3 chars)', 'error'); return; }

      if (formEnviando) return;
      setFormEnviando(true);

      try {
        const body = {
          tipo: modalForm.tipo,
          titulo: tit,
          descricao: formDescricao,
          modulo: formModulo || null,
        };
        if (modalForm.tipo === 'bug')      body.gravidade = formGravidade;
        if (modalForm.tipo === 'roadmap')  { body.prioridade = formPrioridade; if (formDataPrevista) body.data_prevista = formDataPrevista; }

        let res;
        if (modalForm.item) {
          // edição (PUT — sem 'tipo' que não pode mudar)
          delete body.tipo;
          res = await _fetch(`${_api}/feedback/itens/${modalForm.item.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
          });
        } else {
          res = await _fetch(`${_api}/feedback/itens`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
          });
        }
        const data = await res.json();
        if (!res.ok || !data.success) {
          if (showToast) showToast(data.error || 'Erro ao salvar', 'error');
          setFormEnviando(false);
          return;
        }

        const itemId = data.item.id;

        // Upload de anexos (sequencial — pra não sobrecarregar payload)
        for (const anexo of formAnexos) {
          try {
            await _fetch(`${_api}/feedback/itens/${itemId}/anexos`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ nome_arquivo: anexo.nome, mime_type: anexo.mime, conteudo_base64: anexo.base64 })
            });
          } catch (errAnx) {
            // Não falha o submit por causa de anexo — só avisa
            if (showToast) showToast(`Anexo "${anexo.nome}" falhou`, 'warning');
          }
        }

        if (showToast) showToast(modalForm.item ? '✅ Atualizado' : '✅ Criado', 'success');
        setModalForm(null);
        carregar();
      } catch (err) {
        if (showToast) showToast('Erro de rede', 'error');
      } finally {
        setFormEnviando(false);
      }
    };

    // ─── Transição de status ───
    const transicionar = async (item, novo_status) => {
      if (item.status === novo_status) return;
      // Se for recusar sugestão, abre modal de motivo
      if (item.tipo === 'sugestao' && novo_status === 'recusada') {
        setMotivoRecusa('');
        setModalRecusa({ item });
        return;
      }
      try {
        const res = await _fetch(`${_api}/feedback/itens/${item.id}/transicao`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ novo_status })
        });
        const d = await res.json();
        if (res.ok && d.success) {
          if (showToast) showToast('Status atualizado', 'success');
          carregar();
        } else {
          if (showToast) showToast(d.error || 'Erro', 'error');
        }
      } catch (err) {
        if (showToast) showToast('Erro de rede', 'error');
      }
    };

    const confirmarRecusa = async () => {
      if (!modalRecusa) return;
      try {
        const res = await _fetch(`${_api}/feedback/itens/${modalRecusa.item.id}/transicao`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ novo_status: 'recusada', motivo_recusa: motivoRecusa })
        });
        const d = await res.json();
        if (res.ok && d.success) {
          if (showToast) showToast('Sugestão recusada', 'success');
          setModalRecusa(null);
          carregar();
        } else {
          if (showToast) showToast(d.error || 'Erro', 'error');
        }
      } catch (err) {
        if (showToast) showToast('Erro de rede', 'error');
      }
    };

    const aceitarSugestao = async (item) => {
      try {
        const res = await _fetch(`${_api}/feedback/itens/${item.id}/aceitar-sugestao`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }
        });
        const d = await res.json();
        if (res.ok && d.success) {
          if (showToast) showToast(`✅ Sugestão aceita — Roadmap #${d.roadmap_id} criado`, 'success');
          carregar();
        } else {
          if (showToast) showToast(d.error || 'Erro', 'error');
        }
      } catch (err) {
        if (showToast) showToast('Erro de rede', 'error');
      }
    };

    const deletarItem = async (item) => {
      if (!window.confirm(`Deletar "${item.titulo}"? Esta ação é permanente.`)) return;
      try {
        const res = await _fetch(`${_api}/feedback/itens/${item.id}`, { method: 'DELETE' });
        const d = await res.json();
        if (res.ok && d.success) {
          if (showToast) showToast('Deletado', 'success');
          carregar();
        } else {
          if (showToast) showToast(d.error || 'Erro', 'error');
        }
      } catch (err) {
        if (showToast) showToast('Erro de rede', 'error');
      }
    };

    // ──────────────────────────────────────────────────────────────────────────
    // RENDER
    // ──────────────────────────────────────────────────────────────────────────

    return e('div', { className: 'max-w-6xl mx-auto p-6' },
      // HEADER
      e('div', { className: 'mb-6' },
        e('h2', { className: 'text-2xl font-semibold text-gray-900 mb-1 flex items-center gap-2' },
          e('span', null, '⚡'),
          e('span', null, 'Desenvolvimentos')
        ),
        e('p', { className: 'text-sm text-gray-500' }, 'Acompanhe o que vem, reporte bugs e sugira melhorias')
      ),

      // TABS
      e('div', { className: 'flex gap-1 border-b border-gray-200 mb-5' },
        renderTab(e, tab, 'roadmap',  '🚀 Roadmap',   sumarStatus(contadores.roadmap),  () => setTab('roadmap'),  '#534AB7'),
        renderTab(e, tab, 'bug',      '🐛 Bugs',      sumarStatus(contadores.bug),      () => setTab('bug'),      '#A32D2D'),
        renderTab(e, tab, 'sugestao', '💡 Sugestões', sumarStatus(contadores.sugestao), () => setTab('sugestao'), '#BA7517'),
      ),

      // KPIs (só no roadmap)
      tab === 'roadmap' && e('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3 mb-5' },
        renderKPI(e, 'Em desenvolvimento', contadores.roadmap?.em_desenvolvimento || 0, '#185FA5'),
        renderKPI(e, 'Planejados',         contadores.roadmap?.planejado || 0,         '#BA7517'),
        renderKPI(e, 'Em avaliação',       contadores.roadmap?.em_avaliacao || 0,      '#444441'),
        renderKPI(e, 'Concluídos',         contadores.roadmap?.concluido || 0,         '#1D9E75'),
      ),

      // FILTROS + AÇÃO
      e('div', { className: 'flex items-center justify-between mb-4 flex-wrap gap-2' },
        e('div', { className: 'flex flex-wrap gap-2' },
          renderFiltroChip(e, filtroStatus, 'todos', `Todos · ${itens.length}`, setFiltroStatus, corDoTab(tab)),
          ...(STATUS_CONFIG[tab] || []).map(st =>
            renderFiltroChip(e, filtroStatus, st.id,
              `${st.label} · ${(contadores[tab] && contadores[tab][st.id]) || 0}`,
              setFiltroStatus, corDoTab(tab))
          )
        ),
        e('button', {
          onClick: () => abrirNovo(tab),
          className: 'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm text-white',
          style: { background: corDoTab(tab) }
        },
          tab === 'roadmap' ? '+ Novo item' :
          tab === 'bug' ? '🐛 Reportar bug' :
          '💡 Sugerir ideia'
        )
      ),

      // LISTA
      loading
        ? e('div', { className: 'text-center py-16 text-gray-400' }, 'Carregando…')
        : itensFiltrados.length === 0
          ? e('div', { className: 'text-center py-16 text-gray-400 bg-gray-50 rounded-xl' },
              e('div', { className: 'text-3xl mb-2' },
                tab === 'roadmap' ? '🗺️' : tab === 'bug' ? '🐛' : '💡'
              ),
              e('p', { className: 'text-sm' }, 'Nada por aqui ainda.')
            )
          : e('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3' },
              itensFiltrados.map(item => e(Card, {
                key: item.id,
                item,
                onEdit: () => abrirEdicao(item),
                onDelete: () => deletarItem(item),
                onTransicao: (st) => transicionar(item, st),
                onAceitar: () => aceitarSugestao(item),
                onDetalhe: () => setDrawerItem(item),
              }))
            ),

      // MODAL FORM (criar/editar)
      modalForm && renderModalForm(e, {
        modalForm, formTitulo, setFormTitulo, formDescricao, setFormDescricao,
        formModulo, setFormModulo, formGravidade, setFormGravidade,
        formPrioridade, setFormPrioridade, formDataPrevista, setFormDataPrevista,
        formAnexos, setFormAnexos, handleAnexo, removerAnexoPendente,
        formEnviando, fecharForm, submeterForm
      }),

      // MODAL RECUSA
      modalRecusa && renderModalRecusa(e, {
        modalRecusa, motivoRecusa, setMotivoRecusa,
        cancelar: () => setModalRecusa(null),
        confirmar: confirmarRecusa
      }),

      // DRAWER DETALHE (mostra anexos)
      drawerItem && e(DrawerDetalhe, {
        item: drawerItem, fechar: () => setDrawerItem(null),
        api: _api, fetchAuth: _fetch, showToast
      })
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SUBCOMPONENTES
  // ────────────────────────────────────────────────────────────────────────────

  function corDoTab(tab) {
    return tab === 'roadmap' ? '#534AB7' : tab === 'bug' ? '#A32D2D' : '#BA7517';
  }

  function sumarStatus(obj) {
    if (!obj) return 0;
    return Object.values(obj).reduce((a, b) => a + (parseInt(b) || 0), 0);
  }

  function renderTab(e, atual, id, label, count, onClick, cor) {
    const ativo = atual === id;
    return e('button', {
      key: id,
      onClick,
      className: 'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px inline-flex items-center gap-2 transition-colors',
      style: {
        color: ativo ? cor : '#6B7280',
        borderColor: ativo ? cor : 'transparent',
      }
    },
      label,
      e('span', {
        className: 'text-xs font-semibold px-2 py-0.5 rounded-full',
        style: ativo
          ? { background: cor + '20', color: cor }
          : { background: '#F3F4F6', color: '#6B7280' }
      }, count)
    );
  }

  function renderKPI(e, label, valor, cor) {
    return e('div', { className: 'bg-gray-50 rounded-lg px-4 py-3' },
      e('p', { className: 'text-xs text-gray-500 uppercase tracking-wide mb-1' }, label),
      e('p', { className: 'text-2xl font-semibold', style: { color: cor } }, valor)
    );
  }

  function renderFiltroChip(e, atual, id, label, onChange, corAtivo) {
    const ativo = atual === id;
    return e('button', {
      key: id,
      onClick: () => onChange(id),
      className: 'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
      style: ativo
        ? { background: corAtivo, color: 'white', borderColor: corAtivo }
        : { background: 'white', color: '#6B7280', borderColor: '#E5E7EB' }
    }, label);
  }

  function Card({ item, onEdit, onDelete, onTransicao, onAceitar, onDetalhe }) {
    const st = statusInfo(item.tipo, item.status);
    const ehTerminal = ['concluido','cancelado','resolvido','recusada','nao_reproduzivel'].includes(item.status);
    const opacidade = ehTerminal ? 0.85 : 1;
    const [menuAberto, setMenuAberto] = React.useState(false);
    const menuRef = React.useRef(null);

    // Fecha o menu ao clicar fora
    React.useEffect(() => {
      if (!menuAberto) return;
      const handler = (ev) => {
        if (menuRef.current && !menuRef.current.contains(ev.target)) {
          setMenuAberto(false);
        }
      };
      document.addEventListener('click', handler);
      return () => document.removeEventListener('click', handler);
    }, [menuAberto]);

    const acoes = montarAcoes(item, { onEdit, onDelete, onTransicao, onAceitar, onDetalhe });

    return e('div', {
      className: 'bg-white border border-gray-200 rounded-xl p-3 flex flex-col',
      style: {
        borderLeftWidth: '3px',
        borderLeftColor: st.cor,
        opacity: opacidade,
        minHeight: 168
      }
    },
      // Linha 1: badges
      e('div', { className: 'flex items-center gap-1.5 flex-wrap mb-1.5' },
        e('span', {
          className: 'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
          style: { background: st.bg, color: st.txt }
        }, st.label),
        item.modulo && e('span', { className: 'text-[10px] text-gray-600 px-1.5 py-0.5 bg-gray-100 rounded' }, item.modulo),
        item.tipo === 'bug' && item.gravidade && e('span', {
          className: 'text-[10px] px-1.5 py-0.5 rounded',
          style: { background: '#F3F4F6' }
        }, GRAVIDADE_CONFIG[item.gravidade]?.label || item.gravidade),
        item.tipo === 'roadmap' && item.prioridade === 'alta' && e('span', {
          className: 'text-[10px] text-gray-600 px-1.5 py-0.5 bg-gray-100 rounded'
        }, 'Alta'),
        item.origem_sugestao_id && e('span', {
          className: 'text-[10px] px-1.5 py-0.5 rounded',
          style: { background: '#EEEDFE', color: '#3C3489' }
        }, '↳ sugestão')
      ),

      // Linha 2: título (compacto)
      e('p', {
        className: 'text-sm font-medium text-gray-900 leading-snug mb-1',
        style: { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }
      }, item.titulo),

      // Linha 3: descrição (1 linha pra economizar espaço)
      item.descricao && e('p', {
        className: 'text-xs text-gray-500 leading-relaxed mb-1.5',
        style: { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }
      }, item.descricao),

      // Spacer (empurra footer pro fim)
      e('div', { className: 'flex-1' }),

      // Linha 4: meta info (data, anexos) — pequena
      (item.data_prevista || (item.anexos_count || 0) > 0 || item.motivo_recusa) && e('div', { className: 'text-[10px] text-gray-500 mb-1.5 flex items-center gap-2 flex-wrap' },
        item.tipo === 'roadmap' && item.data_prevista && e('span', null, `📅 ${new Date(item.data_prevista).toLocaleDateString('pt-BR')}`),
        (item.anexos_count || 0) > 0 && e('span', null, `📎 ${item.anexos_count}`),
        item.motivo_recusa && e('span', { className: 'italic truncate', style: { maxWidth: '100%' } }, item.motivo_recusa.slice(0, 50) + (item.motivo_recusa.length > 50 ? '…' : ''))
      ),

      // Linha 5: data criação + ações (footer)
      e('div', { className: 'flex items-center justify-between pt-1.5 border-t border-gray-100' },
        e('span', { className: 'text-[10px] text-gray-400' },
          `${formatarData(item.created_at)}${item.created_by_nome ? ' · ' + item.created_by_nome.split(' ')[0] : ''}`),
        e('div', { className: 'flex items-center gap-2' },
          // Ação principal (visível)
          acoes.principal && e('button', {
            onClick: acoes.principal.onClick,
            className: 'text-[11px] font-medium hover:underline whitespace-nowrap',
            style: { color: acoes.principal.cor || '#374151' }
          }, acoes.principal.label),
          // Menu ⋮ (com ações secundárias)
          acoes.secundarias.length > 0 && e('div', { className: 'relative', ref: menuRef },
            e('button', {
              onClick: (ev) => { ev.stopPropagation(); setMenuAberto(v => !v); },
              className: 'text-gray-400 hover:text-gray-700 px-1 leading-none text-base font-bold',
              style: { lineHeight: 1 },
              title: 'Mais ações'
            }, '⋮'),
            menuAberto && e('div', {
              className: 'absolute right-0 bottom-full mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[160px] overflow-hidden'
            },
              acoes.secundarias.map((a, idx) => e('button', {
                key: idx,
                onClick: () => { setMenuAberto(false); a.onClick(); },
                className: 'block w-full text-left px-3 py-2 text-xs hover:bg-gray-50 whitespace-nowrap',
                style: { color: a.cor || '#374151' }
              }, a.label))
            )
          )
        )
      )
    );
  }

  // Monta lista de ações: { principal: {label, onClick, cor}, secundarias: [...] }
  // Principal = ação destacada visualmente (geralmente avançar status pra próximo passo).
  // Secundarias vão pro menu ⋮.
  function montarAcoes(item, actions) {
    const principal = obterAcaoPrincipal(item, actions);
    const secundarias = obterAcoesSecundarias(item, actions);
    return { principal, secundarias };
  }

  function obterAcaoPrincipal(item, actions) {
    if (item.tipo === 'roadmap') {
      if (item.status === 'em_avaliacao')       return { label: '📋 Planejar', cor: '#BA7517', onClick: () => actions.onTransicao('planejado') };
      if (item.status === 'planejado')          return { label: '🚧 Iniciar', cor: '#185FA5', onClick: () => actions.onTransicao('em_desenvolvimento') };
      if (item.status === 'em_desenvolvimento') return { label: '✓ Concluir', cor: '#1D9E75', onClick: () => actions.onTransicao('concluido') };
      // concluido / cancelado: principal = reabrir
      if (item.status === 'concluido' || item.status === 'cancelado') {
        return { label: '↺ Reabrir', cor: '#6B7280', onClick: () => actions.onTransicao('em_avaliacao') };
      }
    }
    if (item.tipo === 'bug') {
      if (item.status === 'aberto')         return { label: '→ Em correção', cor: '#BA7517', onClick: () => actions.onTransicao('em_correcao') };
      if (item.status === 'em_correcao')    return { label: '✓ Resolvido', cor: '#1D9E75', onClick: () => actions.onTransicao('resolvido') };
      if (item.status === 'resolvido' || item.status === 'nao_reproduzivel') {
        return { label: '↺ Reabrir', cor: '#6B7280', onClick: () => actions.onTransicao('aberto') };
      }
    }
    if (item.tipo === 'sugestao') {
      if (item.status === 'pendente') return { label: '✓ Aceitar', cor: '#1D9E75', onClick: actions.onAceitar };
      if (item.status === 'recusada') return { label: '↺ Reabrir', cor: '#6B7280', onClick: () => actions.onTransicao('pendente') };
      // 'aceita' não tem principal
    }
    return null;
  }

  function obterAcoesSecundarias(item, actions) {
    const sec = [];

    if (item.tipo === 'roadmap') {
      if (item.status === 'em_avaliacao') {
        sec.push({ label: '🚧 Iniciar desenvolvimento', onClick: () => actions.onTransicao('em_desenvolvimento') });
        sec.push({ label: '✗ Cancelar', cor: '#6B7280', onClick: () => actions.onTransicao('cancelado') });
      } else if (item.status === 'planejado') {
        sec.push({ label: '↺ Voltar p/ avaliação', cor: '#6B7280', onClick: () => actions.onTransicao('em_avaliacao') });
        sec.push({ label: '✗ Cancelar', cor: '#6B7280', onClick: () => actions.onTransicao('cancelado') });
      } else if (item.status === 'em_desenvolvimento') {
        sec.push({ label: '↺ Voltar p/ planejado', cor: '#6B7280', onClick: () => actions.onTransicao('planejado') });
        sec.push({ label: '✗ Cancelar', cor: '#6B7280', onClick: () => actions.onTransicao('cancelado') });
      }
    }
    if (item.tipo === 'bug') {
      if (item.status === 'aberto') {
        sec.push({ label: '✓ Resolvido (sem correção)', cor: '#1D9E75', onClick: () => actions.onTransicao('resolvido') });
        sec.push({ label: '⚪ Não reproduzível', cor: '#6B7280', onClick: () => actions.onTransicao('nao_reproduzivel') });
      } else if (item.status === 'em_correcao') {
        sec.push({ label: '↺ Voltar p/ aberto', cor: '#6B7280', onClick: () => actions.onTransicao('aberto') });
      }
    }
    if (item.tipo === 'sugestao' && item.status === 'pendente') {
      sec.push({ label: '✗ Recusar', cor: '#A32D2D', onClick: () => actions.onTransicao('recusada') });
    }

    // Universais (em todos os cards)
    if ((item.anexos_count || 0) > 0) {
      sec.push({ label: '📎 Ver anexos', cor: '#185FA5', onClick: actions.onDetalhe });
    }
    sec.push({ label: '✏️ Editar', onClick: actions.onEdit });
    sec.push({ label: '🗑️ Excluir', cor: '#A32D2D', onClick: actions.onDelete });

    return sec;
  }

  function renderModalForm(e, p) {
    const { modalForm, formTitulo, setFormTitulo, formDescricao, setFormDescricao,
            formModulo, setFormModulo, formGravidade, setFormGravidade,
            formPrioridade, setFormPrioridade, formDataPrevista, setFormDataPrevista,
            formAnexos, handleAnexo, removerAnexoPendente,
            formEnviando, fecharForm, submeterForm } = p;
    const tipo = modalForm.tipo;
    const ehEdicao = !!modalForm.item;
    const titulo = ehEdicao
      ? (tipo === 'bug' ? 'Editar bug' : tipo === 'sugestao' ? 'Editar sugestão' : 'Editar item')
      : (tipo === 'bug' ? '🐛 Reportar bug' : tipo === 'sugestao' ? '💡 Sugerir ideia' : '+ Novo item de roadmap');

    return e('div', {
      className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4',
      onClick: (ev) => { if (ev.target === ev.currentTarget) fecharForm(); }
    },
      e('div', { className: 'bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto' },
        e('div', { className: 'flex items-center justify-between mb-4' },
          e('h3', { className: 'font-bold text-lg' }, titulo),
          e('button', { onClick: fecharForm, disabled: formEnviando, className: 'text-gray-400 hover:text-gray-600 text-xl' }, '×')
        ),

        // Título
        e('div', { className: 'mb-3' },
          e('label', { className: 'block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1' }, 'Título *'),
          e('input', {
            type: 'text', value: formTitulo, onChange: ev => setFormTitulo(ev.target.value),
            placeholder: tipo === 'bug' ? 'Resumo curto do problema' : tipo === 'sugestao' ? 'Resumo curto da ideia' : 'Resumo curto da feature',
            maxLength: 255,
            className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm', disabled: formEnviando
          })
        ),

        // Módulo + (Gravidade ou Prioridade conforme tipo)
        e('div', { className: 'grid grid-cols-2 gap-3 mb-3' },
          e('div', null,
            e('label', { className: 'block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1' }, 'Módulo'),
            e('select', {
              value: formModulo, onChange: ev => setFormModulo(ev.target.value),
              className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm', disabled: formEnviando
            },
              e('option', { value: '' }, 'Selecione…'),
              MODULOS_DISPONIVEIS.map(m => e('option', { key: m, value: m }, m))
            )
          ),
          tipo === 'bug' && e('div', null,
            e('label', { className: 'block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1' }, 'Gravidade *'),
            e('div', { className: 'flex gap-1' },
              ['baixo','medio','critico'].map(g => e('button', {
                key: g,
                onClick: () => setFormGravidade(g),
                disabled: formEnviando,
                className: 'flex-1 px-2 py-2 rounded-lg text-xs font-medium border',
                style: formGravidade === g
                  ? (g === 'critico' ? { background: '#FCEBEB', borderColor: '#A32D2D', color: '#791F1F' } :
                     g === 'medio'   ? { background: '#FAEEDA', borderColor: '#BA7517', color: '#854F0B' } :
                                       { background: '#E1F5EE', borderColor: '#1D9E75', color: '#085041' })
                  : { background: 'white', borderColor: '#D1D5DB', color: '#6B7280' }
              }, GRAVIDADE_CONFIG[g].label))
            )
          ),
          tipo === 'roadmap' && e('div', null,
            e('label', { className: 'block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1' }, 'Prioridade'),
            e('select', {
              value: formPrioridade, onChange: ev => setFormPrioridade(ev.target.value),
              className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm', disabled: formEnviando
            },
              e('option', { value: 'baixa' }, 'Baixa'),
              e('option', { value: 'media' }, 'Média'),
              e('option', { value: 'alta' }, 'Alta')
            )
          )
        ),

        // Data prevista (só roadmap)
        tipo === 'roadmap' && e('div', { className: 'mb-3' },
          e('label', { className: 'block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1' }, 'Data prevista (opcional)'),
          e('input', {
            type: 'date', value: formDataPrevista, onChange: ev => setFormDataPrevista(ev.target.value),
            className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm', disabled: formEnviando
          })
        ),

        // Descrição
        e('div', { className: 'mb-3' },
          e('label', { className: 'block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1' }, 'Descrição'),
          e('textarea', {
            rows: 4, value: formDescricao, onChange: ev => setFormDescricao(ev.target.value),
            placeholder: tipo === 'bug' ? 'O que aconteceu? Como reproduzir? Erros do console se houver.' : 'Detalhes adicionais',
            maxLength: 5000,
            className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm', disabled: formEnviando
          })
        ),

        // Anexos (só bug — pra screenshots/logs)
        tipo === 'bug' && !ehEdicao && e('div', { className: 'mb-4' },
          e('label', { className: 'block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1' }, 'Anexos (screenshots, logs)'),
          e('input', {
            type: 'file',
            accept: '.png,.jpg,.jpeg,.webp,.pdf,.txt,image/*,application/pdf,text/plain',
            multiple: false,
            onChange: ev => {
              const f = ev.target.files && ev.target.files[0];
              if (f) handleAnexo(f);
              ev.target.value = ''; // reset
            },
            disabled: formEnviando,
            className: 'block w-full text-xs text-gray-500'
          }),
          e('p', { className: 'text-xs text-gray-400 mt-1' }, 'PNG, JPG, WebP, PDF, TXT · até 5MB cada'),
          formAnexos.length > 0 && e('div', { className: 'mt-2 space-y-1' },
            formAnexos.map((a, i) => e('div', {
              key: i,
              className: 'flex items-center justify-between bg-gray-50 px-3 py-1.5 rounded text-xs'
            },
              e('span', null, `📎 ${a.nome} (${(a.tamanho/1024).toFixed(0)}KB)`),
              e('button', { onClick: () => removerAnexoPendente(i), className: 'text-red-500', disabled: formEnviando }, '×')
            ))
          )
        ),

        // Botões
        e('div', { className: 'flex justify-end gap-2 pt-2' },
          e('button', { onClick: fecharForm, disabled: formEnviando, className: 'px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm' }, 'Cancelar'),
          e('button', {
            onClick: submeterForm, disabled: formEnviando,
            className: 'px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50',
            style: { background: corDoTab(tipo) }
          }, formEnviando ? '⏳ Salvando...' : (ehEdicao ? 'Salvar' : 'Criar'))
        )
      )
    );
  }

  function renderModalRecusa(e, p) {
    const { modalRecusa, motivoRecusa, setMotivoRecusa, cancelar, confirmar } = p;
    return e('div', {
      className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4',
      onClick: ev => { if (ev.target === ev.currentTarget) cancelar(); }
    },
      e('div', { className: 'bg-white rounded-2xl p-6 max-w-md w-full' },
        e('h3', { className: 'font-bold text-lg mb-2' }, 'Recusar sugestão'),
        e('p', { className: 'text-sm text-gray-600 mb-4' }, `"${modalRecusa.item.titulo}"`),
        e('label', { className: 'block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1' }, 'Motivo (opcional)'),
        e('textarea', {
          rows: 3, value: motivoRecusa, onChange: ev => setMotivoRecusa(ev.target.value),
          maxLength: 500,
          placeholder: 'Por que essa ideia não vai pro roadmap?',
          className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4'
        }),
        e('div', { className: 'flex justify-end gap-2' },
          e('button', { onClick: cancelar, className: 'px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm' }, 'Cancelar'),
          e('button', { onClick: confirmar, className: 'px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium' }, 'Recusar')
        )
      )
    );
  }

  // Componente real (precisa ser componente porque usa hooks)
  function DrawerDetalhe({ item, fechar, api, fetchAuth, showToast }) {
    const [anexos, setAnexos] = React.useState(null);

    React.useEffect(() => {
      let abortado = false;
      (async () => {
        try {
          const r = await fetchAuth(`${api}/feedback/itens/${item.id}`);
          const d = await r.json();
          if (!abortado && d.success) setAnexos(d.anexos || []);
        } catch (err) {}
      })();
      return () => { abortado = true; };
    }, [item.id, api, fetchAuth]);

    const baixar = async (anexo) => {
      try {
        const r = await fetchAuth(`${api}/feedback/anexos/${anexo.id}`);
        const d = await r.json();
        if (d.success) {
          const link = document.createElement('a');
          link.href = `data:${d.anexo.mime_type};base64,${d.anexo.conteudo_base64}`;
          link.download = d.anexo.nome_arquivo;
          link.click();
        } else if (showToast) showToast('Erro ao baixar', 'error');
      } catch (err) {
        if (showToast) showToast('Erro de rede', 'error');
      }
    };

    return e('div', {
      className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4',
      onClick: ev => { if (ev.target === ev.currentTarget) fechar(); }
    },
      e('div', { className: 'bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto' },
        e('div', { className: 'flex items-center justify-between mb-3' },
          e('h3', { className: 'font-bold text-lg' }, item.titulo),
          e('button', { onClick: fechar, className: 'text-gray-400 hover:text-gray-600 text-xl' }, '×')
        ),
        item.descricao && e('p', { className: 'text-sm text-gray-700 mb-4 whitespace-pre-wrap' }, item.descricao),
        e('h4', { className: 'font-semibold text-sm text-gray-700 mb-2' }, 'Anexos'),
        anexos === null
          ? e('p', { className: 'text-xs text-gray-400' }, 'Carregando…')
          : anexos.length === 0
            ? e('p', { className: 'text-xs text-gray-400' }, 'Sem anexos')
            : e('div', { className: 'space-y-1' },
                anexos.map(a => e('div', {
                  key: a.id,
                  className: 'flex items-center justify-between bg-gray-50 px-3 py-2 rounded text-xs'
                },
                  e('span', null, `📎 ${a.nome_arquivo} (${(a.tamanho_bytes/1024).toFixed(0)}KB)`),
                  e('button', { onClick: () => baixar(a), className: 'text-blue-600 hover:underline' }, 'Baixar')
                ))
              )
      )
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // EXPORT GLOBAL (segue padrão dos outros módulos)
  // ────────────────────────────────────────────────────────────────────────────

  if (typeof window !== 'undefined') {
    window.ModuloRoadmap = ModuloRoadmap;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ModuloRoadmap };
  }

  console.log('✅ ModuloRoadmap v1.0 carregado');
})();
