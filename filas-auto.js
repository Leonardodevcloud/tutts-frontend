// ============================================================
// MÓDULO FILAS AUTO-GERENCIÁVEIS — visão ADMIN
// ============================================================
// Arquivo separado do filas.js (fila clássica) pra zero risco de regressão.
// Estrutura:
//   ModuloFilasAuto({ usuario, apiUrl, fetchAuth, showToast })
//     - Lista de centrais auto (cards)
//     - Clique numa central → tabs (Monitor, Config, Vínculos, Logs)
//     - Botão "+ Nova central auto" cria do zero
//
// Padrões respeitados:
//   - Foto do motoboy via fetch direto a /perfil/fotos (padrão Saques/Filas)
//   - Emojis no lugar de Tabler Icons (projeto não carrega Tabler)
//   - useRef pra callbacks repassados como prop (evita infinite loop)
//   - registrar em window.ModuloFilasAuto pra app.js consumir
// ============================================================

(function () {
  const e = React.createElement;

  function ModuloFilasAuto(props) {
    const { usuario, apiUrl, fetchAuth, showToast } = props;
    const isAdmin = ['admin', 'admin_master'].includes(usuario?.role);

    // ── Estado ───────────────────────────────────────────────
    const [centrais, setCentrais] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [centralSelecionada, setCentralSelecionada] = React.useState(null);
    const [abaAtiva, setAbaAtiva] = React.useState('monitor'); // 'monitor' | 'config' | 'vinculos' | 'logs'
    const [filaCompleta, setFilaCompleta] = React.useState({ fila: [], bloqueados: [], kpis: {} });
    const [logs, setLogs] = React.useState([]);
    const [vinculos, setVinculos] = React.useState([]);
    const [profissionais, setProfissionais] = React.useState([]);
    const [modalCentral, setModalCentral] = React.useState(null);
    const [modalVincular, setModalVincular] = React.useState(false);
    const [fotos, setFotos] = React.useState({}); // mapa cod → dataURL
    const [busca, setBusca] = React.useState('');

    // Refs estáveis pra props (anti infinite-loop)
    const apiUrlRef = React.useRef(apiUrl);
    const fetchAuthRef = React.useRef(fetchAuth);
    const showToastRef = React.useRef(showToast);
    React.useEffect(() => {
      apiUrlRef.current = apiUrl;
      fetchAuthRef.current = fetchAuth;
      showToastRef.current = showToast;
    });
    const toast = React.useCallback((m, t) => showToastRef.current && showToastRef.current(m, t), []);

    // ── Loaders ──────────────────────────────────────────────
    const carregarCentrais = React.useCallback(async () => {
      try {
        const r = await fetchAuthRef.current(`${apiUrlRef.current}/filas/centrais`);
        const d = await r.json();
        if (d.success) {
          // Filtra só as auto (o endpoint /centrais retorna todas)
          setCentrais((d.centrais || []).filter(c => c.tipo === 'auto'));
        }
      } catch (err) {
        console.error('[FilasAuto] carregarCentrais:', err);
      } finally {
        setLoading(false);
      }
    }, []);

    const carregarFilaCompleta = React.useCallback(async (centralId) => {
      if (!centralId) return;
      try {
        const r = await fetchAuthRef.current(`${apiUrlRef.current}/filas/auto/admin/fila-completa/${centralId}`);
        const d = await r.json();
        if (d.success) {
          setFilaCompleta({ fila: d.fila || [], bloqueados: d.bloqueados || [], kpis: d.kpis || {} });
          // Carrega fotos dos motoboys
          const cods = [...new Set([
            ...(d.fila || []).map(p => p.cod_profissional),
            ...(d.bloqueados || []).map(p => p.cod_profissional),
          ].filter(c => c && /^\d+$/.test(c)))];
          if (cods.length > 0) {
            try {
              const rf = await fetchAuthRef.current(`${apiUrlRef.current}/perfil/fotos?codigos=${cods.join(',')}`);
              if (rf.ok) {
                const df = await rf.json();
                setFotos(prev => ({ ...prev, ...(df.fotos || {}) }));
              }
            } catch (errF) { /* segue sem fotos */ }
          }
        }
      } catch (err) {
        console.error('[FilasAuto] carregarFilaCompleta:', err);
      }
    }, []);

    const carregarLogs = React.useCallback(async (centralId) => {
      if (!centralId) return;
      try {
        const r = await fetchAuthRef.current(`${apiUrlRef.current}/filas/auto/admin/logs/${centralId}?limit=50`);
        const d = await r.json();
        if (d.success) setLogs(d.logs || []);
      } catch (err) { console.error('[FilasAuto] carregarLogs:', err); }
    }, []);

    const carregarVinculos = React.useCallback(async (centralId) => {
      if (!centralId) return;
      try {
        const r = await fetchAuthRef.current(`${apiUrlRef.current}/filas/centrais/${centralId}/vinculos`);
        const d = await r.json();
        if (d.success) setVinculos(d.vinculos || []);
      } catch (err) { console.error('[FilasAuto] carregarVinculos:', err); }
    }, []);

    const carregarProfissionais = React.useCallback(async () => {
      try {
        const r = await fetchAuthRef.current(`${apiUrlRef.current}/crm/profissionais-cadastro`);
        const d = await r.json();
        if (d.success) setProfissionais(d.profissionais || []);
      } catch (err) { console.error('[FilasAuto] carregarProfissionais:', err); }
    }, []);

    // ── Effects ──────────────────────────────────────────────
    React.useEffect(() => { if (isAdmin) { carregarCentrais(); carregarProfissionais(); } }, [isAdmin, carregarCentrais, carregarProfissionais]);

    React.useEffect(() => {
      if (!centralSelecionada) return;
      carregarFilaCompleta(centralSelecionada.id);
      carregarLogs(centralSelecionada.id);
      carregarVinculos(centralSelecionada.id);
      // Polling 5s no monitor + logs (configuração não muda sozinha)
      const i = setInterval(() => {
        if (abaAtiva === 'monitor' || abaAtiva === 'logs') {
          carregarFilaCompleta(centralSelecionada.id);
          carregarLogs(centralSelecionada.id);
        }
      }, 5000);
      return () => clearInterval(i);
    }, [centralSelecionada, abaAtiva, carregarFilaCompleta, carregarLogs, carregarVinculos]);

    // ── Mutators ─────────────────────────────────────────────
    const salvarCentral = async (dados) => {
      try {
        const ehNova = !dados.id;
        const url = ehNova ? `${apiUrl}/filas/centrais` : `${apiUrl}/filas/centrais/${dados.id}`;
        const method = ehNova ? 'POST' : 'PUT';
        const r = await fetchAuth(url, { method, body: JSON.stringify(dados) });
        const d = await r.json();
        if (!d.success) { toast(d.error || 'Erro ao salvar', 'error'); return null; }

        const centralId = ehNova ? d.central?.id || d.id : dados.id;

        // Aplica config específica de auto (PATCH)
        const cfgPayload = {
          tipo: 'auto',
          validacao_agente_ativa: dados.validacao_agente_ativa,
          varredura_intervalo_seg: dados.varredura_intervalo_seg,
          remover_ao_pegar_corrida: dados.remover_ao_pegar_corrida,
          mostrar_nomes_publicos: dados.mostrar_nomes_publicos,
          penalidade_min: dados.penalidade_min,
        };
        const rCfg = await fetchAuth(`${apiUrl}/filas/auto/admin/centrais/${centralId}/config`, {
          method: 'PATCH', body: JSON.stringify(cfgPayload),
        });
        const dCfg = await rCfg.json();
        if (!dCfg.success) { toast('Salvou central mas falhou config: ' + (dCfg.error || ''), 'error'); }

        toast(ehNova ? 'Central auto criada!' : 'Atualizada!', 'success');
        setModalCentral(null);
        await carregarCentrais();
        // Se acabou de criar, seleciona pra mostrar
        if (ehNova && d.central) setCentralSelecionada({ ...d.central, ...cfgPayload });
        return centralId;
      } catch (err) {
        console.error('[FilasAuto] salvarCentral:', err);
        toast('Erro ao salvar', 'error');
        return null;
      }
    };

    const excluirCentral = async (c) => {
      if (!window.confirm(`Excluir a central "${c.nome}"?\n\nIsso vai apagar TODOS os motoboys que estão na fila dela.`)) return;
      try {
        const r = await fetchAuth(`${apiUrl}/filas/centrais/${c.id}`, { method: 'DELETE' });
        const d = await r.json();
        if (d.success) {
          toast('Central excluída', 'success');
          if (centralSelecionada?.id === c.id) setCentralSelecionada(null);
          carregarCentrais();
        } else toast(d.error || 'Erro', 'error');
      } catch (err) { toast('Erro', 'error'); }
    };

    const reordenarMotoboy = async (codProf, novaPos) => {
      try {
        const r = await fetchAuth(`${apiUrl}/filas/auto/admin/reordenar`, {
          method: 'POST',
          body: JSON.stringify({ central_id: centralSelecionada.id, cod_profissional: codProf, nova_posicao: novaPos }),
        });
        const d = await r.json();
        if (d.success) {
          toast('Posição alterada', 'success');
          carregarFilaCompleta(centralSelecionada.id);
        } else toast(d.error || 'Erro', 'error');
      } catch (err) { toast('Erro ao reordenar', 'error'); }
    };

    const removerMotoboy = async (codProf, nome) => {
      const motivo = window.prompt(`Remover ${nome || codProf} da fila?\n\nMotivo (opcional):`, '');
      if (motivo === null) return; // cancelou
      try {
        const r = await fetchAuth(`${apiUrl}/filas/auto/admin/remover-emergencia`, {
          method: 'POST',
          body: JSON.stringify({ central_id: centralSelecionada.id, cod_profissional: codProf, motivo }),
        });
        const d = await r.json();
        if (d.success) {
          toast('Motoboy removido', 'success');
          carregarFilaCompleta(centralSelecionada.id);
          carregarLogs(centralSelecionada.id);
        } else toast(d.error || 'Erro', 'error');
      } catch (err) { toast('Erro ao remover', 'error'); }
    };

    const vincularProfissional = async (codProf, nomeProf) => {
      try {
        const r = await fetchAuth(`${apiUrl}/filas/vinculos`, {
          method: 'POST',
          body: JSON.stringify({ central_id: centralSelecionada.id, cod_profissional: codProf, nome_profissional: nomeProf }),
        });
        const d = await r.json();
        if (d.success) {
          toast('Motoboy vinculado', 'success');
          carregarVinculos(centralSelecionada.id);
        } else toast(d.error || 'Erro', 'error');
      } catch (err) { toast('Erro ao vincular', 'error'); }
    };

    const desvincularProfissional = async (codProf) => {
      if (!window.confirm('Desvincular este motoboy?')) return;
      try {
        const r = await fetchAuth(`${apiUrl}/filas/vinculos/${codProf}`, { method: 'DELETE' });
        const d = await r.json();
        if (d.success) {
          toast('Desvinculado', 'success');
          carregarVinculos(centralSelecionada.id);
        } else toast(d.error || 'Erro', 'error');
      } catch (err) { toast('Erro', 'error'); }
    };

    const dispararVarreduraAgora = async () => {
      toast('Disparando varredura...', 'info');
      try {
        const r = await fetchAuth(`${apiUrl}/filas/auto/admin/varredura-agora`, { method: 'POST' });
        const d = await r.json();
        if (d.success) {
          const res = d.resultado || {};
          toast(`Varredura: ${res.validados || 0} ok, ${res.removidos || 0} removidos`, 'success');
          carregarFilaCompleta(centralSelecionada.id);
          carregarLogs(centralSelecionada.id);
        } else toast(d.error || 'Erro', 'error');
      } catch (err) { toast('Erro', 'error'); }
    };

    // ── Bloqueio: motoboys não têm acesso a essa tela ───────
    if (!isAdmin) {
      return e('div', { className: 'p-8 text-center text-gray-500' },
        'Esta tela é apenas para admin.'
      );
    }

    // ════════════════════════════════════════════════════════
    // RENDER — lista de centrais (quando nenhuma está selecionada)
    // ════════════════════════════════════════════════════════
    if (!centralSelecionada) {
      return e(React.Fragment, null,
        e('div', { className: 'space-y-4 p-2' },
        // Header
        e('div', { className: 'flex items-center justify-between gap-3' },
          e('div', null,
            e('h2', { className: 'text-lg font-semibold text-gray-800 flex items-center gap-2' },
              e('span', null, '🤖'), 'Filas auto-gerenciáveis'
            ),
            e('p', { className: 'text-sm text-gray-500 mt-0.5' },
              'Motoboys se organizam · agente Playwright valida no sistema externo'
            )
          ),
          e('button', {
            onClick: () => setModalCentral({
              tipo: 'auto',
              raio_metros: 900,
              validacao_agente_ativa: true,
              varredura_intervalo_seg: 30,
              remover_ao_pegar_corrida: true,
              mostrar_nomes_publicos: true,
              penalidade_min: 10,
              ativa: true,
            }),
            className: 'px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium flex items-center gap-1'
          }, '➕ Nova central auto')
        ),

        // Lista
        loading
          ? e('div', { className: 'text-center py-12 text-gray-400' }, 'Carregando...')
          : centrais.length === 0
            ? e('div', {
                className: 'border border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50'
              },
                e('div', { className: 'text-4xl mb-2' }, '🤖'),
                e('p', { className: 'text-gray-700 font-medium' }, 'Nenhuma central auto-gerenciável ainda'),
                e('p', { className: 'text-gray-500 text-sm mt-1' }, 'Clique em "Nova central auto" pra começar'),
              )
            : e('div', { className: 'grid md:grid-cols-2 lg:grid-cols-3 gap-3' },
                centrais.map(c => e('div', {
                  key: c.id,
                  className: `bg-white border rounded-xl p-4 hover:shadow-md transition-all cursor-pointer ${c.ativa ? 'border-gray-200' : 'border-red-200 opacity-60'}`,
                  onClick: () => setCentralSelecionada(c)
                },
                  e('div', { className: 'flex items-start justify-between mb-2' },
                    e('div', null,
                      e('p', { className: 'font-semibold text-gray-800 flex items-center gap-2' },
                        e('span', null, '📍'),
                        c.nome
                      ),
                      e('p', { className: 'text-xs text-gray-500 mt-1' }, c.endereco || '—')
                    ),
                    e('span', {
                      className: `text-[10px] px-2 py-0.5 rounded font-medium ${c.validacao_agente_ativa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`
                    }, c.validacao_agente_ativa ? '🤖 agente ativo' : 'agente desligado')
                  ),
                  e('div', { className: 'flex gap-3 text-xs text-gray-500 mt-3' },
                    e('span', null, '📏 ', c.raio_metros, 'm'),
                    e('span', null, '⏱️ ', c.varredura_intervalo_seg || 30, 's'),
                    c.remover_ao_pegar_corrida && e('span', null, '🚫 auto-remove'),
                  )
                ))
              )
        ),
        // 🆕 FIX: modal precisa estar disponível TAMBÉM no early-return da lista,
        // senão clicar "Nova central auto" muda o state mas nada renderiza.
        modalCentral && renderModalCentral({
          dados: modalCentral,
          onChange: setModalCentral,
          onSalvar: salvarCentral,
          onCancelar: () => setModalCentral(null),
        })
      );
    }

    // ════════════════════════════════════════════════════════
    // RENDER — central selecionada (tabs)
    // ════════════════════════════════════════════════════════
    return e('div', { className: 'space-y-3' },
      // Header com voltar
      e('div', { className: 'flex items-center gap-2' },
        e('button', {
          onClick: () => setCentralSelecionada(null),
          className: 'text-gray-500 hover:text-gray-800 text-sm flex items-center gap-1'
        }, '← Voltar'),
        e('span', { className: 'text-gray-300' }, '·'),
        e('h2', { className: 'text-lg font-semibold text-gray-800 flex items-center gap-2' },
          e('span', null, '📍'), centralSelecionada.nome
        ),
        e('span', {
          className: `text-[10px] px-2 py-0.5 rounded font-medium ml-auto ${centralSelecionada.validacao_agente_ativa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`
        }, centralSelecionada.validacao_agente_ativa ? '🤖 agente ativo' : 'agente desligado')
      ),

      // Tabs
      e('div', { className: 'bg-white border border-gray-200 rounded-xl p-1 flex gap-1' },
        ['monitor', 'config', 'vinculos', 'logs'].map(aba => e('button', {
          key: aba,
          onClick: () => setAbaAtiva(aba),
          className: `flex-1 px-3 py-1.5 rounded-lg text-sm font-medium ${abaAtiva === aba ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`
        }, aba === 'monitor' ? 'Monitor' : aba === 'config' ? 'Configuração' : aba === 'vinculos' ? 'Vínculos' : 'Logs do agente'))
      ),

      // === ABA MONITOR ===
      abaAtiva === 'monitor' && renderMonitor({
        filaCompleta, fotos, logs,
        reordenarMotoboy, removerMotoboy, dispararVarreduraAgora,
      }),

      // === ABA CONFIG ===
      abaAtiva === 'config' && renderConfig({
        central: centralSelecionada,
        salvarCentral,
        excluirCentral,
      }),

      // === ABA VÍNCULOS ===
      abaAtiva === 'vinculos' && renderVinculos({
        vinculos, fotos, profissionais, busca, setBusca,
        modalVincular, setModalVincular,
        vincularProfissional, desvincularProfissional,
      }),

      // === ABA LOGS ===
      abaAtiva === 'logs' && renderLogs({ logs }),

      // Modal de nova/editar central
      modalCentral && renderModalCentral({
        dados: modalCentral,
        onChange: setModalCentral,
        onSalvar: salvarCentral,
        onCancelar: () => setModalCentral(null),
      })
    );
  }

  // ════════════════════════════════════════════════════════════
  // Componentes auxiliares (funções, não componentes React separados)
  // ════════════════════════════════════════════════════════════

  function avatar(cod, nome, foto, size) {
    size = size || 32;
    const partes = (nome || '').trim().split(/\s+/);
    const iniciais = partes.length >= 2
      ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
      : (partes[0] || '?').substring(0, 2).toUpperCase();
    if (foto) {
      return e('img', {
        src: foto, alt: nome || '',
        style: { width: size + 'px', height: size + 'px', objectFit: 'cover', border: '0.5px solid #E5E7EB' },
        className: 'rounded-full flex-shrink-0'
      });
    }
    return e('div', {
      style: { width: size + 'px', height: size + 'px', fontSize: Math.round(size * 0.36) + 'px' },
      className: 'rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-semibold flex-shrink-0'
    }, iniciais);
  }

  function formatarMinAtras(iso) {
    if (!iso) return '—';
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return `${s}s atrás`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}min atrás`;
    const h = Math.floor(m / 60);
    return `${h}h${m % 60}min atrás`;
  }

  // ──────────────────────────────────────────────────────────
  // Monitor
  // ──────────────────────────────────────────────────────────
  function renderMonitor(opts) {
    const { filaCompleta, fotos, logs, reordenarMotoboy, removerMotoboy, dispararVarreduraAgora } = opts;
    const fila = filaCompleta.fila || [];
    const bloqueados = filaCompleta.bloqueados || [];
    const kpis = filaCompleta.kpis || {};

    return e('div', { className: 'space-y-3' },
      // KPIs
      e('div', { className: 'grid grid-cols-4 gap-2' },
        kpi('Na fila', kpis.total_aguardando || 0),
        kpi('Em rota', kpis.total_em_rota || 0, '#0F6E56'),
        kpi('Bloqueados (1h)', kpis.bloqueados_ultima_hora || 0, '#A32D2D'),
        kpi('Tempo médio', (kpis.tempo_medio_min || 0) + 'min'),
      ),

      // Header da fila
      e('div', { className: 'flex items-center justify-between mt-3' },
        e('p', { className: 'text-[11px] uppercase text-gray-500 tracking-wide font-medium' }, 'Fila ao vivo'),
        e('div', { className: 'flex gap-2' },
          e('button', {
            onClick: dispararVarreduraAgora,
            className: 'text-[11px] px-2 py-1 bg-white border border-gray-200 hover:bg-gray-50 rounded text-gray-600'
          }, '🔄 Varrer agora'),
          e('span', { className: 'text-[10px] text-gray-400 self-center' }, 'Use ↑↓ pra reordenar em emergências')
        )
      ),

      // Tabela
      e('div', { className: 'border border-gray-200 rounded-lg overflow-hidden bg-white' },
        // Cabeçalho
        e('div', {
          className: 'px-3 py-2 bg-gray-50 border-b border-gray-200 grid items-center gap-2 text-[10px] uppercase text-gray-500 font-medium tracking-wide',
          style: { gridTemplateColumns: '30px 1fr 80px 100px 90px' }
        },
          e('span', null, 'Pos'),
          e('span', null, 'Motoboy'),
          e('span', null, 'Entrou'),
          e('span', null, 'Agente'),
          e('span', null, 'Ações'),
        ),
        // Linhas
        fila.length === 0
          ? e('p', { className: 'text-center text-gray-400 py-6 text-sm' }, 'Nenhum motoboy na fila')
          : fila.map((p, idx) => {
              const cod = p.cod_profissional;
              const isPrimeiro = idx === 0;
              const isUltimo = idx === fila.length - 1;
              const statusCor =
                p.agente_status === 'validado' ? { bg: '#EAF3DE', fg: '#27500A', txt: '✓ validado' } :
                p.agente_status === 'reprovado' ? { bg: '#FCEBEB', fg: '#791F1F', txt: '× reprovado' } :
                { bg: '#FAEEDA', fg: '#854F0B', txt: 'verificando' };

              return e('div', {
                key: cod,
                className: 'px-3 py-2 grid items-center gap-2 text-xs border-b border-gray-50 last:border-0 hover:bg-gray-50',
                style: { gridTemplateColumns: '30px 1fr 80px 100px 90px' }
              },
                // Pos
                e('span', {
                  className: `w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold ${isPrimeiro ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`
                }, p.posicao),
                // Motoboy
                e('div', { className: 'flex items-center gap-2 min-w-0' },
                  avatar(cod, p.nome_profissional, fotos[cod], 28),
                  e('div', { className: 'min-w-0' },
                    e('p', { className: 'truncate text-gray-800' }, p.nome_profissional || '—'),
                    e('p', { className: 'text-[10px] text-gray-400' }, cod)
                  )
                ),
                // Entrou
                e('span', { className: 'text-gray-500 text-[11px]' }, formatarMinAtras(p.entrada_fila_at)),
                // Status agente
                e('span', {
                  className: 'text-[10px] px-1.5 py-0.5 rounded font-medium',
                  style: { background: statusCor.bg, color: statusCor.fg, width: 'fit-content' }
                }, statusCor.txt),
                // Ações
                e('div', { className: 'flex gap-1 items-center' },
                  e('button', {
                    onClick: () => reordenarMotoboy(cod, p.posicao - 1),
                    disabled: isPrimeiro,
                    title: isPrimeiro ? 'Já é o primeiro' : 'Subir',
                    className: `text-[13px] px-1.5 rounded ${isPrimeiro ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`
                  }, '↑'),
                  e('button', {
                    onClick: () => reordenarMotoboy(cod, p.posicao + 1),
                    disabled: isUltimo,
                    title: isUltimo ? 'Já é o último' : 'Descer',
                    className: `text-[13px] px-1.5 rounded ${isUltimo ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`
                  }, '↓'),
                  e('button', {
                    onClick: () => removerMotoboy(cod, p.nome_profissional),
                    title: 'Remover',
                    className: 'text-[14px] px-1.5 rounded text-red-600 hover:bg-red-50'
                  }, '×'),
                )
              );
            })
      ),

      // Bloqueados
      bloqueados.length > 0 && e('div', { className: 'space-y-2 mt-4' },
        e('p', { className: 'text-[11px] uppercase text-gray-500 tracking-wide font-medium' },
          `Bloqueados pelo agente · ${bloqueados.length}`
        ),
        e('div', { className: 'bg-red-50 border border-red-200 rounded-lg p-2.5 space-y-1.5' },
          bloqueados.map(b => e('div', {
            key: b.cod_profissional,
            className: 'flex items-center gap-2 text-xs'
          },
            avatar(b.cod_profissional, b.nome_profissional, fotos[b.cod_profissional], 24),
            e('span', { className: 'flex-1 text-red-900' },
              b.nome_profissional || '—', ' · ', b.cod_profissional
            ),
            e('span', { className: 'text-[10px] text-red-700 bg-white px-2 py-0.5 rounded' },
              b.motivo || 'corrida ativa'
            )
          ))
        )
      ),

      // Log resumido (últimos 5)
      logs && logs.length > 0 && e('div', { className: 'space-y-2 mt-4' },
        e('p', { className: 'text-[11px] uppercase text-gray-500 tracking-wide font-medium' }, 'Log do agente · últimas ações'),
        e('div', {
          className: 'bg-gray-50 rounded-lg p-2.5 space-y-0.5',
          style: { fontFamily: 'ui-monospace, monospace', fontSize: '11px', lineHeight: 1.7 }
        }, logs.slice(0, 5).map(l => renderLogLine(l)))
      )
    );
  }

  function kpi(label, value, cor) {
    return e('div', { className: 'bg-gray-50 rounded-lg p-2.5' },
      e('p', { className: 'text-[10px] uppercase text-gray-500 tracking-wide font-medium' }, label),
      e('p', { className: 'text-xl font-semibold mt-0.5', style: cor ? { color: cor } : null }, value)
    );
  }

  // ──────────────────────────────────────────────────────────
  // Configuração da central
  // ──────────────────────────────────────────────────────────
  function renderConfig(opts) {
    const { central, salvarCentral, excluirCentral } = opts;
    const [dados, setDados] = React.useState({ ...central });

    React.useEffect(() => { setDados({ ...central }); }, [central?.id]);

    const setCampo = (k, v) => setDados(d => ({ ...d, [k]: v }));

    return e('div', { className: 'bg-white border border-gray-200 rounded-xl p-4 space-y-4' },
      e('p', { className: 'text-[11px] uppercase text-gray-500 tracking-wide font-medium' }, 'Identificação'),
      e('div', { className: 'space-y-2' },
        labelInput('Nome', dados.nome || '', v => setCampo('nome', v)),
        labelInput('Endereço', dados.endereco || '', v => setCampo('endereco', v)),
      ),

      e('p', { className: 'text-[11px] uppercase text-gray-500 tracking-wide font-medium pt-2' }, 'Localização e raio'),
      e('div', { className: 'grid grid-cols-3 gap-2' },
        labelInput('Latitude', dados.latitude || '', v => setCampo('latitude', v)),
        labelInput('Longitude', dados.longitude || '', v => setCampo('longitude', v)),
        labelInput('Raio (m)', dados.raio_metros || 900, v => setCampo('raio_metros', parseInt(v) || 900), 'number'),
      ),

      e('p', { className: 'text-[11px] uppercase text-gray-500 tracking-wide font-medium pt-2' }, 'Validação automática (agente Playwright)'),
      e('div', { className: 'bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2' },
        toggle('Bloquear se motoboy tem corrida ativa',
          'Agente busca no sistema externo · valida após entrada',
          dados.validacao_agente_ativa !== false,
          v => setCampo('validacao_agente_ativa', v)),
        toggle('Remover automaticamente ao pegar corrida',
          'Agente fica monitorando · tira da fila quando detecta nova corrida',
          dados.remover_ao_pegar_corrida !== false,
          v => setCampo('remover_ao_pegar_corrida', v)),
        e('div', { className: 'flex items-center justify-between py-1 border-t border-gray-200 pt-2' },
          e('div', null,
            e('p', { className: 'text-xs font-medium text-gray-800' }, 'Frequência de varredura'),
            e('p', { className: 'text-[11px] text-gray-500' }, 'Intervalo entre checagens do agente'),
          ),
          e('select', {
            value: dados.varredura_intervalo_seg || 30,
            onChange: ev => setCampo('varredura_intervalo_seg', parseInt(ev.target.value)),
            className: 'text-xs px-2 py-1 border border-gray-300 rounded bg-white'
          },
            e('option', { value: 15 }, '15 segundos'),
            e('option', { value: 30 }, '30 segundos'),
            e('option', { value: 60 }, '1 minuto'),
            e('option', { value: 120 }, '2 minutos'),
          )
        )
      ),

      e('p', { className: 'text-[11px] uppercase text-gray-500 tracking-wide font-medium pt-2' }, 'Regras dos motoboys'),
      e('div', { className: 'bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2' },
        toggle('Mostrar nomes de todos na fila',
          'Motoboys veem quem está à frente e atrás (transparência)',
          dados.mostrar_nomes_publicos !== false,
          v => setCampo('mostrar_nomes_publicos', v)),
        e('div', { className: 'flex items-center justify-between py-1 border-t border-gray-200 pt-2' },
          e('div', null,
            e('p', { className: 'text-xs font-medium text-gray-800' }, 'Penalidade por sair voluntariamente'),
            e('p', { className: 'text-[11px] text-gray-500' }, 'Tempo de bloqueio antes de poder reentrar'),
          ),
          e('select', {
            value: dados.penalidade_min || 0,
            onChange: ev => setCampo('penalidade_min', parseInt(ev.target.value)),
            className: 'text-xs px-2 py-1 border border-gray-300 rounded bg-white'
          },
            e('option', { value: 0 }, 'Sem penalidade'),
            e('option', { value: 5 }, '5 minutos'),
            e('option', { value: 10 }, '10 minutos'),
            e('option', { value: 30 }, '30 minutos'),
          )
        )
      ),

      e('div', { className: 'flex justify-between items-center pt-3 border-t border-gray-200' },
        e('button', {
          onClick: () => excluirCentral(dados),
          className: 'text-xs text-red-600 hover:bg-red-50 px-3 py-1.5 rounded'
        }, '🗑️ Excluir central'),
        e('button', {
          onClick: () => salvarCentral(dados),
          className: 'text-xs px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium'
        }, '💾 Salvar')
      )
    );
  }

  function toggle(titulo, sub, checked, onChange) {
    return e('div', { className: 'flex items-center justify-between py-1' },
      e('div', { className: 'flex-1' },
        e('p', { className: 'text-xs font-medium text-gray-800' }, titulo),
        sub && e('p', { className: 'text-[11px] text-gray-500' }, sub),
      ),
      e('label', {
        className: `relative inline-block w-9 h-5 rounded-full cursor-pointer transition-colors ${checked ? 'bg-purple-600' : 'bg-gray-300'}`,
        onClick: () => onChange(!checked)
      },
        e('span', {
          className: 'absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all',
          style: { left: checked ? 'calc(100% - 18px)' : '2px' }
        })
      )
    );
  }

  function labelInput(label, value, onChange, type) {
    return e('div', null,
      e('label', { className: 'text-[11px] text-gray-500 block mb-1' }, label),
      e('input', {
        type: type || 'text',
        value: value,
        onChange: ev => onChange(ev.target.value),
        className: 'w-full h-9 px-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-100'
      })
    );
  }

  // ──────────────────────────────────────────────────────────
  // Vínculos
  // ──────────────────────────────────────────────────────────
  function renderVinculos(opts) {
    const { vinculos, fotos, profissionais, busca, setBusca, modalVincular, setModalVincular, vincularProfissional, desvincularProfissional } = opts;
    const codsVinculados = new Set(vinculos.map(v => String(v.cod_profissional)));
    const disponiveis = (profissionais || [])
      .filter(p => p.cod_profissional && !codsVinculados.has(String(p.cod_profissional)))
      .filter(p => {
        if (!busca) return true;
        const q = busca.toLowerCase();
        return (p.nome_profissional || '').toLowerCase().includes(q)
          || String(p.cod_profissional).includes(q);
      })
      .slice(0, 50);

    return e('div', { className: 'space-y-3' },
      e('div', { className: 'flex justify-between items-center' },
        e('p', { className: 'text-[11px] uppercase text-gray-500 tracking-wide font-medium' },
          `Vinculados · ${vinculos.length}`
        ),
        e('button', {
          onClick: () => setModalVincular(true),
          className: 'text-xs px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg'
        }, '+ Vincular motoboy')
      ),

      e('div', { className: 'bg-white border border-gray-200 rounded-lg divide-y divide-gray-100' },
        vinculos.length === 0
          ? e('p', { className: 'text-center text-gray-400 py-6 text-sm' }, 'Nenhum motoboy vinculado ainda')
          : vinculos.map(v => e('div', {
              key: v.cod_profissional,
              className: 'flex items-center gap-3 p-2.5'
            },
              avatar(v.cod_profissional, v.nome_profissional, fotos[v.cod_profissional], 32),
              e('div', { className: 'flex-1 min-w-0' },
                e('p', { className: 'text-sm text-gray-800 truncate' }, v.nome_profissional || '—'),
                e('p', { className: 'text-[11px] text-gray-400' }, 'cod ', v.cod_profissional),
              ),
              e('button', {
                onClick: () => desvincularProfissional(v.cod_profissional),
                title: 'Desvincular',
                className: 'text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded'
              }, '× desvincular')
            ))
      ),

      // Modal vincular
      modalVincular && e('div', {
        className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4',
        onClick: () => setModalVincular(false)
      },
        e('div', {
          className: 'bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col',
          onClick: ev => ev.stopPropagation()
        },
          e('div', { className: 'p-4 border-b border-gray-200' },
            e('p', { className: 'font-medium text-gray-800' }, 'Vincular motoboy à central'),
            e('input', {
              autoFocus: true,
              placeholder: '🔍 Buscar por nome ou código...',
              value: busca,
              onChange: ev => setBusca(ev.target.value),
              className: 'w-full mt-2 h-9 px-3 text-sm border border-gray-300 rounded-md'
            })
          ),
          e('div', { className: 'flex-1 overflow-y-auto p-2' },
            disponiveis.length === 0
              ? e('p', { className: 'text-center text-gray-400 py-6 text-sm' },
                  busca ? 'Nenhum motoboy encontrado' : 'Digite pra buscar...')
              : disponiveis.map(p => e('button', {
                  key: p.cod_profissional,
                  onClick: () => { vincularProfissional(p.cod_profissional, p.nome_profissional); setModalVincular(false); setBusca(''); },
                  className: 'w-full flex items-center gap-3 p-2.5 hover:bg-purple-50 rounded-lg text-left'
                },
                  avatar(p.cod_profissional, p.nome_profissional, null, 28),
                  e('div', { className: 'flex-1 min-w-0' },
                    e('p', { className: 'text-sm text-gray-800 truncate' }, p.nome_profissional),
                    e('p', { className: 'text-[10px] text-gray-400' }, 'cod ', p.cod_profissional)
                  )
                ))
          ),
          e('div', { className: 'p-3 border-t border-gray-200 flex justify-end' },
            e('button', {
              onClick: () => { setModalVincular(false); setBusca(''); },
              className: 'text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded'
            }, 'Fechar')
          )
        )
      )
    );
  }

  // ──────────────────────────────────────────────────────────
  // Logs (aba completa)
  // ──────────────────────────────────────────────────────────
  function renderLogs(opts) {
    const { logs } = opts;
    return e('div', { className: 'bg-white border border-gray-200 rounded-lg p-3' },
      e('p', { className: 'text-[11px] uppercase text-gray-500 tracking-wide font-medium mb-2' }, `Histórico do agente · ${logs.length} eventos`),
      logs.length === 0
        ? e('p', { className: 'text-center text-gray-400 py-6 text-sm' }, 'Nenhum evento ainda')
        : e('div', {
            className: 'space-y-0.5',
            style: { fontFamily: 'ui-monospace, monospace', fontSize: '11px', lineHeight: 1.7 }
          }, logs.map(l => renderLogLine(l)))
    );
  }

  function renderLogLine(l) {
    const cor = l.acao === 'removeu' || l.acao === 'admin_removeu' ? '#A32D2D'
      : l.acao === 'validou' ? '#27500A'
      : l.acao === 'bloqueou_entrada' ? '#854F0B'
      : '#6B7280';
    const sym = l.acao === 'removeu' || l.acao === 'admin_removeu' ? '×'
      : l.acao === 'validou' ? '✓'
      : l.acao === 'bloqueou_entrada' ? '!'
      : '·';
    return e('p', {
      key: l.id, className: 'text-gray-600 truncate',
      title: l.detalhes ? JSON.stringify(l.detalhes) : ''
    },
      e('span', { className: 'text-gray-400' }, formatarMinAtras(l.created_at), ' · '),
      e('span', { style: { color: cor } }, sym, ' '),
      l.nome_profissional ? l.nome_profissional + ' · ' : '',
      l.acao.replace(/_/g, ' '),
      l.motivo ? ' · ' + l.motivo : ''
    );
  }

  // ──────────────────────────────────────────────────────────
  // Modal de criar/editar central
  // ──────────────────────────────────────────────────────────
  function renderModalCentral(opts) {
    const { dados, onChange, onSalvar, onCancelar } = opts;
    const setCampo = (k, v) => onChange({ ...dados, [k]: v });

    return e('div', {
      className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4',
      onClick: onCancelar
    },
      e('div', {
        className: 'bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto',
        onClick: ev => ev.stopPropagation()
      },
        e('div', { className: 'p-5 space-y-3' },
          e('div', null,
            e('p', { className: 'text-lg font-semibold flex items-center gap-2' },
              '🤖 ', dados.id ? 'Editar central auto' : 'Nova central auto-gerenciável'
            ),
            e('p', { className: 'text-xs text-gray-500 mt-1' },
              'Motoboys se organizam · agente Playwright fiscaliza'
            )
          ),

          labelInput('Nome', dados.nome || '', v => setCampo('nome', v)),
          labelInput('Endereço', dados.endereco || '', v => setCampo('endereco', v)),

          e('div', { className: 'grid grid-cols-3 gap-2' },
            labelInput('Latitude', dados.latitude || '', v => setCampo('latitude', v)),
            labelInput('Longitude', dados.longitude || '', v => setCampo('longitude', v)),
            labelInput('Raio (m)', dados.raio_metros || 900, v => setCampo('raio_metros', parseInt(v) || 900), 'number'),
          ),

          e('div', { className: 'bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-900' },
            e('p', { className: 'font-medium mb-1' }, '💡 Como pegar latitude/longitude'),
            e('p', { className: 'text-purple-700' }, 'Abra o Google Maps no endereço da loja, clique com botão direito → o primeiro número da lista é "latitude, longitude". Copie cada um pro campo certo.')
          ),

          e('p', { className: 'text-[11px] uppercase text-gray-500 tracking-wide font-medium pt-1' }, 'Validação do agente'),
          e('div', { className: 'bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2' },
            toggle('Bloquear se motoboy tem corrida ativa', 'Agente checa no sistema externo',
              dados.validacao_agente_ativa !== false, v => setCampo('validacao_agente_ativa', v)),
            toggle('Remover automaticamente ao pegar corrida', 'Tira da fila quando detecta nova corrida',
              dados.remover_ao_pegar_corrida !== false, v => setCampo('remover_ao_pegar_corrida', v)),
            e('div', { className: 'flex items-center justify-between pt-2 border-t border-gray-200' },
              e('p', { className: 'text-xs text-gray-700' }, 'Frequência de varredura'),
              e('select', {
                value: dados.varredura_intervalo_seg || 30,
                onChange: ev => setCampo('varredura_intervalo_seg', parseInt(ev.target.value)),
                className: 'text-xs px-2 py-1 border border-gray-300 rounded bg-white'
              },
                e('option', { value: 15 }, '15s'),
                e('option', { value: 30 }, '30s'),
                e('option', { value: 60 }, '1min'),
                e('option', { value: 120 }, '2min'),
              )
            )
          ),

          e('p', { className: 'text-[11px] uppercase text-gray-500 tracking-wide font-medium pt-1' }, 'Regras dos motoboys'),
          e('div', { className: 'bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2' },
            toggle('Mostrar nomes na fila', 'Motoboys veem quem está à frente',
              dados.mostrar_nomes_publicos !== false, v => setCampo('mostrar_nomes_publicos', v)),
            e('div', { className: 'flex items-center justify-between pt-2 border-t border-gray-200' },
              e('p', { className: 'text-xs text-gray-700' }, 'Penalidade ao sair voluntariamente'),
              e('select', {
                value: dados.penalidade_min || 0,
                onChange: ev => setCampo('penalidade_min', parseInt(ev.target.value)),
                className: 'text-xs px-2 py-1 border border-gray-300 rounded bg-white'
              },
                e('option', { value: 0 }, 'Sem penalidade'),
                e('option', { value: 5 }, '5 min'),
                e('option', { value: 10 }, '10 min'),
                e('option', { value: 30 }, '30 min'),
              )
            )
          ),

          e('div', { className: 'flex justify-end gap-2 pt-3' },
            e('button', {
              onClick: onCancelar,
              className: 'text-xs px-3 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50'
            }, 'Cancelar'),
            e('button', {
              onClick: () => onSalvar(dados),
              disabled: !dados.nome || !dados.latitude || !dados.longitude,
              className: 'text-xs px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed'
            }, dados.id ? '💾 Salvar' : '🤖 Criar central auto')
          )
        )
      )
    );
  }

  // Exporta
  window.ModuloFilasAuto = ModuloFilasAuto;
  console.log('✅ ModuloFilasAuto carregado');
})();
