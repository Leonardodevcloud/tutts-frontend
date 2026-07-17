// modulo-vagas.js — Painel ADMIN da trava de vagas (sub-aba das filas)
// Exposto como window.ModuloVagasAdmin. Sem JSX, sem Tabler/Lucide.
//
// A regra: a vaga é queimada no 1º ingresso do dia e NÃO volta quando o motoboy
// sai da fila. Só o botão "liberar vaga" devolve. Zera sozinha à meia-noite.
//
// Isto NÃO é um contador de quantos estão na fila agora — é um contador de
// quantos JÁ ENTRARAM HOJE. A coluna "Está agora" existe justamente pra mostrar
// a diferença, antes que alguém abra chamado perguntando por que o contador diz
// 12 se só tem 8 na fila.
(function () {
  const e = React.createElement;

  function hora(ts) {
    try { return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bahia' }); }
    catch (_) { return '--:--'; }
  }

  function ModuloVagasAdmin({ apiUrl, fetchAuth, showToast, central }) {
    const centralId = central && central.id;
    const [dados, setDados] = React.useState(null);
    const [limite, setLimite] = React.useState('');
    const [loading, setLoading] = React.useState(true);
    const [salvando, setSalvando] = React.useState(false);

    const carregar = React.useCallback(async () => {
      if (!centralId) return;
      try {
        const r = await fetchAuth(`${apiUrl}/filas/vagas/${centralId}`);
        if (!r.ok) return;
        const d = await r.json();
        setDados(d);
        setLimite(String(d.limite || 0));
      } catch (_) {} finally { setLoading(false); }
    }, [apiUrl, centralId]);

    React.useEffect(() => { carregar(); }, [carregar]);

    const salvarLimite = async () => {
      setSalvando(true);
      try {
        const r = await fetchAuth(`${apiUrl}/filas/vagas/${centralId}/limite`, {
          method: 'PUT', body: JSON.stringify({ vagas_limite: parseInt(limite, 10) || 0 }),
        });
        const d = await r.json();
        if (r.ok) { setDados((x) => ({ ...x, ...d })); showToast && showToast('Limite salvo', 'success'); }
        else showToast && showToast(d.erro || 'Erro', 'error');
      } catch (_) { showToast && showToast('Erro ao salvar', 'error'); }
      finally { setSalvando(false); }
    };

    const liberar = async (o) => {
      const nome = o.nome_profissional || 'Cód. ' + o.cod_profissional;
      if (!window.confirm(
        `Liberar a vaga de ${nome}?\n\n` +
        'O próximo motoboy vai poder entrar e ocupar. Se este voltar, ele pega a próxima vaga livre — ou fica de fora, se não tiver.\n\n' +
        'Isso fica registrado na auditoria.'
      )) return;
      try {
        const r = await fetchAuth(`${apiUrl}/filas/vagas/${o.id}/liberar`, { method: 'POST' });
        const d = await r.json();
        if (r.ok) { carregar(); showToast && showToast('Vaga liberada', 'success'); }
        else showToast && showToast(d.erro || 'Erro', 'error');
      } catch (_) { showToast && showToast('Erro ao liberar', 'error'); }
    };

    if (loading) return e('div', { className: 'text-center py-10 text-gray-400 text-sm' }, 'Carregando vagas...');
    if (!dados) return e('div', { className: 'text-center py-10 text-gray-400 text-sm' }, 'Selecione uma central.');

    const temTrava = (dados.limite || 0) > 0;
    const pct = temTrava ? Math.min(100, Math.round((dados.ocupadas / dados.limite) * 100)) : 0;
    const ativos = (dados.ocupantes || []).filter((o) => !o.liberada_em);
    const liberados = (dados.ocupantes || []).filter((o) => o.liberada_em);

    return e('div', { className: 'space-y-4' },

      // ── CONFIG + CONTADOR ──
      e('div', { className: 'bg-white border border-gray-200 rounded-xl p-4' },
        e('div', { className: 'flex items-center gap-2 pb-3 border-b border-gray-100' },
          e('span', { className: 'text-xl' }, '🔒'),
          e('div', null,
            e('div', { className: 'font-bold text-gray-800' }, 'Trava de vagas'),
            e('div', { className: 'text-xs text-gray-500' }, central.nome))
        ),

        e('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4' },
          e('div', null,
            e('label', { className: 'block text-xs text-gray-500 mb-1' }, 'Limite de vagas por dia'),
            e('div', { className: 'flex items-center gap-2' },
              e('input', {
                type: 'number', min: 0, max: 999, value: limite,
                onChange: (ev) => setLimite(ev.target.value),
                className: 'w-24 px-3 py-2 border rounded-lg text-lg font-bold'
              }),
              e('button', {
                onClick: salvarLimite, disabled: salvando,
                className: 'px-3 py-2 rounded-lg text-white text-sm font-semibold bg-purple-600 hover:bg-purple-700 disabled:opacity-50'
              }, salvando ? '...' : 'Salvar')),
            e('div', { className: 'text-[11px] text-gray-400 mt-1' }, '0 = sem trava.')
          ),

          temTrava && e('div', null,
            e('div', { className: 'text-[10px] uppercase tracking-wide text-gray-400 mb-1' }, 'Hoje'),
            e('div', { className: 'flex items-baseline gap-1.5' },
              e('span', { className: 'text-3xl font-bold ' + (dados.estourado ? 'text-red-600' : 'text-gray-900') }, dados.ocupadas),
              e('span', { className: 'text-gray-400 text-sm' }, 'de'),
              e('span', { className: 'text-3xl font-bold text-gray-400' }, dados.limite),
              e('span', { className: 'text-xs text-gray-400 ml-1' }, 'ocupadas')),
            e('div', { className: 'h-2 bg-gray-100 rounded-full overflow-hidden mt-2 max-w-xs' },
              e('div', { className: 'h-full rounded-full ' + (dados.estourado ? 'bg-red-500' : 'bg-purple-600'), style: { width: pct + '%' } })),
            e('div', { className: 'text-[11px] mt-1 ' + (dados.estourado ? 'text-red-600 font-medium' : 'text-green-600') },
              dados.estourado
                ? 'Estourou o limite — tem escalado da diária furando a trava.'
                : (dados.livres + (dados.livres === 1 ? ' vaga livre' : ' vagas livres')))
          )
        ),

        !temTrava && e('div', { className: 'mt-3 bg-gray-50 rounded-lg p-3 text-xs text-gray-500 leading-relaxed' },
          'Sem trava: qualquer quantidade de motoboys entra nesta fila. Defina um limite acima pra travar.'
        ),

        temTrava && e('div', { className: 'mt-3 bg-purple-50 rounded-lg p-3 text-xs text-purple-800 leading-relaxed' },
          e('strong', null, 'A vaga é queimada no 1º ingresso do dia e não volta quando o motoboy sai. '),
          'Ele entrou, ele é um dos ', String(dados.limite), ' — pegou corrida, voltou, saiu pra almoçar, tanto faz. ',
          'Só o botão "liberar" devolve. Zera sozinha à meia-noite.',
          e('br'), e('br'),
          e('strong', null, 'Quem está na escala da Diária entra sempre'), ', mesmo com as vagas esgotadas — ',
          'você não paga diária pra alguém ficar de fora. Ele ocupa vaga, só não é barrado por ela. ',
          'É por isso que a conta pode passar do limite.',
          e('br'), e('br'),
          e('strong', null, 'Baixar o limite não expulsa ninguém'), ' — vale pro próximo.'
        )
      ),

      // ── OCUPANTES ──
      temTrava && e('div', { className: 'bg-white border border-gray-200 rounded-xl p-4' },
        e('div', { className: 'font-bold text-gray-800 text-sm mb-1' }, 'Quem ocupa as vagas hoje'),
        e('div', { className: 'text-xs text-gray-500 mb-3' }, 'Ordenado pela hora de entrada.'),

        ativos.length === 0
          ? e('div', { className: 'text-center py-6 text-gray-400 text-xs' }, 'Ninguém entrou hoje ainda.')
          : e('div', { className: 'border border-gray-100 rounded-lg overflow-hidden' },
              ativos.map((o, i) => {
                const naFila = !!o.status_fila;
                return e('div', {
                  key: o.id,
                  className: 'flex items-center justify-between px-3 py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50'
                },
                  e('div', { className: 'flex items-center gap-2 min-w-0' },
                    e('span', { className: 'text-[11px] text-gray-300 font-mono w-5 flex-shrink-0' }, i + 1),
                    e('div', { className: 'min-w-0' },
                      e('div', { className: 'text-sm font-medium text-gray-800 truncate flex items-center gap-1.5' },
                        o.nome_profissional || 'Cód. ' + o.cod_profissional,
                        o.na_escala && e('span', { className: 'text-[9px] font-bold uppercase px-1.5 py-[1px] rounded bg-purple-50 text-purple-700 border border-purple-200 flex-shrink-0' }, 'diária'),
                        o.furou_trava && e('span', { className: 'text-[9px] font-bold uppercase px-1.5 py-[1px] rounded bg-amber-50 text-amber-700 border border-amber-200 flex-shrink-0' }, 'furou')),
                      e('div', { className: 'text-[11px] text-gray-400' },
                        'entrou ' + hora(o.ocupada_em),
                        ' · ',
                        // Esta é a coluna que responde "por que o contador diz 12
                        // se só tem 8 na fila?" antes de virar chamado.
                        naFila
                          ? e('span', { className: 'text-gray-500' }, o.status_fila === 'em_rota' ? 'em rota' : 'na fila (pos. ' + o.posicao + ')')
                          : e('span', { className: 'text-amber-600 font-medium' }, '⚠️ saiu da fila — vaga continua ocupada')
                      ))
                  ),
                  e('button', {
                    onClick: () => liberar(o),
                    className: 'text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 flex-shrink-0'
                  }, 'Liberar vaga')
                );
              })
            ),

        liberados.length > 0 && e('div', { className: 'mt-3' },
          e('div', { className: 'text-[11px] text-gray-400 mb-1' }, 'Liberadas hoje (' + liberados.length + ')'),
          e('div', { className: 'border border-gray-100 rounded-lg overflow-hidden opacity-60' },
            liberados.map((o) => e('div', {
              key: o.id,
              className: 'flex items-center justify-between px-3 py-1.5 border-b border-gray-50 last:border-0'
            },
              e('div', { className: 'text-xs text-gray-600 truncate' }, o.nome_profissional || 'Cód. ' + o.cod_profissional),
              e('div', { className: 'text-[10px] text-gray-400 flex-shrink-0' },
                'liberada ' + hora(o.liberada_em) + (o.liberada_por_nome ? ' por ' + o.liberada_por_nome : ''))
            ))
          )
        )
      )
    );
  }

  window.ModuloVagasAdmin = ModuloVagasAdmin;
})();
