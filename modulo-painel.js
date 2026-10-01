/* PAINEL_V1 */
// ============================================================
// MÓDULO MEU PAINEL — FRONTEND v1
// Métricas individuais de atendimento (telefonia UserVoice + chamados Digisac)
// alimentadas pelo master via CSV. Cada admin vê só o seu; o master vê a
// equipe, importa e mantém os vínculos usuário ↔ ramal ↔ atendente.
// Padrão: Vanilla JS + React via CDN (sem JSX) — window.ModuloPainel
// ============================================================

(function () {
  const h = React.createElement;
  const { useState, useEffect, useMemo, useCallback, useRef } = React;

  // ─── helpers ───
  const ico = (nome, cls, style) => h('svg', { className: 'ico ' + (cls || ''), style: Object.assign({ width: 16, height: 16 }, style || {}), 'aria-hidden': 'true' }, h('use', { href: '#i-' + nome }));
  const pad2 = (n) => String(n).padStart(2, '0');
  const isoLocal = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const hoje = () => isoLocal(new Date());
  const addDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return isoLocal(d); };
  const fmtData = (iso) => { if (!iso) return '—'; const [a, m, d] = String(iso).slice(0, 10).split('-'); return `${d}/${m}/${a}`; };
  const fmtDataCurta = (iso) => { if (!iso) return '—'; const [, m, d] = String(iso).slice(0, 10).split('-'); return `${d}/${m}`; };
  const DIAS_SEM = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const diaSemana = (iso) => DIAS_SEM[new Date(iso + 'T12:00:00').getDay()];
  const fmtNum = (n) => (n == null ? '—' : Number(n).toLocaleString('pt-BR'));
  const fmtSeg = (s) => {
    if (s == null || isNaN(s)) return '—';
    s = Math.round(s);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m${pad2(s % 60)}s`;
    return `${Math.floor(s / 3600)}h${pad2(Math.floor((s % 3600) / 60))}m`;
  };
  const fmtDataHora = (iso) => { if (!iso) return '—'; const d = new Date(iso); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
  const iniciais = (nome) => String(nome || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  const horasExp = (cfg) => { const a = parseInt((cfg && cfg.expediente_inicio || '08:00').slice(0, 2), 10); const b = parseInt((cfg && cfg.expediente_fim || '19:00').slice(0, 2), 10); const out = []; for (let x = a; x < b; x++) out.push(x); return out; };
  const FONTE_LABEL = { uservoice: 'UserVoice', digisac: 'Digisac' };

  // ─── UI básicos ───
  const Tag = ({ children, cor }) => {
    const c = { roxo: 'bg-violet-100 text-violet-700', azul: 'bg-sky-100 text-sky-700', amarelo: 'bg-amber-100 text-amber-700', verde: 'bg-emerald-100 text-emerald-700', cinza: 'bg-gray-100 text-gray-600', vermelho: 'bg-red-100 text-red-700' }[cor || 'roxo'];
    return h('span', { className: `text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full ${c}` }, children);
  };
  const Avatar = ({ nome, foto, size }) => {
    const s = size || 32;
    if (foto) return h('img', { src: foto, alt: nome || '', className: 'rounded-full object-cover', style: { width: s, height: s } });
    return h('span', { className: 'rounded-full bg-violet-100 text-violet-800 font-bold inline-flex items-center justify-center', style: { width: s, height: s, fontSize: Math.round(s * 0.4) } }, iniciais(nome));
  };
  const Card = ({ children, className, style }) => h('div', { className: 'bg-white border border-violet-100 rounded-2xl p-5 ' + (className || ''), style }, children);
  const Kpi = ({ icone, tag, cor, valor, label, sub }) => {
    const borda = { roxo: '#7c3aed', azul: '#0ea5e9', amarelo: '#f59e0b', vermelho: '#dc2626', verde: '#10b981' }[cor || 'roxo'];
    const icoCor = { roxo: 'text-violet-700 bg-violet-50', azul: 'text-sky-700 bg-sky-50', amarelo: 'text-amber-700 bg-amber-50', vermelho: 'text-red-700 bg-red-50', verde: 'text-emerald-700 bg-emerald-50' }[cor || 'roxo'];
    return h('div', { className: 'bg-white border border-violet-100 rounded-2xl p-4 flex flex-col gap-1.5', style: { borderLeft: `4px solid ${borda}` } },
      h('div', { className: 'flex items-center justify-between' },
        h('span', { className: `w-8 h-8 rounded-lg inline-flex items-center justify-center ${icoCor}` }, ico(icone, '', { width: 16, height: 16 })),
        tag && h(Tag, { cor }, tag)),
      h('div', { className: 'text-[30px] font-bold leading-none tracking-tight text-gray-900 mt-1' }, valor),
      h('div', { className: 'text-sm text-gray-700' }, label),
      sub && h('div', { className: 'text-xs text-gray-500' }, sub));
  };
  const Secao = ({ titulo, direita }) => h('div', { className: 'flex items-center justify-between' },
    h('span', { className: 'text-[11px] font-bold tracking-widest uppercase text-gray-500' }, titulo), direita || null);
  const Botao = ({ children, onClick, tipo, disabled, className, title }) => {
    const base = 'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ';
    const t = { p: 'bg-violet-600 hover:bg-violet-700 text-white', g: 'bg-white border border-gray-200 hover:border-violet-300 text-gray-700', d: 'bg-red-50 hover:bg-red-100 text-red-700' }[tipo || 'g'];
    return h('button', { type: 'button', onClick, disabled, title, className: base + t + ' ' + (className || '') }, children);
  };
  const Vazio = ({ icone, titulo, texto, acao }) => h('div', { className: 'bg-white border border-dashed border-violet-200 rounded-2xl p-10 text-center flex flex-col items-center gap-3' },
    h('span', { className: 'w-14 h-14 rounded-2xl bg-violet-50 text-violet-600 inline-flex items-center justify-center' }, ico(icone || 'chart', '', { width: 26, height: 26 })),
    h('div', { className: 'text-base font-bold text-gray-800' }, titulo),
    texto && h('div', { className: 'text-sm text-gray-500 max-w-md' }, texto),
    acao || null);
  const Spinner = () => h('div', { className: 'flex items-center justify-center py-16 text-violet-600' }, h('div', { className: 'animate-spin rounded-full h-8 w-8 border-2 border-violet-200 border-t-violet-600' }));

  // ─── gráfico de barras por hora (empilhado 2 séries) ───
  const BarrasHora = ({ titulo, sub, horas, dados, s1, s2, cor1, cor2 }) => {
    const max = Math.max(1, ...horas.map((hh) => ((dados[hh] || {})[s1.key] || 0) + ((dados[hh] || {})[s2.key] || 0)));
    return h(Card, { className: 'flex flex-col gap-3' },
      h('div', { className: 'flex items-start justify-between gap-3' },
        h('div', null, h('div', { className: 'font-bold text-[15px] text-gray-900' }, titulo), sub && h('div', { className: 'text-xs text-gray-500' }, sub)),
        h('span', { className: 'text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-3 py-1 whitespace-nowrap' }, `${pad2(horas[0])}h–${pad2(horas[horas.length - 1] + 1)}h`)),
      h('div', { className: 'flex gap-4 text-xs text-gray-600' },
        h('span', { className: 'inline-flex items-center gap-1.5' }, h('i', { className: 'inline-block w-2.5 h-2.5 rounded-sm', style: { background: cor1 } }), s1.label),
        h('span', { className: 'inline-flex items-center gap-1.5' }, h('i', { className: 'inline-block w-2.5 h-2.5 rounded-sm', style: { background: cor2 } }), s2.label)),
      h('div', { className: 'grid gap-2 items-end border-b border-gray-200', style: { gridTemplateColumns: `repeat(${horas.length}, minmax(0,1fr))`, height: 150 } },
        horas.map((hh) => {
          const d = dados[hh] || {}; const a = d[s1.key] || 0, b = d[s2.key] || 0;
          return h('div', { key: hh, className: 'flex flex-col justify-end h-full', title: `${pad2(hh)}h · ${s1.label}: ${a} · ${s2.label}: ${b}` },
            h('div', { className: 'w-full rounded-t', style: { background: cor1, height: `${(a / max) * 100}%` } }),
            h('div', { className: 'w-full rounded-b-sm', style: { background: cor2, height: `${(b / max) * 100}%` } }));
        })),
      h('div', { className: 'grid gap-2 text-[11px] text-gray-500 text-center', style: { gridTemplateColumns: `repeat(${horas.length}, minmax(0,1fr))` } }, horas.map((hh) => h('span', { key: hh }, `${hh}h`))));
  };

  // ─── seletor de período ───
  const PRESETS = [['hoje', 'Hoje'], ['ontem', 'Ontem'], ['7d', '7 dias'], ['mes', 'Mês'], ['custom', 'Personalizado']];
  function periodoDoPreset(p) {
    const H = hoje();
    if (p === 'hoje') return { de: H, ate: H };
    if (p === 'ontem') { const o = addDias(H, -1); return { de: o, ate: o }; }
    if (p === '7d') return { de: addDias(H, -6), ate: H };
    if (p === 'mes') return { de: H.slice(0, 8) + '01', ate: H };
    return null;
  }
  const SeletorPeriodo = ({ preset, setPreset, de, ate, setDe, setAte }) => h('div', { className: 'flex items-center gap-2 flex-wrap' },
    h('div', { className: 'flex bg-white border border-gray-200 rounded-xl p-0.5 gap-0.5', role: 'group', 'aria-label': 'Período' },
      PRESETS.map(([id, label]) => h('button', { key: id, type: 'button', onClick: () => setPreset(id), className: `text-[13px] px-3 py-1.5 rounded-lg ${preset === id ? 'bg-violet-600 text-white font-semibold' : 'text-gray-600 hover:bg-gray-50'}` }, label))),
    preset === 'custom'
      ? h('div', { className: 'flex items-center gap-1.5 text-sm' },
        h('input', { type: 'date', value: de, onChange: (e) => setDe(e.target.value), className: 'border border-gray-200 rounded-lg px-2 py-1.5 text-sm' }), h('span', { className: 'text-gray-400' }, '→'),
        h('input', { type: 'date', value: ate, onChange: (e) => setAte(e.target.value), className: 'border border-gray-200 rounded-lg px-2 py-1.5 text-sm' }))
      : h('span', { className: 'text-xs text-gray-600 bg-white border border-gray-200 rounded-full px-3 py-1.5' }, de === ate ? h(React.Fragment, null, h('b', null, fmtData(de)), ` · ${diaSemana(de)}`) : h(React.Fragment, null, h('b', null, fmtData(de)), ' → ', h('b', null, fmtData(ate)))));

  function usePeriodo(inicial) {
    const [preset, setPresetRaw] = useState(inicial || '7d');
    const ini = periodoDoPreset(inicial || '7d');
    const [de, setDe] = useState(ini.de), [ate, setAte] = useState(ini.ate);
    const setPreset = (p) => { setPresetRaw(p); const r = periodoDoPreset(p); if (r) { setDe(r.de); setAte(r.ate); } };
    return { preset, setPreset, de, ate, setDe, setAte };
  }

  // ════════════════════════════════════════════════════════════
  // PAINEL DO OPERADOR (também usado pelo master em "abrir painel")
  // ════════════════════════════════════════════════════════════
  const PainelOperador = ({ api, fetchAuth, showToast, usuario, me, userId, onVoltar }) => {
    const per = usePeriodo('7d');
    const [dados, setDados] = useState(null), [loading, setLoading] = useState(true), [erro, setErro] = useState(null);
    const carregar = useCallback(async () => {
      setLoading(true); setErro(null);
      try {
        const q = `de=${per.de}&ate=${per.ate}` + (userId ? `&user_id=${userId}` : '');
        const r = await fetchAuth(`${api}/painel/metricas?${q}`);
        const d = await r.json();
        if (!r.ok || !d.success) throw new Error(d.error || 'Erro ao carregar');
        setDados(d);
      } catch (e) { setErro(e.message); } finally { setLoading(false); }
    }, [api, per.de, per.ate, userId]);
    useEffect(() => { if (per.de && per.ate) carregar(); }, [carregar]);

    const cfg = (dados && dados.config) || (me && me.config) || {};
    const horas = horasExp(cfg);
    const tel = dados && dados.telefonia, dg = dados && dados.chamados, eq = dados && dados.equipe;
    const vinc = (dados && dados.vinculos) || (me && me.vinculos) || [];
    const ramais = vinc.filter((v) => v.tipo === 'ramal').map((v) => v.identificador), nomesDg = vinc.filter((v) => v.tipo === 'digisac').map((v) => v.identificador);
    const semVinculo = !vinc.length;
    const semDados = dados && !tel.dias && !dg.dias;
    const nomeAlvo = dados && dados.alvo ? dados.alvo.nome : (usuario && usuario.nome);
    const veMedia = me ? me.config.ve_media_equipe : true;

    return h('div', { className: 'flex flex-col gap-4' },
      // cabeçalho
      h('div', { className: 'flex items-start justify-between gap-4 flex-wrap' },
        h('div', null,
          onVoltar && h('button', { type: 'button', onClick: onVoltar, className: 'text-sm text-violet-700 font-semibold inline-flex items-center gap-1 mb-1 hover:underline' }, ico('arrowleft'), 'Voltar para a equipe'),
          h('div', { className: 'flex items-center gap-2' },
            dados && dados.alvo && h(Avatar, { nome: dados.alvo.nome, foto: dados.alvo.foto_thumb, size: 28 }),
            h('h2', { className: 'text-lg font-bold text-gray-900 m-0' }, dados && dados.alvo ? `Painel de ${dados.alvo.nome}` : 'Minhas métricas')),
          h('div', { className: 'text-[13px] text-gray-500 mt-0.5' },
            dados && dados.ultima_importacao ? h(React.Fragment, null, 'atualizado pelo master em ', h('b', { className: 'text-gray-700' }, fmtDataHora(dados.ultima_importacao.criado_em))) : 'nenhuma importação ainda',
            ` · expediente ${cfg.expediente_inicio || '08:00'}–${cfg.expediente_fim || '19:00'}`)),
        h(SeletorPeriodo, per)),

      // faixa de privacidade
      !onVoltar && h('div', { className: 'flex items-center gap-2.5 bg-white border border-dashed border-violet-300 rounded-xl px-3.5 py-2.5 text-[13px] text-violet-900' },
        ico('lock', 'text-violet-700'),
        semVinculo
          ? h('span', null, 'Seu usuário ainda não tem ramal nem nome do Digisac vinculado — peça ao master para vincular em ', h('b', null, 'Meu Painel → Vínculos'), '. Até lá, nada vai aparecer aqui.')
          : h('span', null, 'Você está vendo apenas os ', h('b', null, 'seus'), ' números (', ramais.length ? h(React.Fragment, null, 'ramal ', h('b', null, ramais.join(', '))) : 'sem ramal', ' · ', nomesDg.length ? h(React.Fragment, null, 'Digisac ', h('b', null, nomesDg.join(' / '))) : 'sem nome no Digisac', '). Os dados dos colegas ficam visíveis só para o master.')),

      loading ? h(Spinner) : erro ? h(Vazio, { icone: 'alert', titulo: 'Não consegui carregar', texto: erro, acao: h(Botao, { onClick: carregar }, ico('refresh'), 'Tentar de novo') })
        : semDados ? h(Vazio, { icone: 'calendar', titulo: 'Sem dados neste período', texto: semVinculo ? 'Assim que o master vincular seu ramal / nome e importar os arquivos, suas métricas aparecem aqui.' : 'O master ainda não importou os arquivos desse período. Tente outro período ou avise o master.' })
        : h(React.Fragment, null,
          // telefonia
          h('div', { className: 'flex flex-col gap-2.5' },
            h(Secao, { titulo: 'Telefonia · UserVoice', direita: h('span', { className: 'text-xs text-gray-500' }, tel.dias ? `${tel.dias} dia(s) com dado` : 'sem arquivo neste período') }),
            h('div', { className: 'grid grid-cols-2 lg:grid-cols-4 gap-3.5' },
              h(Kpi, { icone: 'phone', tag: 'Atendidas', cor: 'roxo', valor: fmtNum(tel.atendidas), label: 'Ligações atendidas', sub: eq && veMedia && eq.atendidas_media != null ? `média da equipe ${fmtNum(eq.atendidas_media)}${eq.ranking_atendidas ? ` · ${eq.ranking_atendidas}º da equipe` : ''}` : (ramais.length ? `ramal ${ramais.join(', ')}` : null) }),
              h(Kpi, { icone: 'arrowright', tag: 'Feitas', cor: 'azul', valor: fmtNum(tel.feitas), label: 'Ligações feitas', sub: `${fmtNum(tel.feitas_completadas)} completadas · ${fmtNum(tel.feitas - tel.feitas_completadas)} sem atender` }),
              h(Kpi, { icone: 'clock', tag: 'Conversa', cor: 'azul', valor: fmtSeg(tel.conversa_media_s), label: 'Tempo médio de conversa', sub: eq && veMedia && eq.conversa_media_s != null ? `equipe ${fmtSeg(eq.conversa_media_s)}` : 'nas atendidas' }),
              h(Kpi, { icone: 'clock', tag: 'Total', cor: 'amarelo', valor: fmtSeg(tel.tempo_total_s), label: 'Tempo total em ligação', sub: 'atendidas + feitas completadas' }))),
          // digisac
          h('div', { className: 'flex flex-col gap-2.5' },
            h(Secao, { titulo: 'Chamados · Digisac', direita: dg.dias ? h('span', { className: 'text-xs text-gray-500' }, `${dg.dias} dia(s) com dado`) : h('span', { className: 'text-xs text-amber-700 bg-amber-50 rounded-full px-2.5 py-0.5' }, 'sem arquivo do Digisac neste período') }),
            h('div', { className: 'grid grid-cols-2 lg:grid-cols-4 gap-3.5' },
              h(Kpi, { icone: 'message', tag: 'Chamados', cor: 'roxo', valor: fmtNum(dg.chamados), label: 'Chamados no expediente', sub: dg.chamados_por_dia != null ? `${fmtNum(dg.chamados_por_dia)} por dia com dado${eq && veMedia && eq.chamados_media != null ? ` · equipe ${fmtNum(eq.chamados_media)} no período` : ''}` : null }),
              h(Kpi, { icone: 'clock', tag: '1º contato', cor: 'azul', valor: fmtSeg(dg.espera_mediana_s), label: 'Primeiro contato (mediana)', sub: `${eq && veMedia && eq.espera_mediana_s != null ? `equipe ${fmtSeg(eq.espera_mediana_s)} · ` : ''}seu p90 ${fmtSeg(dg.espera_p90_s)}` }),
              h(Kpi, { icone: 'arrowright', tag: 'Ativos', cor: 'azul', valor: fmtNum(dg.ativos), label: 'Iniciados por você', sub: dg.chamados ? `${(100 * dg.ativos / dg.chamados).toFixed(1).replace('.', ',')}% dos seus chamados` : null }),
              h(Kpi, { icone: 'star', tag: 'Prioridade', cor: 'amarelo', valor: fmtNum(dg.prioridade), label: 'Cliente prioridade', sub: dg.chamados ? `${(100 * dg.prioridade / dg.chamados).toFixed(1).replace('.', ',')}% · tempo médio de atendimento ${fmtSeg(dg.tempo_medio_s)}` : null }))),
          // gráficos
          h('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-3.5' },
            h(BarrasHora, { titulo: 'Ligações por hora', sub: 'Atendidas e feitas em cada hora do expediente.', horas, dados: tel.por_hora || {}, s1: { key: 'atendidas', label: 'Atendidas' }, s2: { key: 'feitas', label: 'Feitas' }, cor1: '#7c3aed', cor2: '#0ea5e9' }),
            h(BarrasHora, { titulo: 'Chamados por hora', sub: 'Horário de abertura do chamado.', horas, dados: dg.por_hora || {}, s1: { key: 'receptivos', label: 'Receptivos' }, s2: { key: 'ativos', label: 'Ativos' }, cor1: '#7c3aed', cor2: '#0ea5e9' })),
          // histórico + cobertura
          h('div', { className: 'grid grid-cols-1 lg:grid-cols-3 gap-3.5' },
            h(Card, { className: 'lg:col-span-2 flex flex-col gap-3' },
              h('div', null, h('div', { className: 'font-bold text-[15px] text-gray-900' }, 'Dia a dia'), h('div', { className: 'text-xs text-gray-500' }, 'Só aparecem dias que o master importou. "—" = fonte ainda não importada naquele dia.')),
              h('div', { className: 'overflow-x-auto' }, h('table', { className: 'w-full text-[13px]' },
                h('thead', null, h('tr', { className: 'text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200' },
                  ['Dia', 'Atendidas', 'Feitas', 'Chamados', '1º contato', 'Conversa média', 'Fontes'].map((c, i) => h('th', { key: c, className: `py-2 px-2.5 ${i === 0 || i === 6 ? 'text-left' : 'text-right'} font-semibold` }, c)))),
                h('tbody', null, dados.por_dia.map((d) => h('tr', { key: d.data, className: 'border-b border-gray-50' },
                  h('td', { className: 'py-2.5 px-2.5 whitespace-nowrap' }, `${fmtDataCurta(d.data)} ${diaSemana(d.data)}`),
                  h('td', { className: 'py-2.5 px-2.5 text-right font-semibold' }, d.tem_uservoice ? fmtNum(d.atendidas) : h('span', { className: 'text-gray-300' }, '—')),
                  h('td', { className: 'py-2.5 px-2.5 text-right' }, d.tem_uservoice ? fmtNum(d.feitas) : h('span', { className: 'text-gray-300' }, '—')),
                  h('td', { className: 'py-2.5 px-2.5 text-right font-semibold' }, d.tem_digisac ? fmtNum(d.chamados) : h('span', { className: 'text-gray-300' }, '—')),
                  h('td', { className: 'py-2.5 px-2.5 text-right' }, d.tem_digisac ? fmtSeg(d.espera_mediana_s) : h('span', { className: 'text-gray-300' }, '—')),
                  h('td', { className: 'py-2.5 px-2.5 text-right' }, d.tem_uservoice ? fmtSeg(d.conversa_media_s) : h('span', { className: 'text-gray-300' }, '—')),
                  h('td', { className: 'py-2.5 px-2.5' }, d.tem_uservoice && d.tem_digisac ? h(Tag, { cor: 'verde' }, 'completo') : d.tem_uservoice ? h(Tag, { cor: 'amarelo' }, 'só telefonia') : h(Tag, { cor: 'amarelo' }, 'só Digisac')))))))),
            h(Card, { className: 'flex flex-col gap-3' },
              h('div', { className: 'font-bold text-[15px] text-gray-900' }, 'Cobertura dos arquivos'),
              h('div', { className: 'text-xs text-gray-500' }, `Só entram ligações e chamados iniciados entre ${cfg.expediente_inicio || '08:00'} e ${cfg.expediente_fim || '19:00'}. Fora disso não conta em nenhuma métrica.`),
              ['uservoice', 'digisac'].map((f) => {
                const c = dados.cobertura && dados.cobertura[f];
                return h('div', { key: f, className: `flex justify-between gap-2 px-3 py-2.5 rounded-xl text-[13px] ${c ? 'bg-violet-50/60' : 'bg-amber-50'}` },
                  h('div', null, h('div', { className: 'font-semibold' }, f === 'uservoice' ? 'UserVoice · CDR' : 'Digisac · chamados'), h('div', { className: 'text-xs text-gray-500' }, c ? `${fmtDataCurta(c.data_min)} → ${fmtDataCurta(c.data_max)} · ${c.primeiro || '--:--'} → ${c.ultimo || '--:--'}` : 'nenhum arquivo no período')),
                  h('div', { className: 'text-right' }, c ? h(React.Fragment, null, h('div', { className: 'font-semibold' }, `${c.dias} dia(s)`), h('div', { className: 'text-xs text-gray-500' }, `${fmtNum(c.fora_expediente)} fora do expediente`)) : h('div', { className: 'font-semibold text-amber-700' }, 'pendente')));
              }),
              dados.cobertura && dados.cobertura.uservoice && h('div', { className: 'text-xs text-gray-500 border-t border-gray-100 pt-2.5' }, `Equipe no período: ${fmtNum(dados.cobertura.uservoice.recebidas)} ligações recebidas · ${fmtNum(dados.cobertura.uservoice.abandonadas)} abandonadas na fila (não entram na conta de ninguém).`)))));
  };

  // ════════════════════════════════════════════════════════════
  // EQUIPE (master)
  // ════════════════════════════════════════════════════════════
  const COLS_EQ = [
    ['nome', 'Operador', 'left'], ['atendidas', 'Atendidas', 'right'], ['participacao', 'Participação', 'left'], ['feitas', 'Feitas', 'right'],
    ['conversa', 'Conversa média', 'right'], ['chamados', 'Chamados', 'right'], ['ch_dia', 'Chamados/dia', 'right'], ['espera', '1º contato', 'right'], ['acoes', '', 'right'],
  ];
  const PainelEquipe = ({ api, fetchAuth, showToast, onAbrir }) => {
    const per = usePeriodo('7d');
    const [dados, setDados] = useState(null), [loading, setLoading] = useState(true);
    const [ord, setOrd] = useState({ col: 'atendidas', dir: -1 });
    const carregar = useCallback(async () => {
      setLoading(true);
      try { const r = await fetchAuth(`${api}/painel/equipe?de=${per.de}&ate=${per.ate}`); const d = await r.json(); if (d.success) setDados(d); else showToast && showToast(d.error || 'Erro', 'error'); }
      catch (e) { showToast && showToast('Erro ao carregar equipe', 'error'); } finally { setLoading(false); }
    }, [api, per.de, per.ate]);
    useEffect(() => { carregar(); }, [carregar]);

    const linhas = useMemo(() => {
      if (!dados) return [];
      const v = (o) => ({ nome: o.nome, atendidas: o.telefonia.atendidas, participacao: o.telefonia.participacao, feitas: o.telefonia.feitas, conversa: o.telefonia.conversa_media_s, chamados: o.chamados.chamados, ch_dia: o.chamados.chamados_por_dia, espera: o.chamados.espera_mediana_s });
      return dados.operadores.slice().sort((a, b) => { const x = v(a)[ord.col], y = v(b)[ord.col]; if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return (typeof x === 'string' ? x.localeCompare(y) : x - y) * ord.dir; });
    }, [dados, ord]);
    const clicarCol = (c) => { if (c === 'acoes') return; setOrd((o) => (o.col === c ? { col: c, dir: -o.dir } : { col: c, dir: c === 'nome' ? 1 : -1 })); };
    const maxAt = Math.max(1, ...(dados ? dados.operadores.map((o) => o.telefonia.atendidas) : [1]));
    const eq = dados && dados.equipe;

    const exportarCsv = () => {
      if (!dados) return;
      const sep = ';';
      const cab = ['Operador', 'Vínculos', 'Atendidas', 'Participação %', 'Feitas', 'Feitas completadas', 'Conversa média (s)', 'Chamados', 'Chamados/dia', '1º contato mediana (s)', '1º contato p90 (s)', 'Receptivos', 'Ativos', 'Prioridade'];
      const rows = dados.operadores.map((o) => [o.nome, (o.vinculos || []).map((v) => v.identificador).join(' | '), o.telefonia.atendidas, o.telefonia.participacao, o.telefonia.feitas, o.telefonia.feitas_completadas, o.telefonia.conversa_media_s, o.chamados.chamados, o.chamados.chamados_por_dia, o.chamados.espera_mediana_s, o.chamados.espera_p90_s, o.chamados.receptivos, o.chamados.ativos, o.chamados.prioridade]);
      const txt = '﻿' + [cab].concat(rows).map((r) => r.map((c) => (c == null ? '' : String(c).includes(sep) ? `"${c}"` : c)).join(sep)).join('\r\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' })); a.download = `equipe_${per.de}_${per.ate}.csv`; a.click(); URL.revokeObjectURL(a.href);
    };

    return h('div', { className: 'flex flex-col gap-4' },
      h('div', { className: 'flex items-start justify-between gap-4 flex-wrap' },
        h('div', null, h('h2', { className: 'text-lg font-bold text-gray-900 m-0' }, 'Equipe'), h('div', { className: 'text-[13px] text-gray-500 mt-0.5' }, 'Todos lado a lado no mesmo período. Clique no título da coluna para ordenar; "Abrir painel" mostra exatamente o que a pessoa vê.')),
        h('div', { className: 'flex items-center gap-2 flex-wrap' }, h(SeletorPeriodo, per), h(Botao, { onClick: exportarCsv, disabled: !dados }, ico('download'), 'CSV'))),
      loading ? h(Spinner) : !dados ? null : h(React.Fragment, null,
        h('div', { className: 'grid grid-cols-2 lg:grid-cols-5 gap-3.5' },
          h(Kpi, { icone: 'phone', tag: 'Equipe', cor: 'roxo', valor: fmtNum(eq.telefonia.atendidas), label: 'Ligações atendidas', sub: `${dados.operadores.filter((o) => o.telefonia.atendidas).length} operadores · ${fmtNum(eq.telefonia.recebidas)} recebidas` }),
          h(Kpi, { icone: 'alert', tag: 'Fila', cor: 'vermelho', valor: fmtNum(eq.telefonia.abandonadas), label: 'Abandonadas na fila', sub: eq.telefonia.recebidas ? `${Math.round(100 * eq.telefonia.abandonadas / eq.telefonia.recebidas)}% do recebido · ${fmtNum(eq.telefonia.ura)} ficaram na URA` : 'sem telefonia no período' }),
          h(Kpi, { icone: 'arrowright', tag: 'Saída', cor: 'azul', valor: fmtNum(eq.telefonia.feitas), label: 'Ligações feitas', sub: `${eq.telefonia.dias} dia(s) de CDR` }),
          h(Kpi, { icone: 'message', tag: 'Digisac', cor: 'roxo', valor: eq.chamados.dias ? fmtNum(eq.chamados.chamados) : '—', label: 'Chamados no expediente', sub: eq.chamados.dias ? `${fmtNum(eq.chamados.nao_atribuidos)} sem atendente · ${eq.chamados.dias} dia(s)` : 'sem arquivo do Digisac no período' }),
          h(Kpi, { icone: 'clock', tag: '1º contato', cor: 'azul', valor: fmtSeg(eq.chamados.espera_mediana_s), label: 'Mediana da equipe', sub: eq.chamados.espera_p90_s != null ? `p90 ${fmtSeg(eq.chamados.espera_p90_s)}` : null })),
        h(Card, { className: 'flex flex-col gap-3' },
          h('div', { className: 'flex items-center justify-between gap-3 flex-wrap' }, h('div', { className: 'font-bold text-[15px] text-gray-900' }, 'Por operador'), h('span', { className: 'text-xs text-gray-500' }, 'telefonia e chamados somados no período · "—" = sem vínculo ou sem arquivo')),
          !dados.operadores.length ? h(Vazio, { icone: 'users', titulo: 'Ninguém com vínculo ainda', texto: 'Vincule ramais e nomes do Digisac aos usuários em "Vínculos" e importe os arquivos.' })
            : h('div', { className: 'overflow-x-auto' }, h('table', { className: 'w-full text-[13px]' },
              h('thead', null, h('tr', { className: 'text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200' },
                COLS_EQ.map(([c, label, al]) => h('th', { key: c, onClick: () => clicarCol(c), className: `py-2 px-2.5 font-semibold select-none ${al === 'right' ? 'text-right' : 'text-left'} ${c !== 'acoes' ? 'cursor-pointer hover:text-violet-700' : ''}` }, label, ord.col === c ? (ord.dir < 0 ? ' ↓' : ' ↑') : '')))),
              h('tbody', null, linhas.map((o) => h('tr', { key: o.user_id, className: 'border-b border-gray-50 hover:bg-violet-50/40' },
                h('td', { className: 'py-2.5 px-2.5' }, h('div', { className: 'flex items-center gap-2.5' }, h(Avatar, { nome: o.nome, foto: o.foto_thumb, size: 30 }), h('div', null, h('div', { className: 'font-semibold text-gray-900' }, o.nome), h('div', { className: 'text-[11px] text-gray-500' }, (o.vinculos || []).length ? o.vinculos.map((v) => v.identificador).join(' · ') : h('span', { className: 'text-amber-700' }, 'sem vínculo'))))),
                h('td', { className: 'py-2.5 px-2.5 text-right font-bold' }, o.vinculos.some((v) => v.tipo === 'ramal') ? fmtNum(o.telefonia.atendidas) : h('span', { className: 'text-gray-300' }, '—')),
                h('td', { className: 'py-2.5 px-2.5' }, o.telefonia.atendidas ? h('div', { className: 'flex items-center gap-2' }, h('span', { className: 'inline-block h-2 rounded bg-gray-100 overflow-hidden', style: { width: 110 } }, h('i', { className: 'block h-full bg-violet-600 rounded', style: { width: `${(100 * o.telefonia.atendidas) / maxAt}%` } })), h('span', { className: 'text-xs text-gray-500' }, `${String(o.telefonia.participacao).replace('.', ',')}%`)) : h('span', { className: 'text-gray-300' }, '—')),
                h('td', { className: 'py-2.5 px-2.5 text-right' }, o.vinculos.some((v) => v.tipo === 'ramal') ? fmtNum(o.telefonia.feitas) : h('span', { className: 'text-gray-300' }, '—')),
                h('td', { className: 'py-2.5 px-2.5 text-right' }, fmtSeg(o.telefonia.conversa_media_s)),
                h('td', { className: 'py-2.5 px-2.5 text-right font-bold' }, o.vinculos.some((v) => v.tipo === 'digisac') ? fmtNum(o.chamados.chamados) : h('span', { className: 'text-gray-300' }, '—')),
                h('td', { className: 'py-2.5 px-2.5 text-right' }, fmtNum(o.chamados.chamados_por_dia)),
                h('td', { className: 'py-2.5 px-2.5 text-right' }, fmtSeg(o.chamados.espera_mediana_s)),
                h('td', { className: 'py-2.5 px-2.5 text-right' }, h(Botao, { onClick: () => onAbrir(o.user_id), className: '!py-1.5 !px-3 text-xs' }, 'Abrir painel')))),
                (dados.nao_atribuido.uservoice.dias || dados.nao_atribuido.digisac.dias) ? h('tr', { className: 'bg-gray-50 text-gray-600' },
                  h('td', { colSpan: 2, className: 'py-2.5 px-2.5 text-xs' }, 'Não atribuído · ', dados.nao_atribuido.identificadores.length ? dados.nao_atribuido.identificadores.join(', ') : 'identidades sem vínculo'),
                  h('td', { className: 'py-2.5 px-2.5 text-right' }, fmtNum(dados.nao_atribuido.uservoice.atendidas)), h('td', null), h('td', { className: 'py-2.5 px-2.5 text-right' }, fmtNum(dados.nao_atribuido.uservoice.feitas)), h('td', null),
                  h('td', { className: 'py-2.5 px-2.5 text-right' }, fmtNum(dados.nao_atribuido.digisac.chamados)), h('td', null), h('td', null),
                  h('td', { className: 'py-2.5 px-2.5 text-right text-xs' }, h('span', { className: 'text-violet-700 font-semibold' }, 'resolver em Vínculos'))) : null)))),
        // comparativo
        dados.operadores.length > 0 && h('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-3.5' },
          h(Card, { className: 'flex flex-col gap-3' },
            h('div', { className: 'font-bold text-[15px] text-gray-900' }, 'Ligações atendidas por operador'),
            h('div', { className: 'flex flex-col gap-2' }, linhas.filter((o) => o.vinculos.some((v) => v.tipo === 'ramal')).map((o) => h('div', { key: o.user_id, className: 'flex items-center gap-3 text-[13px]' },
              h('span', { className: 'w-24 truncate text-gray-700' }, o.nome),
              h('span', { className: 'flex-1 h-5 bg-gray-100 rounded overflow-hidden' }, h('i', { className: 'block h-full bg-violet-600 rounded', style: { width: `${(100 * o.telefonia.atendidas) / maxAt}%` } })),
              h('b', { className: 'w-10 text-right' }, fmtNum(o.telefonia.atendidas)))))),
          h(Card, { className: 'flex flex-col gap-3' },
            h('div', { className: 'font-bold text-[15px] text-gray-900' }, 'Chamados Digisac por operador'),
            (() => { const m = Math.max(1, ...dados.operadores.map((o) => o.chamados.chamados)); return h('div', { className: 'flex flex-col gap-2' }, linhas.filter((o) => o.vinculos.some((v) => v.tipo === 'digisac')).map((o) => h('div', { key: o.user_id, className: 'flex items-center gap-3 text-[13px]' },
              h('span', { className: 'w-24 truncate text-gray-700' }, o.nome),
              h('span', { className: 'flex-1 h-5 bg-gray-100 rounded overflow-hidden' }, h('i', { className: 'block h-full bg-sky-500 rounded', style: { width: `${(100 * o.chamados.chamados) / m}%` } })),
              h('b', { className: 'w-14 text-right' }, fmtNum(o.chamados.chamados))))); })()))));
  };

  // ════════════════════════════════════════════════════════════
  // IMPORTAR (master)
  // ════════════════════════════════════════════════════════════
  const lerArquivo = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result || '')); r.onerror = rej; r.readAsText(file, 'utf-8'); });

  const PainelImportar = ({ api, fetchAuth, showToast, onImportou }) => {
    const [arquivos, setArquivos] = useState([]); // {nome, conteudo, tamanho}
    const [previa, setPrevia] = useState(null), [carregando, setCarregando] = useState(false), [importando, setImportando] = useState(false), [resultado, setResultado] = useState(null);
    const [decisoes, setDecisoes] = useState({}); // `${tipo}|${identificador}` -> { acao:'vincular'|'ignorar', user_id, user_nome }
    const [salvarVinculos, setSalvarVinculos] = useState(true);
    const [arrastando, setArrastando] = useState(false);
    const inputRef = useRef(null);

    const adicionar = async (files) => {
      const novos = [];
      for (const f of Array.from(files || [])) {
        if (!/\.(csv|txt)$/i.test(f.name)) { showToast && showToast(`${f.name}: só aceito CSV`, 'warning'); continue; }
        if (f.size > 25 * 1024 * 1024) { showToast && showToast(`${f.name}: maior que 25 MB`, 'warning'); continue; }
        novos.push({ nome: f.name, conteudo: await lerArquivo(f), tamanho: f.size });
      }
      if (!novos.length) return;
      setArquivos((a) => a.filter((x) => !novos.some((n) => n.nome === x.nome)).concat(novos)); setPrevia(null); setResultado(null); setDecisoes({});
    };
    const remover = (nome) => { setArquivos((a) => a.filter((x) => x.nome !== nome)); setPrevia(null); setResultado(null); };

    const vinculosNovos = () => Object.entries(decisoes).filter(([, d]) => d.acao === 'vincular' && d.user_id).map(([k, d]) => ({ tipo: k.split('|')[0], identificador: k.split('|').slice(1).join('|'), user_id: d.user_id, user_nome: d.user_nome }));
    const ignorar = () => Object.entries(decisoes).filter(([, d]) => d.acao === 'ignorar').map(([k]) => ({ tipo: k.split('|')[0], identificador: k.split('|').slice(1).join('|') }));

    const analisar = async () => {
      if (!arquivos.length) return;
      setCarregando(true);
      try {
        const r = await fetchAuth(`${api}/painel/importar/previa`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ arquivos: arquivos.map(({ nome, conteudo }) => ({ nome, conteudo })), vinculos_novos: vinculosNovos() }) });
        const d = await r.json();
        if (!d.success) throw new Error(d.error || 'Erro na prévia');
        setPrevia(d);
      } catch (e) { showToast && showToast(e.message, 'error'); } finally { setCarregando(false); }
    };
    useEffect(() => { if (arquivos.length && !previa && !carregando) analisar(); }, [arquivos.length]); // eslint-disable-line

    const importar = async () => {
      setImportando(true);
      try {
        const r = await fetchAuth(`${api}/painel/importar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ arquivos: arquivos.map(({ nome, conteudo }) => ({ nome, conteudo })), vinculos_novos: salvarVinculos ? vinculosNovos() : [], ignorar: salvarVinculos ? ignorar() : [] }) });
        const d = await r.json();
        if (!d.success) throw new Error(d.error || 'Erro ao importar');
        setResultado(d.resultados); setArquivos([]); setPrevia(null); setDecisoes({});
        showToast && showToast('Importação concluída', 'success'); onImportou && onImportou();
      } catch (e) { showToast && showToast(e.message, 'error'); } finally { setImportando(false); }
    };

    const semVinculoTotal = previa ? previa.arquivos.reduce((s, a) => s + ((a.identidades || []).filter((i) => !i.user_id && !(decisoes[`${a.tipo}|${i.identificador}`] || {}).acao).length), 0) : 0;
    const passo = resultado ? 4 : previa ? (semVinculoTotal ? 2 : 3) : 1;

    const passo_ = (n, label, ativo, ok) => h('div', { className: `flex items-center gap-2 text-[13px] ${ativo ? 'text-violet-900 font-semibold' : 'text-gray-500'}` },
      h('b', { className: `w-[22px] h-[22px] rounded-full inline-flex items-center justify-center text-xs ${ok ? 'bg-emerald-600 text-white' : ativo ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-700'}` }, ok ? '✓' : n), label);

    return h('div', { className: 'flex flex-col gap-4' },
      h('div', null, h('h2', { className: 'text-lg font-bold text-gray-900 m-0' }, 'Importar métricas'), h('div', { className: 'text-[13px] text-gray-500 mt-0.5' }, 'Suba o CDR do UserVoice e o histórico de chamados do Digisac (um ou os dois). O sistema reconhece o tipo pelas colunas, casa ramal/atendente com os usuários e grava as métricas por pessoa × dia. Reimportar o mesmo dia substitui, não duplica.')),
      h('div', { className: 'flex items-center gap-5 bg-white border border-violet-100 rounded-xl px-4 py-3 flex-wrap' },
        passo_(1, 'Enviar arquivos', passo === 1, passo > 1), h('span', { className: 'text-gray-300' }, '›'),
        passo_(2, 'Conferir vínculos e cobertura', passo === 2, passo > 2), h('span', { className: 'text-gray-300' }, '›'),
        passo_(3, 'Importar', passo === 3, passo > 3)),

      // dropzone
      !resultado && h('div', {
        onDragOver: (e) => { e.preventDefault(); setArrastando(true); }, onDragLeave: () => setArrastando(false),
        onDrop: (e) => { e.preventDefault(); setArrastando(false); adicionar(e.dataTransfer.files); },
        className: `border-2 border-dashed rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4 transition ${arrastando ? 'border-violet-500 bg-violet-50' : 'border-violet-200 bg-white'}`,
      },
        h('span', { className: 'w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 inline-flex items-center justify-center shrink-0' }, ico('upload', '', { width: 22, height: 22 })),
        h('div', { className: 'flex-1 text-center sm:text-left' }, h('div', { className: 'font-semibold text-gray-900' }, arquivos.length ? `${arquivos.length} arquivo(s) selecionado(s)` : 'Arraste os CSVs aqui ou clique para escolher'), h('div', { className: 'text-xs text-gray-500' }, 'CDR do UserVoice (Data e Hora / Origem / Destino / Status da Chamada) e histórico de chamados do Digisac (Atendente / Data de início). Separador ";".')),
        h('input', { ref: inputRef, type: 'file', accept: '.csv,text/csv', multiple: true, className: 'hidden', onChange: (e) => { adicionar(e.target.files); e.target.value = ''; } }),
        h(Botao, { tipo: 'p', onClick: () => inputRef.current && inputRef.current.click() }, ico('plus'), 'Escolher arquivos')),
      arquivos.length > 0 && !resultado && h('div', { className: 'flex flex-wrap gap-2' }, arquivos.map((a) => h('span', { key: a.nome, className: 'inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full pl-3 pr-1.5 py-1 text-[13px]' },
        ico('filetext', 'text-violet-600'), h('span', { className: 'max-w-[320px] truncate', title: a.nome }, a.nome), h('span', { className: 'text-xs text-gray-400' }, `${(a.tamanho / 1024).toFixed(0)} KB`),
        h('button', { type: 'button', onClick: () => remover(a.nome), 'aria-label': 'Remover', className: 'w-6 h-6 rounded-full hover:bg-gray-100 inline-flex items-center justify-center text-gray-500' }, ico('x', '', { width: 12, height: 12 }))))),

      carregando && h(Spinner),

      // prévia
      previa && !resultado && h(React.Fragment, null,
        previa.substituir.length > 0 && h('div', { className: 'flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 text-[13px] text-amber-900' }, ico('alert', 'text-amber-700 mt-0.5'), h('span', null, h('b', null, `${previa.substituir.length} dia(s)`), ' já importado(s) antes serão substituídos: ', previa.substituir.map((s) => `${FONTE_LABEL[s.fonte]} ${fmtDataCurta(s.data)}`).join(', '), '.')),
        h('div', { className: `grid grid-cols-1 ${previa.arquivos.length > 1 ? 'xl:grid-cols-2' : ''} gap-3.5` }, previa.arquivos.map((a) => {
          if (a.erro) return h(Card, { key: a.nome, className: 'border-red-200 flex flex-col gap-2' }, h('div', { className: 'flex items-center justify-between' }, h('div', { className: 'font-bold text-[15px] truncate' }, a.nome), h(Tag, { cor: 'vermelho' }, 'não reconhecido')), h('div', { className: 'text-sm text-red-700' }, a.erro), a.headers && h('div', { className: 'text-xs text-gray-500' }, 'Colunas encontradas: ', a.headers.slice(0, 12).join(' · ')));
          const uv = a.fonte === 'uservoice'; const r = a.resumo;
          return h(Card, { key: a.nome, className: 'flex flex-col gap-3', style: { borderTop: `4px solid ${uv ? '#7c3aed' : '#0ea5e9'}` } },
            h('div', { className: 'flex items-center justify-between gap-2' }, h('div', { className: 'flex items-center gap-2 font-bold text-[15px]' }, ico(uv ? 'phone' : 'message', uv ? 'text-violet-700' : 'text-sky-700'), uv ? 'Telefonia · UserVoice (CDR)' : 'Chamados · Digisac (histórico)'), h(Tag, { cor: 'verde' }, 'reconhecido')),
            h('div', { className: 'text-xs text-gray-500 truncate', title: a.nome }, a.nome, ` · ${fmtNum(r.linhas_total)} linhas`),
            h('div', { className: 'grid grid-cols-3 gap-2.5 text-[13px]' },
              h('div', { className: 'bg-gray-50 rounded-xl px-3 py-2.5' }, h('div', { className: 'text-[11px] uppercase tracking-wider text-gray-500' }, 'Período do arquivo'), h('div', { className: 'font-semibold' }, r.data_min === r.data_max ? fmtData(r.data_min) : `${fmtDataCurta(r.data_min)} → ${fmtData(r.data_max)}`), h('div', { className: 'text-xs text-gray-500' }, `${r.dias} dia(s)${r.dias > 7 ? ' · arquivo acumulado' : ''}`)),
              h('div', { className: 'bg-gray-50 rounded-xl px-3 py-2.5' }, h('div', { className: 'text-[11px] uppercase tracking-wider text-gray-500' }, 'No expediente'), h('div', { className: 'font-semibold' }, `${fmtNum(r.linhas_expediente)} ${uv ? 'ligações' : 'chamados'}`), h('div', { className: 'text-xs text-gray-500' }, `${fmtNum(r.fora_expediente)} fora do horário ignorados`)),
              h('div', { className: 'bg-gray-50 rounded-xl px-3 py-2.5' }, h('div', { className: 'text-[11px] uppercase tracking-wider text-gray-500' }, 'Resultado'), h('div', { className: 'font-semibold' }, uv ? `${fmtNum(r.equipe.atendidas)} atendidas · ${fmtNum(r.equipe.feitas)} feitas` : `${fmtNum(r.linhas_expediente - r.equipe.nao_atribuidos)} atribuíveis`), h('div', { className: 'text-xs text-gray-500' }, uv ? `${fmtNum(r.equipe.abandonadas)} abandonadas (fila, equipe)` : `${fmtNum(r.equipe.nao_atribuidos)} sem atendente definido`))),
            h('div', { className: 'overflow-x-auto' }, h('table', { className: 'w-full text-[13px]' },
              h('thead', null, h('tr', { className: 'text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200' }, [uv ? 'Ramal no CSV' : 'Atendente no CSV', 'Usuário da Central', uv ? 'Atendidas' : 'Chamados', uv ? 'Feitas' : '1º contato', 'Vínculo'].map((c, i) => h('th', { key: c, className: `py-2 px-2 font-semibold ${i === 2 || i === 3 ? 'text-right' : 'text-left'}` }, c)))),
              h('tbody', null, a.identidades.map((i) => {
                const k = `${a.tipo}|${i.identificador}`; const dec = decisoes[k] || {};
                const pendente = !i.user_id && !dec.acao;
                return h('tr', { key: k, className: `border-b border-gray-50 ${pendente ? 'bg-amber-50' : ''}` },
                  h('td', { className: 'py-2 px-2' }, h('code', { className: 'text-xs bg-gray-100 rounded px-1.5 py-0.5' }, i.identificador || '(vazio)')),
                  h('td', { className: 'py-2 px-2' }, i.status === 'vinculado' ? i.user_nome
                    : h('select', { value: dec.acao === 'ignorar' ? '__ignorar' : (dec.user_id || ''), onChange: (e) => { const v = e.target.value; setDecisoes((d) => ({ ...d, [k]: v === '__ignorar' ? { acao: 'ignorar' } : v ? { acao: 'vincular', user_id: +v, user_nome: (previa.usuarios.find((u) => u.id === +v) || {}).nome } : {} })); }, className: `text-[13px] border rounded-lg px-2 py-1 bg-white ${pendente ? 'border-amber-400' : 'border-gray-200'}` },
                      h('option', { value: '' }, 'Escolher usuário…'), previa.usuarios.map((u) => h('option', { key: u.id, value: u.id }, u.nome)), h('option', { value: '__ignorar' }, 'Ignorar sempre (não é pessoa)'))),
                  h('td', { className: 'py-2 px-2 text-right font-semibold' }, fmtNum(uv ? i.atendidas : i.chamados)),
                  h('td', { className: 'py-2 px-2 text-right' }, uv ? fmtNum(i.feitas) : fmtSeg(i.espera_mediana_s)),
                  h('td', { className: 'py-2 px-2 text-xs' }, i.status === 'vinculado' ? h('span', { className: 'text-emerald-700 font-semibold' }, '✓ vinculado') : dec.acao === 'vincular' ? h('span', { className: 'text-emerald-700 font-semibold' }, `→ ${dec.user_nome}`) : dec.acao === 'ignorar' ? h('span', { className: 'text-gray-500' }, 'ignorado') : h('span', { className: 'text-amber-700 font-semibold' }, uv ? `sem vínculo · ${fmtNum(i.atendidas + i.feitas)} ligações ficam de fora` : `novo nome · ${fmtNum(i.chamados)} chamados ficam de fora`)));
              }),
                !uv && h('tr', { className: 'text-gray-500' }, h('td', { className: 'py-2 px-2 text-xs' }, previa.ignorados.filter((g) => g.tipo === 'digisac').map((g) => g.identificador).join(' · ')), h('td', { className: 'py-2 px-2 text-xs' }, 'inconclusivo — não atribui'), h('td', { className: 'py-2 px-2 text-right' }, fmtNum(r.equipe.nao_atribuidos)), h('td', null), h('td', { className: 'py-2 px-2 text-xs' }, 'só no total da equipe'))))));
        })),
        h(Card, { className: 'flex flex-col md:flex-row md:items-center gap-4 border-violet-300 bg-violet-50/50' },
          h('div', { className: 'flex-1' }, h('div', { className: 'font-bold text-[15px]' }, semVinculoTotal ? `${semVinculoTotal} identidade(s) sem vínculo` : 'Pronto para importar'),
            h('div', { className: 'text-[13px] text-gray-600' }, 'Grava ', previa.arquivos.filter((a) => !a.erro).map((a) => h('b', { key: a.nome }, `${FONTE_LABEL[a.fonte]} ${a.resumo.data_min === a.resumo.data_max ? fmtDataCurta(a.resumo.data_min) : `${fmtDataCurta(a.resumo.data_min)}→${fmtDataCurta(a.resumo.data_max)}`} `)), semVinculoTotal ? '. Resolva acima ou importe assim mesmo — o que ficar sem vínculo entra como "não atribuído" e pode ser resolvido depois em Vínculos (retroativo).' : '.')),
          h('label', { className: 'flex items-center gap-2 text-[13px] text-gray-700' }, h('input', { type: 'checkbox', checked: salvarVinculos, onChange: (e) => setSalvarVinculos(e.target.checked) }), 'Salvar novos vínculos para os próximos dias'),
          h(Botao, { onClick: () => { setArquivos([]); setPrevia(null); setDecisoes({}); } }, 'Descartar'),
          h(Botao, { tipo: 'p', onClick: importar, disabled: importando || !previa.arquivos.some((a) => !a.erro) }, ico('upload'), importando ? 'Importando…' : `Importar ${previa.arquivos.filter((a) => !a.erro).length} arquivo(s)`))),

      // resultado
      resultado && h(Card, { className: 'flex flex-col gap-3 border-emerald-200' },
        h('div', { className: 'flex items-center gap-2 font-bold text-[15px] text-emerald-800' }, ico('check'), 'Importação concluída'),
        h('ul', { className: 'text-[13px] text-gray-700 flex flex-col gap-1.5 m-0 pl-0 list-none' }, resultado.map((r) => h('li', { key: r.nome, className: 'flex items-start gap-2' }, r.erro ? ico('alert', 'text-red-600 mt-0.5') : ico('check', 'text-emerald-600 mt-0.5'),
          h('span', null, h('b', null, r.nome), r.erro ? ` — ${r.erro}` : ` — ${FONTE_LABEL[r.fonte]}, ${r.resumo.dias} dia(s) (${fmtDataCurta(r.resumo.data_min)} → ${fmtDataCurta(r.resumo.data_max)}), ${fmtNum(r.resumo.linhas_expediente)} registros no expediente`, r.sem_vinculo && r.sem_vinculo.length ? h('span', { className: 'text-amber-700' }, ` · sem vínculo: ${r.sem_vinculo.join(', ')}`) : null)))),
        h('div', { className: 'flex gap-2' }, h(Botao, { tipo: 'p', onClick: () => setResultado(null) }, ico('plus'), 'Importar mais arquivos'))));
  };

  // ════════════════════════════════════════════════════════════
  // HISTÓRICO DE IMPORTAÇÕES + CALENDÁRIO (master)
  // ════════════════════════════════════════════════════════════
  const PainelHistorico = ({ api, fetchAuth, showToast, tick }) => {
    const [imps, setImps] = useState(null), [dias, setDias] = useState({});
    const [mes, setMes] = useState(hoje().slice(0, 7));
    const carregar = useCallback(async () => {
      try {
        const [r1, r2] = await Promise.all([fetchAuth(`${api}/painel/importacoes?limit=100`), fetchAuth(`${api}/painel/dias?de=${mes}-01&ate=${mes}-31`)]);
        const d1 = await r1.json(), d2 = await r2.json();
        if (d1.success) setImps(d1.importacoes); if (d2.success) setDias(d2.dias || {});
      } catch (e) { showToast && showToast('Erro ao carregar histórico', 'error'); }
    }, [api, mes, tick]);
    useEffect(() => { carregar(); }, [carregar]);
    const desfazer = async (imp) => {
      if (!window.confirm(`Desfazer a importação de ${FONTE_LABEL[imp.fonte]} (${fmtDataCurta(imp.data_min)} → ${fmtDataCurta(imp.data_max)})? As métricas desses dias somem até você importar de novo.`)) return;
      const r = await fetchAuth(`${api}/painel/importacoes/${imp.id}`, { method: 'DELETE' }); const d = await r.json();
      if (d.success) { showToast && showToast(`Desfeito · ${d.linhas_removidas} registro(s) removido(s)`, 'success'); carregar(); } else showToast && showToast(d.error || 'Erro', 'error');
    };
    // calendário do mês (só dias úteis)
    const diasMes = useMemo(() => { const [a, m] = mes.split('-').map(Number); const out = []; const d = new Date(a, m - 1, 1); while (d.getMonth() === m - 1) { if (d.getDay() !== 0 && d.getDay() !== 6) out.push(isoLocal(d)); d.setDate(d.getDate() + 1); } return out; }, [mes]);
    const mudarMes = (n) => { const [a, m] = mes.split('-').map(Number); const d = new Date(a, m - 1 + n, 1); setMes(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`); };
    return h('div', { className: 'flex flex-col gap-4' },
      h('div', null, h('h2', { className: 'text-lg font-bold text-gray-900 m-0' }, 'Histórico de importações'), h('div', { className: 'text-[13px] text-gray-500 mt-0.5' }, 'O que já foi importado e quais dias ainda faltam. Desfazer remove as métricas daquela importação.')),
      h(Card, { className: 'flex flex-col gap-3' },
        h('div', { className: 'flex items-center justify-between' }, h('div', { className: 'font-bold text-[15px]' }, 'Dias úteis cobertos'), h('div', { className: 'flex items-center gap-2 text-sm' }, h('button', { type: 'button', onClick: () => mudarMes(-1), className: 'w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50' }, '‹'), h('b', { className: 'w-20 text-center' }, `${mes.slice(5)}/${mes.slice(0, 4)}`), h('button', { type: 'button', onClick: () => mudarMes(1), className: 'w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50' }, '›'))),
        h('div', { className: 'text-xs text-gray-500' }, 'Roxo = telefonia importada · azul = Digisac · cinza = faltando. Fim de semana não aparece.'),
        h('div', { className: 'grid gap-1.5', style: { gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))' } }, diasMes.map((d) => { const f = dias[d] || []; const uv = f.includes('uservoice'), dg = f.includes('digisac'); const futuro = d > hoje();
          return h('div', { key: d, title: `${fmtData(d)} · ${uv ? 'UserVoice ' : ''}${dg ? 'Digisac' : ''}${!uv && !dg ? 'nada importado' : ''}`, className: `h-10 rounded-lg flex flex-col items-center justify-center text-[11px] font-semibold ${futuro ? 'bg-gray-50 text-gray-300' : (!uv && !dg) ? 'bg-gray-200 text-gray-600' : 'text-white'}`, style: !futuro && (uv || dg) ? { background: uv && dg ? 'linear-gradient(90deg,#7c3aed 50%,#0ea5e9 50%)' : uv ? '#7c3aed' : '#0ea5e9' } : {} }, d.slice(8)); }))),
      h(Card, { className: 'flex flex-col gap-3' },
        h('div', { className: 'font-bold text-[15px]' }, 'Últimas importações'),
        !imps ? h(Spinner) : !imps.length ? h('div', { className: 'text-sm text-gray-500' }, 'Nenhuma importação ainda.') : h('div', { className: 'overflow-x-auto' }, h('table', { className: 'w-full text-[13px]' },
          h('thead', null, h('tr', { className: 'text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200' }, ['Quando', 'Fonte', 'Arquivo', 'Dias cobertos', 'Registros', 'Atribuídos', 'Por', ''].map((c, i) => h('th', { key: c + i, className: `py-2 px-2.5 font-semibold ${i === 4 || i === 5 ? 'text-right' : 'text-left'}` }, c)))),
          h('tbody', null, imps.map((imp) => h('tr', { key: imp.id, className: `border-b border-gray-50 ${imp.desfeita_em ? 'opacity-50 line-through' : ''}` },
            h('td', { className: 'py-2.5 px-2.5 whitespace-nowrap' }, fmtDataHora(imp.criado_em)),
            h('td', { className: 'py-2.5 px-2.5' }, h(Tag, { cor: imp.fonte === 'uservoice' ? 'roxo' : 'azul' }, FONTE_LABEL[imp.fonte] || imp.fonte)),
            h('td', { className: 'py-2.5 px-2.5 max-w-[260px] truncate text-gray-600', title: imp.nome_arquivo }, imp.nome_arquivo),
            h('td', { className: 'py-2.5 px-2.5 whitespace-nowrap' }, imp.data_min === imp.data_max ? fmtData(imp.data_min) : `${fmtDataCurta(imp.data_min)} → ${fmtDataCurta(imp.data_max)}`, h('span', { className: 'text-xs text-gray-400' }, ` (${imp.dias_cobertos})`)),
            h('td', { className: 'py-2.5 px-2.5 text-right' }, fmtNum(imp.linhas_expediente), h('span', { className: 'text-xs text-gray-400' }, ` / ${fmtNum(imp.linhas_total)}`)),
            h('td', { className: 'py-2.5 px-2.5 text-right' }, fmtNum(imp.linhas_atribuidas), imp.linhas_expediente ? h('span', { className: 'text-xs text-gray-400' }, ` (${Math.round(100 * imp.linhas_atribuidas / imp.linhas_expediente)}%)`) : null),
            h('td', { className: 'py-2.5 px-2.5' }, imp.importado_por_nome),
            h('td', { className: 'py-2.5 px-2.5 text-right' }, imp.desfeita_em ? h('span', { className: 'text-xs text-gray-500 no-underline' }, 'desfeita') : h('button', { type: 'button', onClick: () => desfazer(imp), className: 'text-[13px] text-red-700 font-semibold hover:underline' }, 'Desfazer')))))))));
  };

  // ════════════════════════════════════════════════════════════
  // VÍNCULOS (master)
  // ════════════════════════════════════════════════════════════
  const Chip = ({ children, cor, onRemover, title }) => h('span', { title, className: `inline-flex items-center gap-1.5 text-xs rounded-full border pl-2.5 pr-1 py-1 m-0.5 ${cor === 'ramal' ? 'bg-violet-50 border-violet-200 text-violet-900 font-mono' : cor === 'digisac' ? 'bg-sky-50 border-sky-200 text-sky-900' : 'bg-white border-gray-200 text-gray-700'}` },
    children, onRemover && h('button', { type: 'button', onClick: onRemover, 'aria-label': 'Remover', className: 'w-4 h-4 rounded-full bg-black/10 hover:bg-black/20 inline-flex items-center justify-center text-[10px] leading-none' }, '×'));

  const PainelVinculos = ({ api, fetchAuth, showToast }) => {
    const [dados, setDados] = useState(null), [busca, setBusca] = useState(''), [soSem, setSoSem] = useState(false);
    const [novo, setNovo] = useState(null); // { user_id, tipo, valor }
    const [cfg, setCfg] = useState(null), [salvandoCfg, setSalvandoCfg] = useState(false);
    const carregar = useCallback(async () => {
      try { const r = await fetchAuth(`${api}/painel/vinculos`); const d = await r.json(); if (d.success) { setDados(d); setCfg(d.config); } else showToast && showToast(d.error || 'Erro', 'error'); }
      catch (e) { showToast && showToast('Erro ao carregar vínculos', 'error'); }
    }, [api]);
    useEffect(() => { carregar(); }, [carregar]);

    const post = async (path, body, method) => { const r = await fetchAuth(`${api}${path}`, { method: method || 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); const d = await r.json(); if (!d.success) throw new Error(d.error || 'Erro'); return d; };
    const criar = async (user_id, tipo, identificador) => {
      try { const d = await post('/painel/vinculos', { user_id, tipo, identificador }); showToast && showToast(d.reatribuidas ? `Vinculado · ${d.reatribuidas} dia(s) de métricas passaram pra pessoa` : 'Vinculado', 'success'); setNovo(null); carregar(); }
      catch (e) { showToast && showToast(e.message, 'error'); }
    };
    const remover = async (v, nome) => {
      if (!window.confirm(`Remover "${v.identificador}" de ${nome}? As métricas desse identificador voltam a ficar como não atribuídas.`)) return;
      try { await post(`/painel/vinculos/${v.id}`, null, 'DELETE'); carregar(); } catch (e) { showToast && showToast(e.message, 'error'); }
    };
    const ignorarPend = async (p) => { try { await post('/painel/ignorados', { tipo: p.tipo, identificador: p.identificador }); carregar(); } catch (e) { showToast && showToast(e.message, 'error'); } };
    const removerIgn = async (g) => { try { await post(`/painel/ignorados/${g.id}`, null, 'DELETE'); carregar(); } catch (e) { showToast && showToast(e.message, 'error'); } };
    const descartarPend = async (p) => { try { await post(`/painel/pendentes/${p.id}`, null, 'DELETE'); carregar(); } catch (e) { showToast && showToast(e.message, 'error'); } };
    const salvarCfg = async () => { setSalvandoCfg(true); try { const d = await post('/painel/config', cfg, 'PUT'); setCfg(d.config); showToast && showToast('Regras salvas · valem a partir da próxima importação', 'success'); } catch (e) { showToast && showToast(e.message, 'error'); } finally { setSalvandoCfg(false); } };

    if (!dados) return h(Spinner);
    const q = busca.trim().toLowerCase();
    const usuarios = dados.usuarios.filter((u) => (!soSem || !u.vinculos.length) && (!q || u.nome.toLowerCase().includes(q) || (u.cod_profissional || '').toLowerCase().includes(q) || u.vinculos.some((v) => v.identificador.toLowerCase().includes(q))));
    const formNovo = (u, tipo) => novo && novo.user_id === u.id && novo.tipo === tipo
      ? h('span', { className: 'inline-flex items-center gap-1.5 m-0.5' },
        h('input', { autoFocus: true, type: 'text', value: novo.valor, placeholder: tipo === 'ramal' ? 'tutsint-105 ou 105' : 'Nome como aparece no Digisac', 'aria-label': 'Novo identificador', onChange: (e) => setNovo({ ...novo, valor: e.target.value }), onKeyDown: (e) => { if (e.key === 'Enter' && novo.valor.trim()) criar(u.id, tipo, novo.valor.trim()); if (e.key === 'Escape') setNovo(null); }, className: 'text-xs border border-violet-500 rounded-lg px-2 py-1 w-44' }),
        h('button', { type: 'button', onClick: () => novo.valor.trim() && criar(u.id, tipo, novo.valor.trim()), className: 'text-xs bg-violet-600 text-white rounded-lg px-2 py-1 font-semibold' }, 'Adicionar'),
        h('button', { type: 'button', onClick: () => setNovo(null), className: 'text-xs text-gray-500 px-1' }, 'cancelar'))
      : h('button', { type: 'button', onClick: () => setNovo({ user_id: u.id, tipo, valor: '' }), className: 'inline-flex items-center text-xs rounded-full border border-dashed border-gray-300 text-gray-500 hover:border-violet-400 hover:text-violet-700 px-2.5 py-1 m-0.5' }, tipo === 'ramal' ? '+ ramal' : '+ nome');

    return h('div', { className: 'flex flex-col gap-4' },
      h('div', null, h('h2', { className: 'text-lg font-bold text-gray-900 m-0' }, 'Vínculos'), h('div', { className: 'text-[13px] text-gray-500 mt-0.5' }, 'Quem é quem: cada usuário admin pode ter um ou mais ramais do UserVoice e um ou mais nomes de atendente do Digisac. A comparação ignora acento e maiúsculas. Criar um vínculo é retroativo — métricas já importadas passam pra pessoa na hora.')),
      h('div', { className: 'grid grid-cols-1 xl:grid-cols-3 gap-3.5 items-start' },
        h(Card, { className: 'xl:col-span-2 flex flex-col gap-3' },
          h('div', { className: 'flex items-center justify-between gap-3 flex-wrap' },
            h('div', { className: 'font-bold text-[15px]' }, 'Usuários admin da Central ', h('span', { className: 'text-gray-500 font-normal text-[13px]' }, `· ${dados.usuarios.length} usuários · ${dados.usuarios.filter((u) => u.vinculos.length).length} com vínculo`)),
            h('div', { className: 'flex gap-2' }, h('input', { type: 'search', value: busca, onChange: (e) => setBusca(e.target.value), placeholder: 'Buscar usuário, ramal ou nome…', 'aria-label': 'Buscar', className: 'text-[13px] border border-gray-200 rounded-xl px-3 py-2 w-56' }), h(Botao, { onClick: () => setSoSem(!soSem), className: soSem ? '!bg-violet-50 !border-violet-300 !text-violet-800' : '' }, 'Só sem vínculo'))),
          h('div', { className: 'overflow-x-auto' }, h('table', { className: 'w-full text-[13px]' },
            h('thead', null, h('tr', { className: 'text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200' }, ['Usuário', 'Ramais UserVoice', 'Atendentes Digisac', 'Painel'].map((c) => h('th', { key: c, className: 'py-2 px-2.5 text-left font-semibold' }, c)))),
            h('tbody', null, usuarios.map((u) => {
              const ram = u.vinculos.filter((v) => v.tipo === 'ramal'), dg = u.vinculos.filter((v) => v.tipo === 'digisac');
              return h('tr', { key: u.id, className: 'border-b border-gray-50 align-top' },
                h('td', { className: 'py-3 px-2.5', style: { minWidth: 200 } }, h('div', { className: 'flex items-center gap-2.5' }, h(Avatar, { nome: u.nome, foto: u.foto_thumb, size: 32 }), h('div', null, h('div', { className: 'font-semibold' }, u.nome), h('div', { className: 'text-xs text-gray-500' }, `${u.cod_profissional || ''} · ${u.role === 'admin_master' ? 'master' : 'admin'}`)))),
                h('td', { className: 'py-3 px-2.5' }, ram.map((v) => h(Chip, { key: v.id, cor: 'ramal', onRemover: () => remover(v, u.nome) }, v.identificador)), formNovo(u, 'ramal')),
                h('td', { className: 'py-3 px-2.5' }, dg.map((v) => h(Chip, { key: v.id, cor: 'digisac', onRemover: () => remover(v, u.nome) }, v.identificador)), formNovo(u, 'digisac'), ram.length > 0 && !dg.length && h('div', { className: 'text-xs text-amber-700 mt-1' }, 'sem nome Digisac — chamados não caem nessa pessoa')),
                h('td', { className: 'py-3 px-2.5 whitespace-nowrap' }, u.vinculos.length ? (ram.length && dg.length ? h('span', { className: 'text-emerald-700 font-semibold' }, '✓ completo') : h('span', { className: 'text-amber-700 font-semibold' }, 'parcial')) : h('span', { className: 'text-gray-400' }, 'sem vínculo')));
            }))))),
        h('div', { className: 'flex flex-col gap-3.5' },
          h(Card, { className: 'flex flex-col gap-2.5', style: { borderTop: '4px solid #f59e0b' } },
            h('div', { className: 'font-bold text-[15px]' }, 'Apareceram nos CSVs e ninguém reclamou'),
            h('div', { className: 'text-xs text-gray-500' }, 'Identidades vistas nas importações que ainda não pertencem a nenhum usuário. Vincule, ignore (não é pessoa) ou descarte o aviso.'),
            !dados.pendentes.length ? h('div', { className: 'text-[13px] text-gray-500 bg-gray-50 rounded-xl px-3 py-2.5' }, 'Nenhuma pendência 🎉') : dados.pendentes.map((p) => h('div', { key: p.id, className: 'flex items-center justify-between gap-2 bg-amber-50 rounded-xl px-3 py-2 text-[13px]' },
              h('div', null, h(Chip, { cor: p.tipo }, p.identificador || '(vazio)'), h('div', { className: 'text-xs text-gray-500 mt-0.5' }, `${fmtNum(p.ocorrencias)} registro(s)${p.ultimo_visto ? ` · visto até ${fmtDataCurta(String(p.ultimo_visto).slice(0, 10))}` : ''}`)),
              h('select', { 'aria-label': 'Resolver', defaultValue: '', onChange: (e) => { const v = e.target.value; if (v === '__ign') ignorarPend(p); else if (v === '__desc') descartarPend(p); else if (v) criar(+v, p.tipo, p.identificador); e.target.value = ''; }, className: 'text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white max-w-[150px]' },
                h('option', { value: '' }, 'Vincular a…'), dados.usuarios.map((u) => h('option', { key: u.id, value: u.id }, u.nome)), h('option', { value: '__ign' }, 'Ignorar sempre'), h('option', { value: '__desc' }, 'Descartar aviso'))))),
          h(Card, { className: 'flex flex-col gap-2.5' },
            h('div', { className: 'font-bold text-[15px]' }, 'Ignorados de propósito'),
            h('div', { className: 'text-xs text-gray-500' }, 'Valores do campo "Atendente"/ramal que não são pessoa. Contam no total da equipe, nunca em alguém.'),
            h('div', null, dados.ignorados.map((g) => h(Chip, { key: g.id, onRemover: () => removerIgn(g), title: g.tipo }, `${g.identificador}`)))),
          cfg && h(Card, { className: 'flex flex-col gap-2.5' },
            h('div', { className: 'font-bold text-[15px]' }, 'Regras da importação'),
            h('div', { className: 'flex flex-col gap-2 text-[13px] text-gray-700' },
              h('label', { className: 'flex items-center justify-between gap-2' }, 'Expediente considerado', h('span', { className: 'flex items-center gap-1.5' }, h('input', { type: 'time', value: cfg.expediente_inicio, onChange: (e) => setCfg({ ...cfg, expediente_inicio: e.target.value }), className: 'border border-gray-200 rounded-lg px-1.5 py-1 text-[13px]' }), '→', h('input', { type: 'time', value: cfg.expediente_fim, onChange: (e) => setCfg({ ...cfg, expediente_fim: e.target.value }), className: 'border border-gray-200 rounded-lg px-1.5 py-1 text-[13px]' }))),
              h('label', { className: 'flex items-center justify-between gap-2' }, 'Ligação abandonada = só "Fila Padrão"', h('input', { type: 'checkbox', checked: cfg.abandonada_so_fila_padrao !== false, onChange: (e) => setCfg({ ...cfg, abandonada_so_fila_padrao: e.target.checked }) })),
              h('label', { className: 'flex items-center justify-between gap-2' }, 'Operador vê a média da equipe como referência', h('input', { type: 'checkbox', checked: cfg.operador_ve_media_equipe !== false, onChange: (e) => setCfg({ ...cfg, operador_ve_media_equipe: e.target.checked }) })),
              h('label', { className: 'flex items-center justify-between gap-2' }, 'Operador vê a própria posição no ranking', h('input', { type: 'checkbox', checked: cfg.operador_ve_ranking === true, onChange: (e) => setCfg({ ...cfg, operador_ve_ranking: e.target.checked }) }))),
            h('div', { className: 'text-[11px] text-gray-400' }, 'Expediente e abandonada valem para as próximas importações (os dias já importados mantêm a regra da época).'),
            h(Botao, { tipo: 'p', onClick: salvarCfg, disabled: salvandoCfg, className: 'self-end !py-2 !px-3.5 text-[13px]' }, salvandoCfg ? 'Salvando…' : 'Salvar regras')))));
  };

  // ════════════════════════════════════════════════════════════
  // RAIZ
  // ════════════════════════════════════════════════════════════
  const ABAS_MASTER = [['meu', 'Meu painel', 'chart'], ['equipe', 'Equipe', 'users'], ['importar', 'Importar métricas', 'upload'], ['vinculos', 'Vínculos', 'link'], ['historico', 'Histórico', 'calendar']];

  const ModuloPainel = ({ usuario, apiUrl, showToast, fetchAuth: fetchAuthExterno }) => {
    const api = apiUrl || window.API_URL || '';
    const fetchAuth = fetchAuthExterno || window.fetchAuth || fetch;
    const isMaster = usuario && usuario.role === 'admin_master';
    const [aba, setAba] = useState(isMaster ? 'equipe' : 'meu');
    const [me, setMe] = useState(null);
    const [verUser, setVerUser] = useState(null); // master "abrir painel"
    const [tick, setTick] = useState(0);
    useEffect(() => { (async () => { try { const r = await fetchAuth(`${api}/painel/me`); const d = await r.json(); if (d.success) setMe(d); } catch (_) {} })(); }, [api, tick]);

    const irPara = (a) => { setAba(a); setVerUser(null); };
    const props = { api, fetchAuth, showToast, usuario, me };
    let corpo;
    if (verUser) corpo = h(PainelOperador, { ...props, userId: verUser, onVoltar: () => setVerUser(null) });
    else if (aba === 'equipe') corpo = h(PainelEquipe, { ...props, onAbrir: (id) => setVerUser(id) });
    else if (aba === 'importar') corpo = h(PainelImportar, { ...props, onImportou: () => setTick((t) => t + 1) });
    else if (aba === 'vinculos') corpo = h(PainelVinculos, props);
    else if (aba === 'historico') corpo = h(PainelHistorico, { ...props, tick });
    else corpo = h(PainelOperador, props);

    return h('div', { className: 'max-w-[1320px] mx-auto px-4 sm:px-6 py-5 flex flex-col gap-4', style: { fontFamily: 'inherit' } },
      h('div', { className: 'flex items-center gap-2.5' },
        h('span', { className: 'w-9 h-9 rounded-xl bg-violet-100 text-violet-700 inline-flex items-center justify-center' }, ico('trendup', '', { width: 18, height: 18 })),
        h('h1', { className: 'text-xl font-bold text-gray-900 m-0' }, 'Meu Painel'),
        isMaster && h(Tag, { cor: 'amarelo' }, 'master')),
      isMaster && h('div', { className: 'flex border-b border-gray-200 gap-1 overflow-x-auto' }, ABAS_MASTER.map(([id, label, icone]) => h('button', { key: id, type: 'button', onClick: () => irPara(id), className: `inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px ${aba === id && !verUser ? 'border-violet-600 text-violet-700 font-semibold' : 'border-transparent text-gray-600 hover:text-gray-900'}` }, ico(icone, '', { width: 14, height: 14 }), label))),
      corpo);
  };

  window.ModuloPainel = ModuloPainel;
})();
