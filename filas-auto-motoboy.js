/* UI_UNIFICADO_V1: emojis -> sprite de icones; cores na paleta unica (CORES_TOKENS_V1). */
/* FILAS_CLEAN_V1: redesign clean da visão do motoboy (fila auto), mobile-first. */
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
  const e = React.createElement; /* FILAS_ICONS_V3 */
  // FILAS_CLEAN_V1 — helpers visuais (cartões brancos, pílulas suaves, botões 48px mobile-first). Só visual.
  const SORA = 'Sora, Inter, sans-serif';
  const TOM = {
    verde: ['#f0fdf4', '#166534', '#16a34a'], ambar: ['#fffbeb', '#92400e', '#d97706'],
    vermelho: ['#fef2f2', '#991b1b', '#dc2626'], azul: ['#eff6ff', '#1e40af', '#2563eb'],
    cinza: ['#f3f4f6', '#374151', '#6b7280'], roxo: ['#faf7fd', '#5d0b85', '#770fa8'],
  };
  const ico = (nome, sz, cor) => e('svg', { className: 'ico', style: { width: sz || 16, height: sz || 16, color: cor, flex: 'none' }, 'aria-hidden': 'true' }, e('use', { href: '#i-' + nome }));
  const dot = (cor) => e('span', { 'aria-hidden': 'true', style: { width: 6, height: 6, borderRadius: 99, background: cor, display: 'inline-block', flex: 'none' } });
  const pill = (tom, txt) => { const t = TOM[tom] || TOM.cinza; return e('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 99, padding: '2px 9px', fontWeight: 600, fontSize: 11.5, lineHeight: '18px', background: t[0], color: t[1], whiteSpace: 'nowrap' } }, dot(t[2]), txt); };
  const CARD = 'bg-white border border-gray-200 rounded-[14px]';
  const BTN_GRANDE = 'w-full h-12 rounded-[12px] text-base font-semibold inline-flex items-center justify-center gap-2 transition-colors';
  const BTN_SEC_SM = 'inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-[8px] bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium transition-colors whitespace-nowrap';

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
    // FILAS_DIARIA_VAGAS_FRONT_V1_STATE: { limite, mensagem } | null
    const [modalFilaCheia, setModalFilaCheia] = React.useState(null);
    const [modalSaida, setModalSaida] = React.useState(false);
    // AVISO_BONUS_NEUTRO_V3_STATE
    // Um estado so serve o Garantido E a Diaria: a central e ou uma ou outra
    // (CHECK no banco), entao nunca chegam os dois. Duas telas quase iguais
    // divergiriam em seis meses - e aqui divergir significa uma delas voltar a
    // dizer o que nao pode.
    const [garantidoAviso, setGarantidoAviso] = React.useState(null); // { valor }
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
          // AVISO_BONUS_NEUTRO_V3_TRIGGER
          //
          // O modal aparece em TODO 1o ingresso do dia, e essa condicao e
          // deliberada: nao filtre por valor.
          //
          // Uma tela que so aparece quando o valor e menor comunica perda pelo
          // simples fato de existir - o motoboy aprende o que aquele modal
          // significa antes de ler. Aparecendo sempre, ela e o recibo do bonus
          // do dia.
          //
          // Custo: um toque a mais por dia, uma vez so.
          //
          // `??` e nao `||`: valor 0 e legitimo (ingresso fora da janela) e com
          // `||` cairia no outro operando calado.
          const bonusHoje = d.diaria || d.garantido;
          if (bonusHoje && bonusHoje.primeiro_do_dia) {
            setGarantidoAviso({ valor: bonusHoje.valor_diaria ?? bonusHoje.valor_garantido ?? 0 });
          }
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
        } else if (d.error === 'fila_cheia') {
          // FILAS_DIARIA_VAGAS_FRONT_V1_HANDLER
          // Modal, e nao toast — mesmo motivo do cooldown_despacho logo acima.
          // Toast some em 3 segundos e o motoboy fica sem saber o que houve; ele
          // tenta de novo, falha de novo, e liga pro suporte. Um modal que diz o
          // numero e diz quando zera nao gera ligacao.
          setModalFilaCheia({ limite: d.limite, mensagem: d.mensagem });
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
          style: { width: size + 'px', height: size + 'px', objectFit: 'cover', border: '1px solid #e5e7eb' },
          className: 'rounded-full flex-shrink-0'
        });
      }
      return e('div', {
        style: { width: size + 'px', height: size + 'px', fontSize: Math.round(size * 0.4) + 'px' },
        className: 'rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-semibold flex-shrink-0'
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
        e('div', { className: CARD + ' text-center p-8 max-w-md mx-4' },
          e('div', { className: 'mb-3 inline-flex' }, pill('cinza', 'Sem vínculo')),
          e('h2', { className: 'text-lg font-semibold text-gray-900 mb-1' }, 'Sem acesso à fila'),
          e('p', { className: 'text-sm text-gray-500' }, 'Você não está vinculado a nenhuma central auto-gerenciável.')
        )
      );
    }

    const naFila = !!minhaPosicao;
    const penalizado = !!penalidade;
    const podeChekin = gpsStatus === 'permitido' && (distanciaCentral === null || distanciaCentral <= minhaCentral.raio_metros);

    // ── Container principal (mobile-first, simula tela do app) — FILAS_CLEAN_V1 ──
    return e('div', { className: 'max-w-md mx-auto space-y-3 -mx-1 sm:mx-auto' },

      // ═══ HEADER (cartão branco: central + GPS) ═══
      e('div', { className: CARD + ' p-4' },
        e('div', { className: 'flex items-start justify-between gap-3' },
          e('div', { className: 'flex-1 min-w-0' },
            e('h1', { className: 'text-lg font-semibold text-gray-900 truncate', style: { fontFamily: SORA } }, minhaCentral.central_nome),
            e('p', { className: 'text-xs text-gray-500 mt-0.5' }, 'Fila auto-gerenciável')
          ),
          pill('roxo', 'Auto')
        ),
        // Status GPS
        e('div', { className: 'flex items-center gap-2 mt-3 pt-3 border-t border-gray-100' },
          gpsStatus === 'permitido' ? pill('verde', 'GPS ativo') : gpsStatus === 'negado' ? pill('vermelho', 'GPS bloqueado') : pill('ambar', 'Verificando GPS...'),
          e('p', { className: 'flex-1 min-w-0 text-xs tabular-nums ' + (distanciaCentral !== null && distanciaCentral > minhaCentral.raio_metros ? 'text-red-800' : 'text-gray-500') },
            distanciaCentral !== null && gpsStatus === 'permitido' ? `Você está a ${distanciaCentral}m da central (máx ${minhaCentral.raio_metros}m)` : ''
          ),
          gpsStatus === 'negado' && e('button', {
            onClick: solicitarGPS,
            className: BTN_SEC_SM
          }, 'Permitir')
        )
      ),

      // ═══ ESTADO PENALIZADO ═══
      penalizado && e('div', { className: CARD + ' p-6 text-center' },
        e('div', { className: 'mb-3 inline-flex' }, pill('vermelho', 'Bloqueado')),
        e('h2', { className: 'text-lg font-semibold text-gray-900' }, 'Você está bloqueado'),
        e('p', { className: 'text-sm text-gray-500 mt-1' },
          'Pode voltar à fila em alguns minutos.'
        )
      ),

      // ═══ ESTADO BLOQUEIO POR CORRIDA ATIVA ═══
      // (futuro: o backend pode retornar isso ao tentar entrar)
      !penalizado && bloqueioCorrida && e('div', { className: CARD + ' p-4' },
        e('div', { className: 'text-center mb-3' },
          e('div', { className: 'mb-2 inline-flex' }, pill('vermelho', 'Corridas ativas')),
          e('h2', { className: 'text-base font-semibold text-gray-900' }, 'Você tem corridas ativas'),
          e('p', { className: 'text-xs text-gray-500 mt-1' },
            'Finalize suas entregas antes de voltar pra fila'
          )
        ),
        e('div', { className: 'border border-gray-200 rounded-[12px] overflow-hidden' },
          e('p', { className: 'text-xs font-semibold text-gray-500 px-3 py-2 bg-gray-50' },
            `Corridas em aberto (${bloqueioCorrida.corridas?.length || 0})`
          ),
          (bloqueioCorrida.corridas || []).map((c, i) => e('div', {
            key: i, className: 'flex items-center gap-2 px-3 py-2 border-t border-gray-100'
          },
            ico('package', 15, '#6b7280'),
            e('div', { className: 'flex-1 text-xs' },
              e('p', { className: 'font-semibold text-gray-900 tabular-nums' }, `OS ${c.os_numero || '?'}`),
              e('p', { className: 'text-gray-500 text-[11px]' }, c.status || '—')
            )
          ))
        ),
        e('button', {
          onClick: () => { setBloqueioCorrida(null); entrarNaFila(); },
          className: BTN_GRANDE + ' mt-3 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
        }, ico('refresh', 18), 'Verificar novamente')
      ),

      // ═══ ESTADO: EM ROTA (despachado pelo agente) ═══
      // 🆕 2026-05-24: tela igual fila clássica + msg de cooldown
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
      }),

      // FILAS_DIARIA_VAGAS_FRONT_V1_MODAL
      modalFilaCheia && e('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4', onClick: () => setModalFilaCheia(null) },
        e('div', { className: 'bg-white border border-gray-200 rounded-[16px] p-6 max-w-sm w-full', onClick: (ev) => ev.stopPropagation() },
          e('div', { className: 'text-center mb-4' },
            e('div', { className: 'mb-3 inline-flex' }, pill('ambar', 'Sem vagas')),
            e('h2', { className: 'text-lg font-semibold text-gray-900 mb-1' }, 'Fila cheia hoje')
          ),
          e('div', { className: 'bg-amber-50 rounded-[12px] p-4 mb-4' },
            e('p', { className: 'text-sm text-amber-800 leading-relaxed text-center' },
              // A mensagem vem pronta do backend, com o numero da central dentro.
              // Se um dia faltar, o fallback ainda diz QUANDO zera — que e a
              // informacao que evita a ligacao pro suporte.
              modalFilaCheia.mensagem || 'As vagas de hoje ja foram todas ocupadas. As vagas zeram a meia-noite.')
          ),
          e('p', { className: 'text-xs text-gray-500 text-center leading-relaxed mb-4' },
            'A vaga e contada por quem ', e('strong', null, 'entrou hoje'), ' — nao por quem esta na fila agora. ',
            'Por isso pode ter gente fora e ainda assim nao ter vaga.'
          ),
          e('button', {
            onClick: () => setModalFilaCheia(null),
            className: BTN_GRANDE + ' bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }, 'Entendi')
        )
      ),

      // ══════════════════════════════════════════════════════════════════════
      // AVISO_BONUS_NEUTRO_V3_MODAL
      //
      // ESTE TEXTO PASSOU POR REVISÃO JURÍDICA. NÃO ALTERE SEM NOVA REVISÃO.
      // (FILAS_CLEAN_V1: só o visual mudou — título, frase, valor e botão são os mesmos.)
      //
      // Regras que o texto desta tela precisa respeitar:
      //
      //   - não mencionar horário de início, de referência, nem o horário do
      //     próprio ingresso. Nenhum horário.
      //   - não comparar com um valor maior. Nada de "de R$ 180,00" riscado,
      //     percentual, ou "valor cheio". A tela mostra UM valor: o de hoje.
      //   - não usar: diária, garantia, escala, acordo, combinado, atraso,
      //     cumprir, ajuste, desconto, redução.
      //   - não tratar o motoboy nominalmente.
      //   - não mandar consultar tabela, regra ou aba nenhuma.
      //   - "bônus" e "valor" são os termos aprovados.
      //
      // A tela mostra um valor e nada mais. Sem carimbo de hora ela não sugere
      // que o horário causou coisa alguma — não há o que comparar, nem o que ela
      // pareça estar justificando.
      //
      // Sem disclaimer jurídico aqui de propósito. Se for preciso um, quem
      // escreve é o jurídico.
      //
      // O modal aparece SEMPRE no 1º ingresso do dia — nunca só quando o valor
      // é menor. Ver o comentário do gatilho (setGarantidoAviso) pra entender
      // por que isso importa mais que qualquer palavra daqui.
      // ══════════════════════════════════════════════════════════════════════
      garantidoAviso && e('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4', onClick: () => setGarantidoAviso(null) },
        e('div', { className: 'bg-white border border-gray-200 rounded-[16px] p-6 max-w-sm w-full', onClick: (ev) => ev.stopPropagation() },
          e('div', { className: 'text-center mb-4' },
            e('div', { className: 'mb-3 inline-flex text-purple-700' }, ico('heart', 22)),
            e('h2', { className: 'text-lg font-semibold text-gray-900 mb-1' }, 'Bônus de hoje')
          ),
          e('div', { className: 'bg-gray-50 rounded-[12px] p-4 mb-4' },
            e('p', { className: 'text-sm text-gray-700 leading-relaxed text-center' },
              'O valor do bônus varia conforme o horário de ingresso na fila.')
          ),
          e('div', { className: 'border border-gray-200 rounded-[12px] p-4 mb-4 text-center' },
            e('p', { style: { fontFamily: SORA, fontSize: 30, fontWeight: 700, color: '#111827', fontVariantNumeric: 'tabular-nums' } }, `R$ ${Number(garantidoAviso.valor || 0).toFixed(2).replace('.', ',')}`)
          ),
          e('button', { onClick: () => setGarantidoAviso(null), className: BTN_GRANDE + ' bg-purple-700 hover:bg-purple-800 text-white' }, 'Ok')
        )
      )
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
    const confirmaOk = textoConfirmSaida.trim().toUpperCase() === 'SAIR';

    return e('div', { className: 'space-y-3' },
      // Cartão com a posição
      e('div', { className: CARD + ' p-5' },
        e('div', { className: 'flex items-center justify-between' },
          e('p', { className: 'text-sm text-gray-500' }, 'Sua posição'),
          pill('ambar', 'Aguardando')
        ),
        e('div', { className: 'text-center py-3' },
          e('div', { style: { fontFamily: SORA, fontSize: 56, fontWeight: 700, color: '#111827', lineHeight: 1, fontVariantNumeric: 'tabular-nums' } },
            minhaPosicao.posicao, e('span', { style: { fontSize: 28 } }, 'º')
          ),
          e('p', { className: 'text-sm text-gray-500 mt-2 tabular-nums' },
            `aguardando há ${minutosDecorridos}min · de ${minhaPosicao.total_fila} na fila`
          )
        ),
        // Status do agente
        e('div', { className: 'flex justify-center pt-3 border-t border-gray-100' },
          agenteStatus === 'pendente' && pill('ambar', 'agente verificando...'),
          agenteStatus === 'validado' && pill('verde', 'validado pelo agente'),
          agenteStatus === 'reprovado' && pill('vermelho', 'agente detectou corrida ativa')
        )
      ),

      // Lista pública da fila
      e('div', { className: CARD + ' overflow-hidden' },
        e('div', { className: 'flex items-center justify-between px-4 py-3' },
          e('h2', { className: 'text-[15px] font-semibold text-gray-900' }, 'Fila completa'),
          e('span', { className: 'text-xs text-gray-500 tabular-nums' }, `${filaPublica.total} motoboy${filaPublica.total === 1 ? '' : 's'}`)
        ),
        (filaPublica.fila || []).map(p => {
          const ehVoce = String(p.cod_profissional) === String(usuarioCod);
          return e('div', {
            key: p.cod_profissional,
            className: 'flex items-center gap-3 px-4 py-2.5 border-t border-gray-100 ' + (ehVoce ? 'bg-purple-50' : '')
          },
            // Pos
            e('span', { style: { width: 20, textAlign: 'right', fontFamily: SORA, fontWeight: 700, fontSize: 14, color: ehVoce ? '#5d0b85' : '#6b7280', fontVariantNumeric: 'tabular-nums', flex: 'none' } }, p.posicao),
            // Avatar
            avatar(p.cod_profissional, p.nome_profissional, fotos[p.cod_profissional], 28),
            // Nome
            e('span', { className: 'flex-1 min-w-0 text-sm truncate ' + (ehVoce ? 'font-semibold text-purple-800' : 'text-gray-900') },
              ehVoce ? 'Você' : (p.nome_profissional || '—')
            ),
            // Tempo
            e('span', { className: 'text-xs text-gray-500 tabular-nums' }, tempoDecorrido(p.entrada_fila_at))
          );
        })
      ),

      // Info do agente
      e('div', { className: 'flex items-start gap-2 px-1' },
        ico('bot', 16, '#6b7280'),
        e('p', { className: 'text-xs text-gray-500 leading-snug' },
          e('span', { className: 'font-semibold text-gray-700' }, 'Agente monitorando. '),
          'Se você pegar uma corrida no sistema, o agente vai te tirar da fila automaticamente.'
        )
      ),

      // ── Tela fullscreen: barreira de horário ──────────────────
      barreiraHorario && e('div', {
        className: 'fixed inset-0 z-50 flex flex-col items-center justify-center p-6',
        style: { background: '#f9fafb' }
      },
        e('div', { className: 'max-w-sm w-full text-center space-y-5' },
          e('div', { className: 'inline-flex' }, pill('ambar', 'Acesso encerrado')),
          // Saudação
          e('h1', { style: { fontFamily: SORA, fontSize: 24, fontWeight: 700, color: '#111827' } },
            `Bom dia${barreiraHorario.nome ? ', ' + barreiraHorario.nome.split(' ')[0] : ''}!`
          ),
          // Mensagem principal
          e('div', { className: CARD + ' p-5 text-left' },
            e('p', { className: 'text-gray-900 text-base leading-relaxed' },
              'Você está acessando a fila muito tempo após o início da operação acordada. ',
              'Neste momento, todas as vagas estão preenchidas e ',
              e('strong', null, 'não será possível acessar.')
            ),
            e('p', { className: 'text-gray-500 text-sm mt-3 leading-relaxed' },
              'Entre em contato com o suporte para regularizar sua situação.'
            )
          ),
          // Horário de corte
          barreiraHorario.horario_corte && e('div', { className: 'text-gray-500 text-sm tabular-nums' },
            `Horário de ingresso encerrado após ${barreiraHorario.horario_corte}`
          ),
          // Botão fechar
          e('button', {
            onClick: () => setBarreiraHorario(null),
            className: BTN_GRANDE + ' bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }, 'Fechar')
        )
      ),

      // Modal confirmação de saída
      modalSaida && e('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4' },
        e('div', { className: 'bg-white border border-gray-200 rounded-[16px] w-full max-w-sm overflow-hidden' },
          e('div', { className: 'px-5 pt-5 pb-1 text-center' },
            e('div', { className: 'mb-2 inline-flex' }, pill('vermelho', 'Ação definitiva')),
            e('h2', { className: 'text-lg font-semibold text-gray-900' }, 'Sair da fila?'),
            e('p', { className: 'text-gray-500 text-xs mt-1' }, 'Esta ação não pode ser desfeita')
          ),
          e('div', { className: 'p-5 space-y-4' },
            // Aviso de punição
            e('div', { className: 'bg-red-50 rounded-[12px] p-4' },
              e('p', { className: 'text-sm font-semibold text-red-800 mb-1 text-center' }, 'Você será bloqueado'),
              e('p', { className: 'text-sm text-red-800 text-center leading-relaxed' },
                'Ao sair voluntariamente, você ',
                e('strong', null, 'não poderá reentrar na fila'),
                ' pelo período de punição configurado.'
              )
            ),
            // Campo de confirmação
            e('div', null,
              e('p', { className: 'text-sm text-gray-600 text-center mb-2' },
                'Para confirmar, digite ',
                e('strong', { className: 'text-red-800 font-mono tracking-widest' }, 'SAIR'),
                ' abaixo:'
              ),
              e('input', {
                type: 'text',
                value: textoConfirmSaida,
                onChange: ev => setTextoConfirmSaida(ev.target.value),
                onKeyDown: ev => { if (ev.key === 'Enter') confirmarSaida(); },
                placeholder: 'Digite SAIR',
                autoFocus: true,
                className: 'w-full h-12 text-center text-lg font-semibold tracking-widest border rounded-[12px] px-4 focus:outline-none focus:ring-2 ' +
                  (confirmaOk
                    ? 'border-red-600 bg-red-50 text-red-800 focus:ring-red-100'
                    : 'border-gray-200 text-gray-700 focus:border-purple-700 focus:ring-purple-100')
              })
            ),
            // Botões
            e('div', { className: 'flex gap-3' },
              e('button', {
                onClick: () => { setModalSaida(false); setTextoConfirmSaida(''); },
                className: BTN_GRANDE + ' flex-1 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm'
              }, 'Cancelar'),
              e('button', {
                onClick: confirmarSaida,
                disabled: !confirmaOk,
                className: BTN_GRANDE + ' flex-1 text-sm ' +
                  (confirmaOk
                    ? 'bg-white border border-red-200 text-red-800 hover:bg-red-50'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed')
              }, 'Confirmar saída')
            )
          )
        )
      ),

      // Botão sair
      e('button', {
        onClick: sairDaFila,
        className: BTN_GRANDE + ' bg-white border border-red-200 text-red-800 hover:bg-red-50 text-sm'
      }, 'Sair da fila')
    );
  }

  // ──────────────────────────────────────────────────────────
  // Tela: motoboy NA SALA DE ESPERA (pronto pra entrar)
  // ──────────────────────────────────────────────────────────
  function renderTelaEntrar(opts) {
    const { minhaCentral, distanciaCentral, gpsStatus, podeChekin, entrarNaFila, filaPublica } = opts;

    return e('div', { className: 'space-y-3' },
      // KPI compacto: quantos na fila agora + status pronto/não pronto
      e('div', { className: CARD + ' overflow-hidden' },
        e('div', { className: 'p-4' },
          e('p', { className: 'text-xs text-gray-500' }, 'Fila no momento'),
          e('p', { className: 'mt-0.5' },
            e('span', { style: { fontFamily: SORA, fontSize: 28, fontWeight: 700, color: '#111827', fontVariantNumeric: 'tabular-nums' } }, filaPublica.total || 0),
            e('span', { className: 'text-sm text-gray-500' }, ' motoboy', filaPublica.total === 1 ? '' : 's')
          )
        ),
        podeChekin
          ? e('div', { className: 'flex items-center gap-2 px-4 py-3 border-t border-gray-100' },
              pill('verde', 'GPS confirmado'),
              e('p', { className: 'text-xs text-gray-500' }, 'Pronto pra entrar na fila')
            )
          : e('div', { className: 'flex items-center gap-2 px-4 py-3 border-t border-gray-100' },
              pill('ambar', gpsStatus !== 'permitido' ? 'Aguardando GPS' : 'Você está muito longe'),
              e('p', { className: 'text-xs text-gray-500 tabular-nums' },
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
        className: BTN_GRANDE + ' ' + (podeChekin
          ? 'bg-purple-700 hover:bg-purple-800 text-white'
          : 'bg-gray-100 text-gray-400 cursor-not-allowed')
      }, ico('rocket', 18), 'Entrar na fila'),

      e('p', { className: 'text-center text-xs text-gray-500 leading-relaxed px-4' },
        'Ao entrar, o agente vai verificar no sistema se você não tem corridas ativas. Se tiver, te tira da fila automaticamente.'
      )
    );
  }

  // ──────────────────────────────────────────────────────────
  // Tela: motoboy EM ROTA (despachado pelo agente)
  // 🆕 2026-05-24: mesmo padrão visual da fila clássica
  // - Durante cooldown: aviso âmbar
  // - Após cooldown: mensagem + botão de retorno
  // ──────────────────────────────────────────────────────────
  function renderTelaEmRota(opts) {
    const { minhaPosicao, entrarNaFila, podeChekin } = opts;
    const cooldownAtivo = (minhaPosicao.cooldown_restante || 0) > 0;
    const minutosRestantes = minhaPosicao.cooldown_restante || 0;

    return e('div', { className: CARD + ' p-5' },
      // Cabeçalho
      e('div', { className: 'flex items-center justify-between gap-3 mb-1' },
        e('h2', { className: 'text-lg font-semibold text-gray-900' }, 'Você está em rota!'),
        pill('azul', 'Em rota')
      ),
      e('p', { className: 'text-sm text-gray-500 mb-4' },
        cooldownAtivo ? 'Aguarde para voltar à fila' : 'Pronto para voltar'
      ),

      // Bloco da mensagem (âmbar durante cooldown, neutro quando pode voltar)
      cooldownAtivo
        ? e('div', { className: 'bg-amber-50 rounded-[12px] p-4' },
            e('p', { className: 'text-sm text-amber-800 leading-relaxed' },
              'O agente detectou corridas ativas no seu nome. Você saiu da fila automaticamente. Finalize as entregas e poderá voltar em ',
              e('strong', { className: 'tabular-nums' }, `${minutosRestantes} ${minutosRestantes === 1 ? 'minuto' : 'minutos'}`),
              '.'
            )
          )
        : e(React.Fragment, null,
            e('div', { className: 'bg-gray-50 rounded-[12px] p-4 mb-4' },
              e('p', { className: 'text-sm text-gray-700 leading-relaxed' },
                'Se finalizou suas entregas, retorne para a fila quando estiver próximo da central.'
              )
            ),
            e('button', {
              onClick: entrarNaFila,
              disabled: !podeChekin,
              className: BTN_GRANDE + ' ' + (!podeChekin ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-purple-700 text-white hover:bg-purple-800'),
            }, ico('refresh', 18), 'Retornar para a fila')
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
      className: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50',
      onClick: onFechar,
    },
      e('div', {
        className: 'bg-white border border-gray-200 rounded-[16px] p-5 max-w-sm w-full',
        onClick: (ev) => ev.stopPropagation(),
      },
        e('div', { className: 'text-center mb-4' },
          e('div', { className: 'mb-3 inline-flex' }, pill('ambar', 'Aguarde')),
          e('h3', { className: 'text-lg font-semibold text-gray-900 mb-2' }, 'Calma aí!'),
          e('p', { className: 'text-sm text-gray-600 leading-relaxed' },
            'Você foi despachado há pouco. Finalize sua corrida e conseguirá entrar na fila novamente em ',
            e('strong', { className: 'text-gray-900 tabular-nums' },
              `${minutos_restantes} ${minutos_restantes === 1 ? 'minuto' : 'minutos'}`
            ),
            '.'
          )
        ),
        e('div', { className: 'bg-gray-50 rounded-[12px] p-3 mb-4' },
          e('p', { className: 'text-xs text-gray-600 leading-relaxed' },
            'Esse tempo serve pra você ter chance de finalizar a corrida e não furar a fila dos outros motoboys.'
          )
        ),
        e('button', {
          onClick: onFechar,
          className: BTN_GRANDE + ' bg-purple-700 hover:bg-purple-800 text-white',
        }, 'Entendi')
      )
    );
  }

  window.ModuloFilasAutoMotoboy = ModuloFilasAutoMotoboy;
  console.log('✅ ModuloFilasAutoMotoboy carregado');
})();
