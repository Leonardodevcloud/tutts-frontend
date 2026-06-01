// modulo-garantido.js — Painel ADMIN do Garantido (sub-aba das filas)
// Auto-contido: config por central + valores especiais + registros do dia.
// Exposto como window.ModuloGarantidoAdmin. Sem JSX, sem Tabler/Lucide (emojis/SVG inline).
// Tema roxo #7c3aed, consistente com o restante das filas.
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

  function ModuloGarantidoAdmin({ apiUrl, fetchAuth, showToast, central }) {
    const centralId = central && central.id;
    const [cfg, setCfg] = React.useState(null);
    const [especiais, setEspeciais] = React.useState([]);
    const [registros, setRegistros] = React.useState([]);
    const [total, setTotal] = React.useState(0);
    const [data, setData] = React.useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bahia' }));
    const [vinculados, setVinculados] = React.useState([]);
    const [novoCod, setNovoCod] = React.useState('');
    const [novoValor, setNovoValor] = React.useState('');
    const [salvando, setSalvando] = React.useState(false);
    const [loading, setLoading] = React.useState(true);

    const carregarConfig = React.useCallback(async () => {
      if (!centralId) return;
      try {
        const r = await fetchAuth(`${apiUrl}/garantido/config/${centralId}`);
        const d = await r.json();
        if (d.success) { setCfg(d.config); setEspeciais(d.especiais || []); }
      } catch (_) {} finally { setLoading(false); }
    }, [apiUrl, centralId]);

    const carregarRegistros = React.useCallback(async (dt) => {
      if (!centralId) return;
      try {
        const r = await fetchAuth(`${apiUrl}/garantido/registros/${centralId}?data=${dt || data}`);
        const d = await r.json();
        if (d.success) { setRegistros(d.registros || []); setTotal(d.total || 0); }
      } catch (_) {}
    }, [apiUrl, centralId, data]);

    const carregarVinculados = React.useCallback(async () => {
      if (!centralId) return;
      try {
        const r = await fetchAuth(`${apiUrl}/filas/centrais/${centralId}/vinculos`);
        const d = await r.json();
        if (d.success) setVinculados(d.vinculos || []);
      } catch (_) {}
    }, [apiUrl, centralId]);

    React.useEffect(() => { setLoading(true); carregarConfig(); carregarRegistros(); carregarVinculados(); }, [centralId]);

    const salvarConfig = async (patch) => {
      const novo = { ...cfg, ...patch };
      setCfg(novo);
      try {
        setSalvando(true);
        const r = await fetchAuth(`${apiUrl}/garantido/config/${centralId}`, {
          method: 'PUT',
          body: JSON.stringify({
            garantido_ativo: novo.garantido_ativo,
            garantido_valor_padrao: parseValor(novo.garantido_valor_padrao),
            garantido_hora_inicio: novo.garantido_hora_inicio,
            garantido_hora_fim: novo.garantido_hora_fim,
          }),
        });
        const d = await r.json();
        if (d.success) { showToast && showToast('Garantido atualizado', 'success'); carregarRegistros(); }
        else showToast && showToast(d.error || 'Erro', 'error');
      } catch (_) { showToast && showToast('Erro ao salvar', 'error'); }
      finally { setSalvando(false); }
    };

    const addEspecial = async () => {
      if (!novoCod || !novoValor) { showToast && showToast('Escolha o motoboy e o valor', 'error'); return; }
      const v = vinculados.find(x => x.cod_profissional === novoCod);
      try {
        const r = await fetchAuth(`${apiUrl}/garantido/especiais`, {
          method: 'POST',
          body: JSON.stringify({
            central_id: centralId, cod_profissional: novoCod,
            nome_profissional: v ? v.nome_profissional : null, valor: parseValor(novoValor),
          }),
        });
        const d = await r.json();
        if (d.success) { setNovoCod(''); setNovoValor(''); carregarConfig(); showToast && showToast('Valor especial salvo', 'success'); }
        else showToast && showToast(d.error || 'Erro', 'error');
      } catch (_) { showToast && showToast('Erro ao salvar', 'error'); }
    };

    const removerEspecial = async (id) => {
      try {
        const r = await fetchAuth(`${apiUrl}/garantido/especiais/${id}`, { method: 'DELETE' });
        const d = await r.json();
        if (d.success) { setEspeciais(especiais.filter(x => x.id !== id)); }
      } catch (_) {}
    };

    if (loading) return e('div', { className: 'text-center py-10 text-gray-400 text-sm' }, 'Carregando garantido...');
    if (!cfg) return e('div', { className: 'text-center py-10 text-gray-400 text-sm' }, 'Selecione uma central.');

    return e('div', { className: 'space-y-4' },
      // ── CONFIG ──
      e('div', { className: 'bg-white border border-gray-200 rounded-xl p-4' },
        e('div', { className: 'flex items-center justify-between pb-3 border-b border-gray-100' },
          e('div', { className: 'flex items-center gap-2' }, e('span', { className: 'text-xl' }, '🛡️'), e('div', null,
            e('div', { className: 'font-bold text-gray-800' }, 'Garantido'),
            e('div', { className: 'text-xs text-gray-500' }, cfg.central_nome))),
          e('button', {
            onClick: () => salvarConfig({ garantido_ativo: !cfg.garantido_ativo }),
            disabled: salvando,
            className: `relative w-12 h-7 rounded-full transition-colors ${cfg.garantido_ativo ? 'bg-purple-600' : 'bg-gray-300'}`
          }, e('span', { className: `absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${cfg.garantido_ativo ? 'right-1' : 'left-1'}` }))
        ),
        e('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4' },
          e('div', null, e('label', { className: 'block text-xs text-gray-500 mb-1' }, 'Valor padrão da diária'),
            e('input', { type: 'text', defaultValue: brl(cfg.garantido_valor_padrao), onBlur: (ev) => salvarConfig({ garantido_valor_padrao: parseValor(ev.target.value) }), className: 'w-full px-3 py-2 border rounded-lg' })),
          e('div', null, e('label', { className: 'block text-xs text-gray-500 mb-1' }, 'Início da operação'),
            e('input', { type: 'time', defaultValue: cfg.garantido_hora_inicio, onBlur: (ev) => salvarConfig({ garantido_hora_inicio: ev.target.value }), className: 'w-full px-3 py-2 border rounded-lg' })),
          e('div', null, e('label', { className: 'block text-xs text-gray-500 mb-1' }, 'Fim da operação'),
            e('input', { type: 'time', defaultValue: cfg.garantido_hora_fim, onBlur: (ev) => salvarConfig({ garantido_hora_fim: ev.target.value }), className: 'w-full px-3 py-2 border rounded-lg' }))
        ),
        e('div', { className: 'mt-3 bg-amber-50 rounded-lg p-3 text-xs text-amber-700 leading-relaxed' },
          'Quem ingressar depois do início tem a garantia reduzida proporcionalmente; após o fim, fica zero. A regra vale para todos — o que muda por motoboy é só o valor base.')
      ),

      // ── VALORES ESPECIAIS ──
      e('div', { className: 'bg-white border border-gray-200 rounded-xl p-4' },
        e('div', { className: 'font-bold text-gray-800 mb-3' }, 'Valores especiais por motoboy'),
        e('div', { className: 'flex flex-wrap gap-2 mb-3' },
          e('select', { value: novoCod, onChange: (ev) => setNovoCod(ev.target.value), className: 'flex-1 min-w-[160px] px-3 py-2 border rounded-lg text-sm' },
            e('option', { value: '' }, 'Selecione o motoboy...'),
            vinculados.map(v => e('option', { key: v.cod_profissional, value: v.cod_profissional }, `${v.nome_profissional} (#${v.cod_profissional})`))),
          e('input', { type: 'text', placeholder: 'R$ 0,00', value: novoValor, onChange: (ev) => setNovoValor(ev.target.value), className: 'w-32 px-3 py-2 border rounded-lg text-sm' }),
          e('button', { onClick: addEspecial, className: 'px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium' }, '➕ Adicionar')
        ),
        especiais.length === 0
          ? e('div', { className: 'text-sm text-gray-400 italic' }, `Nenhum valor especial. Todos usam o padrão (${brl(cfg.garantido_valor_padrao)}).`)
          : e('div', { className: 'divide-y' }, especiais.map(x => e('div', { key: x.id, className: 'flex items-center justify-between py-2' },
              e('div', null, e('div', { className: 'text-sm font-medium' }, x.nome_profissional || x.cod_profissional), e('div', { className: 'text-xs text-gray-400 font-mono' }, `#${x.cod_profissional}`)),
              e('div', { className: 'flex items-center gap-3' }, e('span', { className: 'text-sm font-semibold' }, brl(x.valor)),
                e('button', { onClick: () => removerEspecial(x.id), className: 'text-red-500 hover:text-red-700 text-lg' }, '🗑️')))))
      ),

      // ── REGISTROS DO DIA ──
      e('div', { className: 'bg-white border border-gray-200 rounded-xl p-4' },
        e('div', { className: 'flex flex-wrap items-center justify-between gap-2 mb-3' },
          e('div', { className: 'flex items-center gap-2' }, e('span', { className: 'font-bold text-gray-800' }, 'Garantido do dia'),
            e('input', { type: 'date', value: data, onChange: (ev) => { setData(ev.target.value); carregarRegistros(ev.target.value); }, className: 'px-2 py-1 border rounded-lg text-sm' })),
          e('div', { className: 'bg-purple-50 rounded-lg px-3 py-1.5 text-right' }, e('div', { className: 'text-[10px] text-purple-600' }, 'Total do dia'), e('div', { className: 'text-base font-bold text-purple-800' }, brl(total)))
        ),
        registros.length === 0
          ? e('div', { className: 'text-center py-6 text-gray-400 text-sm' }, '📭 Nenhum ingresso registrado nesta data')
          : e('div', { className: 'overflow-x-auto' }, e('table', { className: 'w-full text-sm' },
              e('thead', { className: 'bg-gray-50 text-gray-500 text-xs' }, e('tr', null,
                e('th', { className: 'px-2 py-2 text-left' }, 'Motoboy'),
                e('th', { className: 'px-2 py-2 text-center' }, '1º ingresso'),
                e('th', { className: 'px-2 py-2 text-right' }, 'Base'),
                e('th', { className: 'px-2 py-2 text-center' }, 'Fração'),
                e('th', { className: 'px-2 py-2 text-right' }, 'Garantia'))),
              e('tbody', { className: 'divide-y' }, registros.map((r, i) => e('tr', { key: i, className: 'hover:bg-gray-50' },
                e('td', { className: 'px-2 py-2 font-medium' }, r.nome_profissional || r.cod_profissional),
                e('td', { className: 'px-2 py-2 text-center tabular-nums' }, horaIngresso(r.hora_ingresso)),
                e('td', { className: 'px-2 py-2 text-right' }, brl(r.valor_base)),
                e('td', { className: 'px-2 py-2 text-center' }, e('span', { className: `px-2 py-0.5 rounded-full text-xs font-medium ${fracClass(r.fracao)}` }, `${(r.fracao * 100).toFixed(1).replace('.', ',')}%`)),
                e('td', { className: 'px-2 py-2 text-right font-semibold' }, brl(r.valor_garantido))))))
            )
      )
    );
  }

  window.ModuloGarantidoAdmin = ModuloGarantidoAdmin;
})();
