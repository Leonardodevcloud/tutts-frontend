// modulo-diaria.js — Painel ADMIN da Diária (sub-aba das filas)
// Auto-contido: config por central (o PADRÃO) + escala (as EXCEÇÕES) + registros do dia.
// Exposto como window.ModuloDiariaAdmin. Sem JSX, sem Tabler/Lucide (emojis/SVG inline).
// Tema roxo #7c3aed, consistente com o modulo-garantido.js — do qual isto é irmão.
//
// A Diária é o Garantido com UMA diferença: o horário pode ser individual.
//   PADRÃO da central -> vale pra TODO MUNDO que entrar na fila
//   ESCALA            -> só as exceções (João 08-17 R$150)
//
// NOTA sobre o formato da resposta: as rotas da diária devolvem o objeto direto
// e usam o status HTTP pra dizer se deu certo (400/404/500 + {erro}), enquanto o
// garantido devolve {success, config, especiais}. Por isso aqui a checagem é
// `r.ok` e não `d.success`. É de propósito: r.ok não mente. Um dia em que a rota
// devolver 500 com HTML de erro, `d.success` seria undefined e a tela ficaria
// vazia calada; r.ok já sabe.
(function () {
  const e = React.createElement;

  function brl(v) {
    const n = Number(v) || 0;
    return 'R$ ' + n.toFixed(2).replace('.', ',');
  }
  function parseValor(str) {
    if (typeof str === 'number') return str;
    const n = parseFloat(String(str || '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }
  function hhmm(t) { return String(t || '').slice(0, 5); }
  function horaIngresso(ts) {
    try { return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bahia' }); }
    catch (_) { return '--:--'; }
  }
  function fracClass(frac) {
    if (frac >= 1) return 'bg-green-100 text-green-700';
    if (frac <= 0) return 'bg-red-100 text-red-700';
    return 'bg-amber-100 text-amber-700';
  }

  function ModuloDiariaAdmin({ apiUrl, fetchAuth, showToast, central }) {
    const centralId = central && central.id;
    const [cfg, setCfg] = React.useState(null);
    const [escala, setEscala] = React.useState([]);
    const [registros, setRegistros] = React.useState([]);
    const [total, setTotal] = React.useState(0);
    const [data, setData] = React.useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bahia' }));
    const [vinculados, setVinculados] = React.useState([]);
    const [novoCod, setNovoCod] = React.useState('');
    const [novoIni, setNovoIni] = React.useState('08:00');
    const [novoFim, setNovoFim] = React.useState('17:00');
    const [novoValor, setNovoValor] = React.useState('');
    const [salvando, setSalvando] = React.useState(false);
    const [loading, setLoading] = React.useState(true);

    const carregarConfig = React.useCallback(async () => {
      if (!centralId) return;
      try {
        const r = await fetchAuth(`${apiUrl}/diaria/config/${centralId}`);
        if (!r.ok) return;
        const d = await r.json();
        setCfg(d);
        setEscala(d.escala || []);
      } catch (_) {} finally { setLoading(false); }
    }, [apiUrl, centralId]);

    const carregarRegistros = React.useCallback(async (dt) => {
      if (!centralId) return;
      try {
        const r = await fetchAuth(`${apiUrl}/diaria/registros/${centralId}?data=${dt || data}`);
        if (!r.ok) return;
        const d = await r.json();
        setRegistros(d.registros || []);
        setTotal(d.total_do_dia || 0);
      } catch (_) {}
    }, [apiUrl, centralId, data]);

    const carregarVinculados = React.useCallback(async () => {
      if (!centralId) return;
      try {
        const r = await fetchAuth(`${apiUrl}/filas/centrais/${centralId}/vinculos`);
        if (!r.ok) return;
        const d = await r.json();
        // {success, vinculos} — mesma forma que o modulo-garantido.js le.
        setVinculados(d.vinculos || []);
      } catch (_) {}
    }, [apiUrl, centralId]);

    React.useEffect(() => { carregarConfig(); carregarVinculados(); }, [carregarConfig, carregarVinculados]);
    React.useEffect(() => { carregarRegistros(data); }, [data, carregarRegistros]);

    const salvarConfig = async (patch) => {
      if (!cfg) return;
      setSalvando(true);
      try {
        const corpo = {
          diaria_ativa: cfg.diaria_ativa,
          diaria_valor_padrao: cfg.diaria_valor_padrao,
          diaria_hora_inicio: cfg.diaria_hora_inicio,
          diaria_hora_fim: cfg.diaria_hora_fim,
          diaria_hora_tolerancia: cfg.diaria_hora_tolerancia,
          ...patch,
        };
        const r = await fetchAuth(`${apiUrl}/diaria/config/${centralId}`, {
          method: 'PUT', body: JSON.stringify(corpo),
        });
        const d = await r.json();
        if (r.ok) {
          setCfg((c) => ({ ...c, ...corpo, garantido_ativo: d.desligou_garantido ? false : c.garantido_ativo }));
          if (d.desligou_garantido && cfg.garantido_ativo) {
            // Ele PRECISA saber que a outra aba mudou. Desligar o Garantido
            // calado e deixar o admin descobrir depois é como se perde a
            // confiança na tela inteira.
            showToast && showToast('Diária ligada — o Garantido foi desligado (é uma ou outra)', 'success');
          } else {
            showToast && showToast('Salvo', 'success');
          }
        } else {
          showToast && showToast(d.erro || 'Erro ao salvar', 'error');
          carregarConfig();
        }
      } catch (_) { showToast && showToast('Erro ao salvar', 'error'); }
      finally { setSalvando(false); }
    };

    const salvarEscala = async () => {
      if (!novoCod) { showToast && showToast('Informe o código do motoboy', 'error'); return; }
      if (novoFim <= novoIni) { showToast && showToast('A hora de fim tem que ser depois da de início', 'error'); return; }
      const v = vinculados.find((x) => String(x.cod_profissional) === String(novoCod).trim());
      try {
        const r = await fetchAuth(`${apiUrl}/diaria/escala`, {
          method: 'POST',
          body: JSON.stringify({
            central_id: centralId,
            cod_profissional: String(novoCod).trim(),
            nome_profissional: v ? v.nome_profissional : null,
            hora_inicio: novoIni,
            hora_fim: novoFim,
            // vazio = null = usa o padrão da central. Não é o mesmo que zero.
            valor: novoValor === '' ? null : parseValor(novoValor),
          }),
        });
        const d = await r.json();
        if (r.ok) {
          setNovoCod(''); setNovoValor('');
          carregarConfig();
          showToast && showToast('Escalado', 'success');
        } else showToast && showToast(d.erro || 'Erro', 'error');
      } catch (_) { showToast && showToast('Erro ao salvar', 'error'); }
    };

    const removerEscala = async (id) => {
      try {
        const r = await fetchAuth(`${apiUrl}/diaria/escala/${id}`, { method: 'DELETE' });
        if (r.ok) {
          setEscala(escala.filter((x) => x.id !== id));
          showToast && showToast('Removido da escala — volta pro horário padrão', 'success');
        }
      } catch (_) {}
    };

    if (loading) return e('div', { className: 'text-center py-10 text-gray-400 text-sm' }, 'Carregando diária...');
    if (!cfg) return e('div', { className: 'text-center py-10 text-gray-400 text-sm' }, 'Selecione uma central.');

    return e('div', { className: 'space-y-4' },

      // ── CONFIG (o PADRÃO) ──
      e('div', { className: 'bg-white border border-gray-200 rounded-xl p-4' },
        e('div', { className: 'flex items-center justify-between pb-3 border-b border-gray-100' },
          e('div', { className: 'flex items-center gap-2' }, e('span', { className: 'text-xl' }, '📅'), e('div', null,
            e('div', { className: 'font-bold text-gray-800' }, 'Diária'),
            e('div', { className: 'text-xs text-gray-500' }, cfg.central_nome))),
          e('button', {
            onClick: () => salvarConfig({ diaria_ativa: !cfg.diaria_ativa }),
            disabled: salvando,
            className: `relative w-12 h-7 rounded-full transition-colors ${cfg.diaria_ativa ? 'bg-purple-600' : 'bg-gray-300'}`
          }, e('span', { className: `absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${cfg.diaria_ativa ? 'right-1' : 'left-1'}` }))
        ),

        // Aviso do XOR — antes de clicar, não depois.
        (cfg.garantido_ativo && !cfg.diaria_ativa) && e('div', { className: 'mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 leading-relaxed' },
          e('strong', null, '⚠️ O Garantido está ligado nesta central. '),
          'Ligar a Diária vai desligá-lo automaticamente — uma central é ou uma ou outra, nunca as duas.'
        ),

        e('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4' },
          e('div', null, e('label', { className: 'block text-xs text-gray-500 mb-1' }, 'Valor padrão'),
            e('input', {
              type: 'text', defaultValue: brl(cfg.diaria_valor_padrao), key: 'v' + cfg.diaria_valor_padrao,
              onBlur: (ev) => salvarConfig({ diaria_valor_padrao: parseValor(ev.target.value) }),
              className: 'w-full px-3 py-2 border rounded-lg'
            })),
          e('div', null, e('label', { className: 'block text-xs text-gray-500 mb-1' }, 'Entrada padrão'),
            e('input', {
              type: 'time', defaultValue: hhmm(cfg.diaria_hora_inicio), key: 'i' + cfg.diaria_hora_inicio,
              onBlur: (ev) => salvarConfig({ diaria_hora_inicio: ev.target.value }),
              className: 'w-full px-3 py-2 border rounded-lg'
            })),
          e('div', null, e('label', { className: 'block text-xs text-gray-500 mb-1' }, 'Saída padrão'),
            e('input', {
              type: 'time', defaultValue: hhmm(cfg.diaria_hora_fim), key: 'f' + cfg.diaria_hora_fim,
              onBlur: (ev) => salvarConfig({ diaria_hora_fim: ev.target.value }),
              className: 'w-full px-3 py-2 border rounded-lg'
            }))
        ),

        e('div', { className: 'mt-3' },
          e('label', { className: 'block text-xs text-gray-500 mb-1' }, 'Tolerância de atraso — minutos de folga sobre o horário de cada um (opcional)'),
          e('div', { className: 'flex items-center gap-2' },
            e('input', {
              type: 'time', defaultValue: hhmm(cfg.diaria_hora_tolerancia) || '', key: cfg.diaria_hora_tolerancia || 'none',
              onBlur: (ev) => salvarConfig({ diaria_hora_tolerancia: ev.target.value }),
              className: 'px-3 py-2 border rounded-lg'
            }),
            (cfg.diaria_hora_tolerancia
              ? e('button', { onClick: () => salvarConfig({ diaria_hora_tolerancia: '' }), className: 'text-xs text-gray-500 underline' }, 'remover tolerância')
              : e('span', { className: 'text-xs text-gray-400' }, 'sem tolerância: desconta a partir do horário dele'))
          ),
          // Aqui a Diária DIVERGE do Garantido, e o admin precisa saber, senão
          // ele lê '00:15' como "quinze da manhã" e configura errado.
          e('div', { className: 'text-[11px] text-gray-400 mt-1' },
            'Diferente do Garantido: aqui o campo é ',
            e('strong', null, 'duração'), ', não horário. ',
            e('code', { className: 'bg-gray-100 px-1 rounded' }, '00:15'),
            ' = 15 minutos de folga depois do horário de entrada de cada motoboy.'
          )
        ),

        e('div', { className: 'mt-3 bg-purple-50 rounded-lg p-3 text-xs text-purple-800 leading-relaxed' },
          e('strong', null, 'Como funciona: '),
          'com a diária ligada, ', e('strong', null, 'todo mundo que entrar na fila recebe'),
          ' — usando a entrada/saída/valor padrão acima. A escala abaixo é só pra quem foge desse padrão.',
          e('br'), e('br'),
          'O desconto por atraso é o ', e('strong', null, 'mesmo cálculo do Garantido'),
          ', só que medido contra o horário de cada um. Quem entra depois da saída não recebe nada; quem entra no meio recebe proporcional.'
        )
      ),

      // ── ESCALA (as EXCEÇÕES) ──
      e('div', { className: 'bg-white border border-gray-200 rounded-xl p-4' },
        e('div', { className: 'flex items-center justify-between mb-1' },
          e('div', { className: 'font-bold text-gray-800 text-sm' }, 'Escala — só as exceções'),
          e('span', { className: 'text-xs text-gray-400' }, escala.length + (escala.length === 1 ? ' motoboy' : ' motoboys'))
        ),
        e('div', { className: 'text-xs text-gray-500 mb-3' },
          'Permanente: vale todo dia até você mudar. Quem não está aqui usa o padrão (',
          hhmm(cfg.diaria_hora_inicio), '–', hhmm(cfg.diaria_hora_fim), ', ', brl(cfg.diaria_valor_padrao), ').'
        ),

        // Form
        e('div', { className: 'grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3' },
          e('div', { className: 'col-span-2 sm:col-span-1' },
            e('label', { className: 'block text-[10px] text-gray-400 mb-1' }, 'Código'),
            e('input', {
              type: 'text', value: novoCod, onChange: (ev) => setNovoCod(ev.target.value),
              list: 'diaria-vinculados', placeholder: 'cod',
              className: 'w-full px-2 py-2 border rounded-lg text-sm'
            }),
            e('datalist', { id: 'diaria-vinculados' },
              vinculados.map((v) => e('option', { key: v.cod_profissional, value: v.cod_profissional }, v.nome_profissional))
            )
          ),
          e('div', null,
            e('label', { className: 'block text-[10px] text-gray-400 mb-1' }, 'Entrada'),
            e('input', { type: 'time', value: novoIni, onChange: (ev) => setNovoIni(ev.target.value), className: 'w-full px-2 py-2 border rounded-lg text-sm' })),
          e('div', null,
            e('label', { className: 'block text-[10px] text-gray-400 mb-1' }, 'Saída'),
            e('input', { type: 'time', value: novoFim, onChange: (ev) => setNovoFim(ev.target.value), className: 'w-full px-2 py-2 border rounded-lg text-sm' })),
          e('div', null,
            e('label', { className: 'block text-[10px] text-gray-400 mb-1' }, 'Valor'),
            e('input', {
              type: 'text', value: novoValor, onChange: (ev) => setNovoValor(ev.target.value),
              placeholder: 'padrão',
              className: 'w-full px-2 py-2 border rounded-lg text-sm'
            })),
          e('div', { className: 'flex items-end' },
            e('button', {
              onClick: salvarEscala,
              className: 'w-full px-3 py-2 rounded-lg text-white text-sm font-semibold bg-purple-600 hover:bg-purple-700'
            }, 'Escalar'))
        ),

        escala.length === 0
          ? e('div', { className: 'text-center py-6 text-gray-400 text-xs' }, 'Ninguém na escala — todo mundo usa o padrão da central.')
          : e('div', { className: 'border border-gray-100 rounded-lg overflow-hidden' },
              escala.map((x) => e('div', {
                key: x.id,
                className: 'flex items-center justify-between px-3 py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50'
              },
                e('div', { className: 'min-w-0' },
                  e('div', { className: 'text-sm font-medium text-gray-800 truncate' }, x.nome_profissional || 'Cód. ' + x.cod_profissional),
                  e('div', { className: 'text-[11px] text-gray-400 font-mono' }, x.cod_profissional)),
                e('div', { className: 'flex items-center gap-3 flex-shrink-0' },
                  e('span', { className: 'text-xs text-gray-600 font-mono' }, hhmm(x.hora_inicio) + '–' + hhmm(x.hora_fim)),
                  e('span', { className: 'text-sm font-semibold ' + (x.valor === null ? 'text-gray-400' : 'text-gray-800') },
                    x.valor === null ? 'padrão' : brl(x.valor)),
                  e('button', { onClick: () => removerEscala(x.id), className: 'text-xs text-red-500 hover:underline' }, 'remover'))
              ))
            )
      ),

      // ── REGISTROS ──
      e('div', { className: 'bg-white border border-gray-200 rounded-xl p-4' },
        e('div', { className: 'flex items-center justify-between mb-1' },
          e('div', { className: 'font-bold text-gray-800 text-sm' }, 'Registros do dia'),
          e('div', { className: 'flex items-center gap-2' },
            e('input', {
              type: 'date', value: data, onChange: (ev) => setData(ev.target.value),
              className: 'px-2 py-1 border rounded-lg text-xs'
            }),
            e('span', { className: 'text-sm font-bold text-purple-700' }, brl(total)))
        ),
        e('div', { className: 'text-xs text-gray-500 mb-3' }, 'O valor trava no 1º ingresso. Sair e voltar não recalcula.'),

        registros.length === 0
          ? e('div', { className: 'text-center py-6 text-gray-400 text-xs' }, 'Nenhum registro nesta data.')
          : e('div', { className: 'border border-gray-100 rounded-lg overflow-hidden' },
              registros.map((r) => e('div', {
                key: r.id,
                className: 'flex items-center justify-between px-3 py-2 border-b border-gray-50 last:border-0'
              },
                e('div', { className: 'min-w-0' },
                  e('div', { className: 'text-sm font-medium text-gray-800 truncate flex items-center gap-1.5' },
                    r.nome_profissional || 'Cód. ' + r.cod_profissional,
                    r.da_escala && e('span', { className: 'text-[9px] font-bold uppercase px-1.5 py-[1px] rounded bg-purple-50 text-purple-700 border border-purple-200' }, 'escala')),
                  e('div', { className: 'text-[11px] text-gray-400' },
                    'entrou ' + horaIngresso(r.hora_ingresso) + ' · escala ' + hhmm(r.hora_inicio) + '–' + hhmm(r.hora_fim))),
                e('div', { className: 'flex items-center gap-2 flex-shrink-0' },
                  r.minutos_atraso > 0 && e('span', { className: 'text-[11px] text-red-500' }, r.minutos_atraso + ' min'),
                  e('span', { className: `text-[10px] px-1.5 py-0.5 rounded ${fracClass(r.fracao)}` }, Math.round(r.fracao * 100) + '%'),
                  e('div', { className: 'text-right' },
                    e('div', { className: 'text-sm font-bold text-gray-800' }, brl(r.valor_diaria)),
                    r.valor_diaria < r.valor_base && e('div', { className: 'text-[10px] text-gray-400' }, 'de ' + brl(r.valor_base))))
              ))
            )
      )
    );
  }

  window.ModuloDiariaAdmin = ModuloDiariaAdmin;
})();
