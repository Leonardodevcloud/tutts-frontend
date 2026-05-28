// ============================================================
// FILAS AUTO-GERENCIÁVEIS — visão MOTOBOY (app)
// ============================================================
// Renderizado quando:
//   - usuário é motoboy (não admin)
//   - usuário vinculado a central com tipo='auto'
//
// Diferenças vs filas.js (fila clássica):
//   - Motoboy vê TODOS da fila (não só sua posição) com foto/nome
//   - Indicador do agente Playwright validando
//   - Sem cooldown 15min após despacho — agente detecta nova corrida e remove
//   - Bloqueio quando agente detecta corridas ativas
//
// Não duplica lógica de GPS: recebe minhaLocalizacao + gpsStatus + solicitarGPS
// como props, já que o filas.js gerencia geolocalização compartilhada.
// ============================================================

(function () {
  const e = React.createElement;

  function ModuloFilasAutoMotoboy(props) {
    const {
      usuario, apiUrl, fetchAuth, showToast,
      minhaCentral,        // { id, central_nome, endereco, latitude, longitude, raio_metros, mostrar_nomes_publicos }
      minhaLocalizacao,    // { latitude, longitude } | null
      gpsStatus,           // 'permitido' | 'negado' | 'aguardando'
      solicitarGPS,        // () => void
      distanciaCentral,    // number | null
    } = props;

    // ── Estado ───────────────────────────────────────────────
    const [minhaPosicao, setMinhaPosicao] = React.useState(null);
    const [filaPublica, setFilaPublica] = React.useState({ fila: [], total: 0, mostrar_nomes_publicos: true });
    const [fotos, setFotos] = React.useState({});
    const [penalidade, setPenalidade] = React.useState(null);
    const [bloqueioCorrida, setBloqueioCorrida] = React.useState(null); // { corridas: [...] }
    // 🆕 2026-05-24: modal de bloqueio quando tenta voltar antes do cooldown 30min
    const [modalCooldown, setModalCooldown] = React.useState(null); // { minutos_restantes } | null
    const [modalSaida, setModalSaida] = React.useState(false);
    const [barreiraHorario, setBarreiraHorario] = React.useState(null); // { nome, horario_corte }
    let req_nome_profissional = '';
    const [textoConfirmSaida, setTextoConfirmSaida] = React.useState('');

    // Refs estáveis pra props (anti infinite-loop em useEffect)
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
    const carregarMinhaPosicao = React.useCallback(async () => {
      try {
        const r = await fetchAuthRef.current(`${apiUrlRef.current}/filas/auto/minha-posicao`);
        const d = await r.json();
        if (d.success) setMinhaPosicao(d.na_fila ? d : null);
      } catch (err) { /* segue silencioso no polling */ }
    }, []);

    const carregarFilaPublica = React.useCallback(async (centralId) => {
      if (!centralId) return;
      try {
        const r = await fetchAuthRef.current(`${apiUrlRef.current}/filas/auto/fila-publica/${centralId}`);
        const d = await r.json();
        if (d.success) {
          setFilaPublica({
            fila: d.fila || [],
            total: d.total || 0,
            mostrar_nomes_publicos: d.mostrar_nomes_publicos !== false,
          });
          // Carrega fotos só se for permitido mostrar nomes (caso contrário fotos não vêm)
          if (d.mostrar_nomes_publicos !== false) {
            const cods = (d.fila || []).map(p => p.cod_profissional).filter(c => c && /^\d+$/.test(c));
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
        }
      } catch (err) { /* silencioso */ }
    }, []);

    const carregarPenalidade = React.useCallback(async () => {
      try {
        const r = await fetchAuthRef.current(`${apiUrlRef.current}/filas/minha-penalidade`);
        const d = await r.json();
        if (d.success && d.bloqueado_ate && new Date(d.bloqueado_ate) > new Date()) {
          setPenalidade(d);
        } else {
          setPenalidade(null);
        }
      } catch (err) { /* silencioso */ }
    }, []);

    // ── Effects ──────────────────────────────────────────────
    // Polling 5s da posição + fila pública + penalidade
    React.useEffect(() => {
      if (!minhaCentral?.id) return;
      carregarMinhaPosicao();
      carregarFilaPublica(minhaCentral.id);
      carregarPenalidade();
      const i = setInterval(() => {
        carregarMinhaPosicao();
        carregarFilaPublica(minhaCentral.id);
      }, 5000);
      return () => clearInterval(i);
    }, [minhaCentral?.id, carregarMinhaPosicao, carregarFilaPublica, carregarPenalidade]);

    // ── Ações ────────────────────────────────────────────────
    const entrarNaFila = async () => {
      if (!minhaLocalizacao) {
        toast('Aguarde GPS', 'error');
        if (solicitarGPS) solicitarGPS();
        return;
      }
      try {
        req_nome_profissional = usuario?.nome || '';
        const r = await fetchAuth(`${apiUrl}/filas/auto/entrar`, {
          method: 'POST',
          body: JSON.stringify({
            latitude: minhaLocalizacao.latitude,
            longitude: minhaLocalizacao.longitude,
          }),
        });
        const d = await r.json();
        if (d.success) {
          toast(`Entrou! Posição ${d.posicao}. Agente vai confirmar em segundos.`, 'success');
          setBloqueioCorrida(null);
          carregarMinhaPosicao();
          carregarFilaPublica(minhaCentral.id);
        } else if (d.error === 'barreira_horario') {
          setBarreiraHorario({
            nome: usuario?.nome || '',
            horario_corte: d.horario_corte || '',
          });
        } else if (d.error === 'cooldown_despacho') {
          // 🆕 2026-05-24: em vez de toast vermelho, abre modal com explicação
          setModalCooldown({ minutos_restantes: d.minutos_restantes || 30 });
        } else if (d.error === 'fora_do_raio') {
          toast(d.mensagem || 'Aproxime-se da central', 'error');
        } else if (d.error === 'penalidade_ativa') {
          toast(d.mensagem || 'Aguarde penalidade terminar', 'error');
          carregarPenalidade();
        } else if (d.error === 'ja_na_fila') {
          carregarMinhaPosicao();
        } else if (d.error === 'sem_vinculo') {
          toast('Você não está vinculado a nenhuma fila auto', 'error');
        } else {
          toast(d.mensagem || d.error || 'Erro ao entrar', 'error');
        }
      } catch (err) {
        console.error('[fila-auto-mb] entrarNaFila:', err);
        toast('Erro de conexão', 'error');
      }
    };

    const abrirModalSaida = () => {
      setTextoConfirmSaida('');
      setModalSaida(true);
    };

    const confirmarSaida = async () => {
      if (textoConfirmSaida.trim().toUpperCase() !== 'SAIR') {
        toast('Digite SAIR para confirmar', 'error');
        return;
      }
      setModalSaida(false);
      setTextoConfirmSaida('');
      try {
        const r = await fetchAuth(`${apiUrl}/filas/auto/sair`, { method: 'POST' });
        const d = await r.json();
        if (d.success) {
          toast(d.mensagem || 'Você saiu da fila', 'warning');
          carregarMinhaPosicao();
          carregarFilaPublica(minhaCentral.id);
          carregarPenalidade();
        } else {
          toast(d.error || 'Erro', 'error');
        }
      } catch (err) { toast('Erro de conexão', 'error'); }
    };

    // Mantido por compatibilidade com código legado que chama sairDaFila diretamente
    const sairDaFila = abrirModalSaida;

    // ── Helpers de UI ────────────────────────────────────────
    function avatar(cod, nome, foto, size) {
      size = size || 24;
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
        style: { width: size + 'px', height: size + 'px', fontSize: Math.round(size * 0.4) + 'px' },
        className: 'rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-semibold flex-shrink-0'
      }, iniciais);
    }

    function tempoDecorrido(iso) {
      if (!iso) return '—';
      const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
      if (s < 60) return `${s}s`;
      const m = Math.floor(s / 60);
      if (m < 60) return `${m}min`;
      const h = Math.floor(m / 60);
      return `${h}h${m % 60}min`;
    }

    // ════════════════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════════════════

    // ── Sem central vinculada ──
    if (!minhaCentral) {
      return e('div', { className: 'min-h-[400px] flex items-center justify-center' },
        e('div', { className: 'text-center bg-white rounded-2xl shadow-lg p-8 max-w-md mx-4' },
          e('span', { className: 'text-6xl block mb-4' }, '🚫'),
          e('h2', { className: 'text-xl font-bold text-gray-800 mb-2' }, 'Sem acesso à fila'),
          e('p', { className: 'text-gray-600' }, 'Você não está vinculado a nenhuma central auto-gerenciável.')
        )
      );
    }

    const naFila = !!minhaPosicao;
    const penalizado = !!penalidade;
    const podeChekin = gpsStatus === 'permitido' && (distanciaCentral === null || distanciaCentral <= minhaCentral.raio_metros);

    // ── Container principal (mobile-first, simula tela do app) ──
    return e('div', { className: 'max-w-md mx-auto p-3 space-y-3' },

      // ═══ HEADER ═══
      e('div', { className: 'bg-purple-600 text-white rounded-2xl p-4 shadow-md' },
        e('div', { className: 'flex items-center gap-3 mb-2' },
          e('span', { className: 'text-2xl' }, '🤖'),
          e('div', { className: 'flex-1 min-w-0' },
            e('h1', { className: 'text-base font-bold truncate' }, minhaCentral.central_nome),
            e('p', { className: 'text-purple-200 text-xs flex items-center gap-1' },
              e('span', { style: { width: '6px', height: '6px', borderRadius: '50%', background: '#86EFAC' } }),
              'Fila auto-gerenciável'
            )
          )
        ),
        // Status GPS
        e('div', { className: 'flex items-center gap-2 bg-white/10 rounded-lg p-2 text-xs' },
          e('span', null, gpsStatus === 'permitido' ? '📍' : '⚠️'),
          e('div', { className: 'flex-1 min-w-0' },
            e('p', { className: 'font-medium' },
              gpsStatus === 'permitido' ? 'GPS ativo' :
              gpsStatus === 'negado' ? 'GPS bloqueado' : 'Verificando GPS...'
            ),
            distanciaCentral !== null && gpsStatus === 'permitido' && e('p', {
              className: distanciaCentral <= minhaCentral.raio_metros ? 'text-green-200' : 'text-red-200'
            }, `Você está a ${distanciaCentral}m da central (máx ${minhaCentral.raio_metros}m)`)
          ),
          gpsStatus === 'negado' && e('button', {
            onClick: solicitarGPS,
            className: 'px-2 py-1 bg-white/20 rounded text-xs'
          }, 'Permitir')
        )
      ),

      // ═══ ESTADO PENALIZADO ═══
      penalizado && e('div', { className: 'bg-red-50 border-2 border-red-300 rounded-2xl p-5 text-center' },
        e('span', { className: 'text-4xl block mb-2' }, '⏳'),
        e('h2', { className: 'text-lg font-bold text-red-800' }, 'Você está bloqueado'),
        e('p', { className: 'text-red-600 text-sm mt-1' },
          'Pode voltar à fila em alguns minutos.'
        )
      ),

      // ═══ ESTADO BLOQUEIO POR CORRIDA ATIVA ═══
      // (futuro: o backend pode retornar isso ao tentar entrar)
      !penalizado && bloqueioCorrida && e('div', { className: 'bg-red-50 border border-red-300 rounded-2xl p-4' },
        e('div', { className: 'text-center mb-3' },
          e('span', { className: 'text-4xl block mb-2' }, '🛵'),
          e('h2', { className: 'text-base font-bold text-red-800' }, 'Você tem corridas ativas'),
          e('p', { className: 'text-xs text-red-700 mt-1' },
            'Finalize suas entregas antes de voltar pra fila'
          )
        ),
        e('div', { className: 'bg-white rounded-xl p-3 space-y-2' },
          e('p', { className: 'text-[10px] uppercase tracking-wide text-gray-500 font-medium' },
            `Corridas em aberto (${bloqueioCorrida.corridas?.length || 0})`
          ),
          (bloqueioCorrida.corridas || []).map((c, i) => e('div', {
            key: i, className: 'flex items-center gap-2 py-1 border-b border-gray-100 last:border-0'
          },
            e('span', null, '📦'),
            e('div', { className: 'flex-1 text-xs' },
              e('p', { className: 'font-medium text-gray-800' }, `OS ${c.os_numero || '?'}`),
              e('p', { className: 'text-gray-500 text-[10px]' }, c.status || '—')
            )
          ))
        ),
        e('button', {
          onClick: () => { setBloqueioCorrida(null); entrarNaFila(); },
          className: 'w-full mt-3 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium'
        }, '🔄 Verificar novamente')
      ),

      // ═══ ESTADO: EM ROTA (despachado pelo agente) ═══
      // 🆕 2026-05-24: tela igual fila clássica — card verde 🏍️ + msg de cooldown
      // ou botão de retorno quando o cooldown 30min expirou.
      !penalizado && !bloqueioCorrida && naFila && minhaPosicao.status === 'em_rota' && renderTelaEmRota({
        minhaPosicao, entrarNaFila, podeChekin,
      }),

      // ═══ ESTADO: JÁ NA FILA (aguardando) ═══
      !penalizado && !bloqueioCorrida && naFila && minhaPosicao.status !== 'em_rota' && renderTelaNaFila({
        minhaPosicao, filaPublica, fotos, avatar, tempoDecorrido,
        usuarioCod: usuario?.codProfissional || usuario?.cod_profissional,
        barreiraHorario, setBarreiraHorario,
        sairDaFila: abrirModalSaida,
        modalSaida, setModalSaida,
        textoConfirmSaida, setTextoConfirmSaida,
        confirmarSaida,
      }),

      // ═══ ESTADO: PRONTO PARA ENTRAR ═══
      !penalizado && !bloqueioCorrida && !naFila && renderTelaEntrar({
        minhaCentral, distanciaCentral, gpsStatus, podeChekin,
        entrarNaFila, filaPublica,
      }),

      // ═══ MODAL: bloqueio por cooldown (tentou voltar antes dos 30min) ═══
      modalCooldown && renderModalCooldown({
        minutos_restantes: modalCooldown.minutos_restantes,
        onFechar: () => setModalCooldown(null),
      })
    );
  }

  // ──────────────────────────────────────────────────────────
  // Tela: motoboy DENTRO da fila
  // ──────────────────────────────────────────────────────────
  function renderTelaNaFila(opts) {
    const { minhaPosicao, filaPublica, fotos, avatar, tempoDecorrido, usuarioCod,
            sairDaFila, modalSaida, setModalSaida, textoConfirmSaida,
            setTextoConfirmSaida, confirmarSaida,
            barreiraHorario, setBarreiraHorario } = opts;
    const minutosDecorridos = Math.floor((Date.now() - new Date(minhaPosicao.entrada_fila_at).getTime()) / 60000);
    const agenteStatus = minhaPosicao.agente_status || 'pendente';

    return e('div', { className: 'space-y-3' },
      // Cartão grande com a posição
      e('div', { className: 'bg-purple-50 border border-purple-200 rounded-2xl p-5 text-center' },
        e('p', { className: 'text-[10px] uppercase tracking-wider text-purple-700 font-semibold' }, 'Sua posição'),
        e('p', { className: 'text-5xl font-bold text-purple-900 my-2 leading-none' },
          minhaPosicao.posicao, e('span', { className: 'text-2xl' }, 'º')
        ),
        e('p', { className: 'text-xs text-purple-700' },
          `aguardando há ${minutosDecorridos}min · de ${minhaPosicao.total_fila} na fila`
        ),
        // Status do agente
        agenteStatus === 'pendente' && e('p', {
          className: 'mt-2 text-[10px] text-amber-700 bg-amber-100 inline-block px-2 py-1 rounded'
        }, '🤖 agente verificando...'),
        agenteStatus === 'validado' && e('p', {
          className: 'mt-2 text-[10px] text-green-700 bg-green-100 inline-block px-2 py-1 rounded'
        }, '✓ validado pelo agente'),
        agenteStatus === 'reprovado' && e('p', {
          className: 'mt-2 text-[10px] text-red-700 bg-red-100 inline-block px-2 py-1 rounded'
        }, '⚠️ agente detectou corrida ativa')
      ),

      // Lista pública da fila
      e('div', null,
        e('p', { className: 'text-[10px] uppercase tracking-wide text-gray-500 font-medium mb-2 px-1' },
          `Fila completa · ${filaPublica.total} motoboy${filaPublica.total === 1 ? '' : 's'}`
        ),
        e('div', { className: 'bg-gray-50 rounded-xl p-1.5 space-y-1' },
          (filaPublica.fila || []).map(p => {
            const ehVoce = String(p.cod_profissional) === String(usuarioCod);
            return e('div', {
              key: p.cod_profissional,
              className: ehVoce
                ? 'flex items-center gap-2 p-2 bg-purple-100 border border-purple-300 rounded-lg'
                : 'flex items-center gap-2 p-2 bg-white rounded-lg'
            },
              // Pos
              e('span', {
                className: ehVoce
                  ? 'w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0'
                  : 'w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-[11px] font-medium flex-shrink-0'
              }, p.posicao),
              // Avatar
              avatar(p.cod_profissional, p.nome_profissional, fotos[p.cod_profissional], 24),
              // Nome
              e('span', {
                className: ehVoce
                  ? 'flex-1 text-xs font-semibold text-purple-900 truncate'
                  : 'flex-1 text-xs text-gray-800 truncate'
              },
                ehVoce ? 'Você' : (p.nome_profissional || '—')
              ),
              // Tempo
              e('span', {
                className: 'text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded'
              }, tempoDecorrido(p.entrada_fila_at))
            );
          })
        )
      ),

      // Info do agente
      e('div', { className: 'bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2' },
        e('span', { className: 'text-base' }, '🤖'),
        e('div', null,
          e('p', { className: 'text-xs font-medium text-amber-900' }, 'Agente monitorando'),
          e('p', { className: 'text-[11px] text-amber-700 mt-0.5 leading-snug' },
            'Se você pegar uma corrida no sistema, o agente vai te tirar da fila automaticamente.'
          )
        )
      ),

      // ── Tela fullscreen: barreira de horário ──────────────────
      barreiraHorario && e('div', {
        className: 'fixed inset-0 z-50 flex flex-col items-center justify-center p-6',
        style: { background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)' }
      },
        e('div', { className: 'max-w-sm w-full text-center space-y-6' },
          // Ícone
          e('div', { className: 'flex justify-center' },
            e('div', { className: 'w-24 h-24 rounded-full bg-white/10 flex items-center justify-center' },
              e('span', { className: 'text-5xl' }, '🚧')
            )
          ),
          // Saudação
          e('div', null,
            e('h1', { className: 'text-2xl font-bold text-white mb-1' },
              `Bom dia${barreiraHorario.nome ? ', ' + barreiraHorario.nome.split(' ')[0] : ''}!`
            ),
            e('div', { className: 'h-px bg-white/20 my-4' })
          ),
          // Mensagem principal
          e('div', { className: 'bg-white/10 rounded-2xl p-5 backdrop-blur-sm border border-white/20' },
            e('p', { className: 'text-white text-base leading-relaxed' },
              'Você está acessando a fila muito tempo após o início da operação acordada. ',
              'Neste momento, todas as vagas estão preenchidas e ',
              e('strong', null, 'não será possível acessar.')
            ),
            e('p', { className: 'text-purple-200 text-sm mt-3 leading-relaxed' },
              'Entre em contato com o suporte para regularizar sua situação.'
            )
          ),
          // Horário de corte
          barreiraHorario.horario_corte && e('div', { className: 'text-purple-300 text-sm' },
            `Horário de ingresso encerrado após ${barreiraHorario.horario_corte}`
          ),
          // Botão fechar
          e('button', {
            onClick: () => setBarreiraHorario(null),
            className: 'w-full py-3 bg-white/15 hover:bg-white/25 text-white rounded-xl font-medium transition-colors border border-white/20 text-sm'
          }, 'Fechar')
        )
      ),

      // Modal confirmação de saída
      modalSaida && e('div', { className: 'fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4' },
        e('div', { className: 'bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden' },
          // Header vermelho
          e('div', { className: 'bg-red-600 px-5 py-4 text-white text-center' },
            e('span', { className: 'text-4xl block mb-1' }, '🚫'),
            e('h2', { className: 'text-lg font-bold' }, 'Sair da fila?'),
            e('p', { className: 'text-red-200 text-xs mt-1' }, 'Esta ação não pode ser desfeita')
          ),
          e('div', { className: 'p-5 space-y-4' },
            // Aviso de punição
            e('div', { className: 'bg-red-50 border border-red-200 rounded-xl p-4' },
              e('p', { className: 'text-sm font-bold text-red-800 mb-2 text-center' }, '⚠️ Você será bloqueado'),
              e('p', { className: 'text-sm text-red-700 text-center leading-relaxed' },
                'Ao sair voluntariamente, você ',
                e('strong', null, 'não poderá reentrar na fila'),
                ' pelo período de punição configurado.'
              )
            ),
            // Campo de confirmação
            e('div', null,
              e('p', { className: 'text-sm text-gray-600 text-center mb-2' },
                'Para confirmar, digite ',
                e('strong', { className: 'text-red-700 font-mono tracking-widest' }, 'SAIR'),
                ' abaixo:'
              ),
              e('input', {
                type: 'text',
                value: textoConfirmSaida,
                onChange: ev => setTextoConfirmSaida(ev.target.value),
                onKeyDown: ev => { if (ev.key === 'Enter') confirmarSaida(); },
                placeholder: 'Digite SAIR',
                autoFocus: true,
                className: 'w-full text-center text-xl font-bold tracking-widest border-2 rounded-xl py-3 px-4 focus:outline-none ' +
                  (textoConfirmSaida.trim().toUpperCase() === 'SAIR'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-300 text-gray-700')
              })
            ),
            // Botões
            e('div', { className: 'flex gap-3' },
              e('button', {
                onClick: () => { setModalSaida(false); setTextoConfirmSaida(''); },
                className: 'flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-300'
              }, 'Cancelar'),
              e('button', {
                onClick: confirmarSaida,
                disabled: textoConfirmSaida.trim().toUpperCase() !== 'SAIR',
                className: 'flex-1 py-3 rounded-xl font-bold text-sm ' +
                  (textoConfirmSaida.trim().toUpperCase() === 'SAIR'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-300 text-gray-400 cursor-not-allowed')
              }, 'Confirmar saída')
            )
          )
        )
      ),

      // Botão sair
      e('button', {
        onClick: sairDaFila,
        className: 'w-full py-3 bg-white border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50'
      }, 'Sair da fila')
    );
  }

  // ──────────────────────────────────────────────────────────
  // Tela: motoboy NA SALA DE ESPERA (pronto pra entrar)
  // ──────────────────────────────────────────────────────────
  function renderTelaEntrar(opts) {
    const { minhaCentral, distanciaCentral, gpsStatus, podeChekin, entrarNaFila, filaPublica } = opts;

    return e('div', { className: 'space-y-3' },
      // KPI compacto: quantos na fila agora
      e('div', { className: 'bg-white rounded-xl border border-gray-200 p-4 text-center' },
        e('p', { className: 'text-[10px] uppercase tracking-wide text-gray-500 font-medium' }, 'Fila no momento'),
        e('p', { className: 'text-3xl font-bold text-gray-800 mt-1' }, filaPublica.total || 0,
          e('span', { className: 'text-sm text-gray-400 font-normal' }, ' motoboy', filaPublica.total === 1 ? '' : 's')
        )
      ),

      // Status pronto/não pronto
      podeChekin
        ? e('div', { className: 'bg-green-50 border border-green-300 rounded-xl p-3 flex items-center gap-2' },
            e('span', { className: 'text-xl' }, '✅'),
            e('div', { className: 'flex-1' },
              e('p', { className: 'text-sm font-medium text-green-900' }, 'GPS confirmado'),
              e('p', { className: 'text-[11px] text-green-700' }, 'Pronto pra entrar na fila')
            )
          )
        : e('div', { className: 'bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-center gap-2' },
            e('span', { className: 'text-xl' }, '📍'),
            e('div', { className: 'flex-1' },
              e('p', { className: 'text-sm font-medium text-amber-900' },
                gpsStatus !== 'permitido' ? 'Aguardando GPS' : 'Você está muito longe'
              ),
              e('p', { className: 'text-[11px] text-amber-700' },
                gpsStatus !== 'permitido'
                  ? 'Permita acesso à localização'
                  : `${distanciaCentral}m da central (máx ${minhaCentral.raio_metros}m)`
              )
            )
          ),

      // Botão grande de entrar
      e('button', {
        onClick: entrarNaFila,
        disabled: !podeChekin,
        className: podeChekin
          ? 'w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-base font-semibold transition-colors'
          : 'w-full py-4 bg-gray-200 text-gray-400 rounded-xl text-base font-semibold cursor-not-allowed'
      }, '🚀 Entrar na fila'),

      e('p', { className: 'text-center text-[10px] text-gray-400 leading-relaxed px-4' },
        'Ao entrar, o agente vai verificar no sistema se você não tem corridas ativas. Se tiver, te tira da fila automaticamente.'
      )
    );
  }

  // ──────────────────────────────────────────────────────────
  // Tela: motoboy EM ROTA (despachado pelo agente)
  // 🆕 2026-05-24: mesmo padrão visual da fila clássica
  // - Card verde com 🏍️
  // - Durante cooldown: mensagem laranja
  // - Após cooldown: mensagem verde + botão de retorno
  // ──────────────────────────────────────────────────────────
  function renderTelaEmRota(opts) {
    const { minhaPosicao, entrarNaFila, podeChekin } = opts;
    const cooldownAtivo = (minhaPosicao.cooldown_restante || 0) > 0;
    const minutosRestantes = minhaPosicao.cooldown_restante || 0;

    return e('div', { className: 'border-2 rounded-2xl p-6 bg-green-50 border-green-300' },
      // Cabeçalho 🏍️ + título
      e('div', { className: 'flex items-center gap-4 mb-4' },
        e('span', { className: 'text-5xl' }, '🏍️'),
        e('div', null,
          e('h2', { className: 'text-xl font-bold text-green-800' }, 'Você está em rota!'),
          e('p', { className: 'text-green-600 text-sm' },
            cooldownAtivo ? 'Aguarde para voltar à fila' : 'Pronto para voltar'
          )
        )
      ),

      // Bloco da mensagem (laranja durante cooldown, verde quando pode voltar)
      cooldownAtivo
        ? e('div', { className: 'bg-orange-50 border border-orange-300 rounded-xl p-4' },
            e('p', { className: 'text-sm text-orange-800 leading-relaxed' },
              '🤖 O agente detectou corridas ativas no seu nome. Você saiu da fila automaticamente. Finalize as entregas e poderá voltar em ',
              e('strong', null, `${minutosRestantes} ${minutosRestantes === 1 ? 'minuto' : 'minutos'}`),
              '.'
            )
          )
        : e(React.Fragment, null,
            e('div', { className: 'bg-green-100 border border-green-300 rounded-xl p-4 mb-4' },
              e('p', { className: 'text-sm text-green-800 leading-relaxed' },
                '✅ Se finalizou suas entregas, retorne para a fila quando estiver próximo da central.'
              )
            ),
            e('button', {
              onClick: entrarNaFila,
              disabled: !podeChekin,
              className: `w-full py-4 rounded-xl font-bold text-lg ${!podeChekin ? 'bg-gray-300 text-gray-500' : 'bg-green-600 text-white hover:bg-green-700'}`,
            }, '🔄 Retornar para a fila')
          )
    );
  }

  // ──────────────────────────────────────────────────────────
  // Modal: bloqueio por cooldown (substitui toast)
  // 🆕 2026-05-24: aparece quando motoboy clica "voltar" antes dos 30min
  // ──────────────────────────────────────────────────────────
  function renderModalCooldown(opts) {
    const { minutos_restantes, onFechar } = opts;
    return e('div', {
      className: 'fixed inset-0 z-50 flex items-center justify-center p-4',
      style: { background: 'rgba(0,0,0,0.45)' },
      onClick: onFechar,
    },
      e('div', {
        className: 'bg-white rounded-2xl p-5 max-w-sm w-full',
        onClick: (ev) => ev.stopPropagation(),
      },
        e('div', { className: 'text-center mb-4' },
          e('span', { className: 'text-5xl block mb-2' }, '⏳'),
          e('h3', { className: 'text-lg font-bold text-gray-800 mb-2' }, 'Calma aí!'),
          e('p', { className: 'text-sm text-gray-600 leading-relaxed' },
            'Você foi despachado há pouco. Finalize sua corrida e conseguirá entrar na fila novamente em ',
            e('strong', { className: 'text-orange-700' },
              `${minutos_restantes} ${minutos_restantes === 1 ? 'minuto' : 'minutos'}`
            ),
            '.'
          )
        ),
        e('div', { className: 'bg-orange-50 border border-orange-300 rounded-lg p-3 mb-4' },
          e('p', { className: 'text-xs text-orange-800 leading-relaxed' },
            '💡 Esse tempo serve pra você ter chance de finalizar a corrida e não furar a fila dos outros motoboys.'
          )
        ),
        e('button', {
          onClick: onFechar,
          className: 'w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold',
        }, 'Entendi')
      )
    );
  }

  window.ModuloFilasAutoMotoboy = ModuloFilasAutoMotoboy;
  console.log('✅ ModuloFilasAutoMotoboy carregado');
})();
