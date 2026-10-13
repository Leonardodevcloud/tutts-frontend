/* DEEMOJI_V1 */
// modulo-diaria.js — Painel ADMIN da Diária (sub-aba das filas) · DIARIA_FECHAMENTO_V1: + fechamento do dia
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


  // ════════════════════════════════════════════════════════════════════
  // DIARIA_FECHAMENTO_V1 — Fechamento do dia para o financeiro
  // Cruza quem entrou na fila (diária travada no ingresso) com o que rodou no
  // BI. Corrida em aberto = ainda tem operação → paga. Parou cedo / não rodou →
  // decisão (sugestão já marcada). Fechar grava um recibo (snapshot).
  // ════════════════════════════════════════════════════════════════════
  const SIT = {
    fim:    { bg: '#dcfce7', fg: '#166534' },
    atraso: { bg: '#fef3c7', fg: '#92400e' },
    meio:   { bg: '#ede9fe', fg: '#5b21b6' },
    cedo:   { bg: '#ffedd5', fg: '#9a3412' },
    aberta: { bg: '#dbeafe', fg: '#1e40af' },
    sem:    { bg: '#fee2e2', fg: '#991b1b' },
    longe:  { bg: '#ccfbf1', fg: '#115e59' }, // DIARIA_ENCERROU_LONGE_V1
    ausente:{ bg: '#fce7f3', fg: '#9d174d' }, // DIARIA_DISPONIBILIDADE_V1
  };
  function hojeBahia() { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bahia' }); }
  function dataBR(iso) { const p = String(iso || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso; }
  function nomeDe(it) { return it.nome_profissional || ('Cód. ' + it.cod_profissional); }
  function valorEscolhido(it, escolha) {
    if (it.decisao === 'pagar') return { regra: 'pagar', valor: it.valor_entrada };
    const e2 = escolha || it.sugerido;
    if (e2 === 'integral') return { regra: 'integral', valor: it.valor_entrada };
    if (e2 === 'proporcional' && it.valor_proporcional !== null && it.valor_proporcional !== undefined) return { regra: 'proporcional', valor: it.valor_proporcional };
    return { regra: 'nao', valor: 0 };
  }
  function rotuloRegra(it) {
    const r = it.regra_final;
    if (r === 'integral') return { txt: 'Integral (decisão)', bg: '#dcfce7', fg: '#166534' };
    if (r === 'proporcional') return { txt: 'Proporcional · ' + (it.nota || ''), bg: '#ffedd5', fg: '#9a3412' };
    if (r === 'nao') return { txt: 'Não pago', bg: '#fee2e2', fg: '#991b1b' };
    if (it.minutos_atraso > 0) return { txt: it.nota, bg: '#fef3c7', fg: '#92400e' };
    if (it.situacao === 'aberta') return { txt: 'Integral · corrida em execução', bg: '#dbeafe', fg: '#1e40af' };
    if (it.situacao === 'longe') return { txt: 'Integral · encerrou longe (' + it.nota + ')', bg: '#ccfbf1', fg: '#115e59' };
    return { txt: 'Integral', bg: '#dcfce7', fg: '#166534' };
  }
  function Ico({ d, size }) {
    return e('svg', { width: size || 16, height: size || 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' },
      (Array.isArray(d) ? d : [d]).map((x, i) => e('path', { key: i, d: x })));
  }
  function Card({ titulo, cor, valor, sub, escuro }) {
    return e('div', { className: 'rounded-xl p-4 flex flex-col gap-1 ' + (escuro ? 'text-white' : 'bg-white border border-gray-200'), style: escuro ? { background: '#4c1d95' } : null },
      e('span', { className: 'text-xs font-semibold flex items-center gap-1.5', style: escuro ? { opacity: .9 } : { color: cor } },
        !escuro && e('span', { style: { width: 8, height: 8, borderRadius: '50%', background: cor, display: 'inline-block' } }), titulo),
      e('span', { className: 'text-2xl font-extrabold' }, valor),
      e('span', { className: 'text-xs', style: escuro ? { opacity: .9 } : { color: '#4b5563' } }, sub));
  }

  function FechamentoDiaria({ apiUrl, fetchAuth, showToast, centralId, dataInicial }) {
    const [data, setData] = React.useState(() => dataInicial || hojeBahia());
    const [dados, setDados] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [decisoes, setDecisoes] = React.useState({});
    const [filtro, setFiltro] = React.useState('todos');
    const [job, setJob] = React.useState(null); // {id, status, progresso}
    const [ocupado, setOcupado] = React.useState(false);
    const pollRef = React.useRef(null);

    const carregar = React.useCallback(async (dt) => {
      if (!centralId) return;
      setLoading(true);
      try {
        const r = await fetchAuth(`${apiUrl}/diaria/fechamento/${centralId}?data=${dt || data}`);
        const d = await r.json();
        if (!r.ok) { showToast && showToast(d.erro || 'Erro ao carregar o fechamento', 'error'); setDados(null); return; }
        setDados(d);
        if (!d.fechado && d.job_ativo) acompanhar(d.job_ativo);
      } catch (_) { showToast && showToast('Erro ao carregar o fechamento', 'error'); }
      finally { setLoading(false); }
    }, [apiUrl, centralId, data]);

    React.useEffect(() => { setDecisoes({}); carregar(data); }, [data, carregar]);
    React.useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

    function acompanhar(jobId) {
      if (pollRef.current) clearInterval(pollRef.current);
      setJob({ id: jobId, status: 'pendente', progresso: 0 });
      pollRef.current = setInterval(async () => {
        try {
          const r = await fetchAuth(`${apiUrl}/diaria/fechamento-job/${jobId}`);
          if (!r.ok) return;
          const j = await r.json();
          setJob(j);
          if (j.status === 'sucesso' || j.status === 'falhou') {
            clearInterval(pollRef.current); pollRef.current = null;
            if (j.status === 'sucesso') { showToast && showToast('Dados atualizados', 'success'); carregar(); }
            else showToast && showToast('A atualização falhou: ' + (j.erro || 'tente de novo'), 'error');
            setTimeout(() => setJob(null), 1500);
          }
        } catch (_) {}
      }, 5000);
    }

    const atualizar = async () => {
      try {
        const r = await fetchAuth(`${apiUrl}/diaria/fechamento/${centralId}/atualizar`, { method: 'POST', body: JSON.stringify({ data }) });
        const d = await r.json();
        if (!r.ok) { showToast && showToast(d.erro || 'Erro ao atualizar', 'error'); return; }
        showToast && showToast(d.ja_existia ? 'Já tem uma atualização desse dia rodando — acompanhando' : 'Atualização pedida — leva uns 3 a 5 minutos', 'success');
        acompanhar(d.job_id);
      } catch (_) { showToast && showToast('Erro ao atualizar', 'error'); }
    };

    const salvarLimiar = async (v, campo) => {
      const n = parseInt(v, 10);
      const chave = campo === 'velocidade' ? 'velocidade' : (campo === 'ausencia' ? 'ausencia' : 'minutos');
      const atual = campo === 'velocidade' ? (dados && dados.velocidade_retorno) : (campo === 'ausencia' ? (dados && dados.limiar_ausencia) : (dados && dados.limiar_parou_cedo));
      if (!Number.isFinite(n) || !dados || n === atual) return;
      try {
        const r = await fetchAuth(`${apiUrl}/diaria/fechamento/${centralId}/limiar`, { method: 'PUT', body: JSON.stringify({ [chave]: n }) });
        const d = await r.json();
        if (r.ok) carregar(); else showToast && showToast(d.erro || 'Erro', 'error');
      } catch (_) {}
    };

    const fechar = async (total, qtd) => {
      if (!window.confirm(`Fechar a diária de ${dataBR(data)}?\n\n${qtd} motoboys · ${brl(total)}\n\nO resumo fica gravado e vai para o financeiro.`)) return;
      setOcupado(true);
      try {
        const r = await fetchAuth(`${apiUrl}/diaria/fechamento/${centralId}/fechar`, { method: 'POST', body: JSON.stringify({ data, decisoes }) });
        const d = await r.json();
        if (!r.ok) { showToast && showToast(d.erro || 'Erro ao fechar', 'error'); return; }
        showToast && showToast('Dia fechado — ' + brl(d.total), 'success');
        carregar();
      } catch (_) { showToast && showToast('Erro ao fechar', 'error'); }
      finally { setOcupado(false); }
    };

    const acaoRecibo = async (acao) => {
      const f = dados && dados.fechamento;
      if (!f) return;
      if (acao === 'reabrir' && !window.confirm('Reabrir o fechamento? O resumo gravado é apagado e o dia volta a ser calculado ao vivo.')) return;
      if (acao === 'pago' && !window.confirm(`Marcar ${brl(f.total)} como pago?`)) return;
      setOcupado(true);
      try {
        const r = await fetchAuth(`${apiUrl}/diaria/fechamento-registro/${f.id}/${acao}`, { method: 'POST', body: '{}' });
        const d = await r.json();
        if (!r.ok) { showToast && showToast(d.erro || 'Erro', 'error'); return; }
        showToast && showToast(acao === 'pago' ? 'Marcado como pago' : 'Fechamento reaberto', 'success');
        carregar();
      } catch (_) { showToast && showToast('Erro', 'error'); }
      finally { setOcupado(false); }
    };

    const cabecalho = e('div', { className: 'bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-center gap-4' },
      e('div', { className: 'flex-1 min-w-[260px]' },
        e('div', { className: 'flex items-center gap-2' },
          e('div', { className: 'font-bold text-gray-800' }, dados && dados.fechado ? 'Pagamento da diária' : 'Fechamento da diária'),
          dados && e('span', {
            className: 'text-[10px] font-bold px-2 py-0.5 rounded-full',
            style: dados.fechado
              ? (dados.fechamento.status === 'pago' ? { background: '#dcfce7', color: '#166534' } : { background: '#ede9fe', color: '#5b21b6' })
              : { background: '#fef3c7', color: '#92400e' }
          }, dados.fechado ? (dados.fechamento.status === 'pago' ? 'PAGO' : 'ENVIADO AO FINANCEIRO') : 'ABERTO')),
        e('div', { className: 'text-xs text-gray-600 mt-1 leading-relaxed' },
          dados && dados.fechado
            ? ((dados.central_nome || '') + ' · ' + dataBR(data) + ' · fechado por ' + (dados.fechamento.fechado_por || '-') + ' em ' + (dados.fechamento.fechado_em || '-')
              + (dados.fechamento.dados_de ? ' · dados de ' + dados.fechamento.dados_de : '')
              + (dados.fechamento.status === 'pago' ? ' · pago por ' + (dados.fechamento.pago_por || '-') + ' em ' + (dados.fechamento.pago_em || '-') : ''))
            : (dados ? ('Quem rodou, até que horas e quanto recebe. Escala padrão ' + dados.escala_padrao + ' · ' + brl(dados.valor_padrao) + '.') : ''))),
      e('div', { className: 'flex flex-col gap-1' },
        e('label', { className: 'text-[11px] text-gray-500', htmlFor: 'diaria-fech-data' }, 'Dia'),
        e('input', { id: 'diaria-fech-data', type: 'date', value: data, max: hojeBahia(), onChange: (ev) => setData(ev.target.value), className: 'px-2 py-2 border rounded-lg text-sm' })),
      dados && !dados.fechado && e('div', { className: 'flex flex-col items-end gap-1' },
        job
          ? e('div', { className: 'flex flex-col items-end gap-1', role: 'status' },
              e('span', { className: 'text-xs font-semibold text-purple-700' }, 'Atualizando dados do BI… ' + (Number(job.progresso) || 0) + '%'),
              e('div', { style: { width: 220, height: 6, borderRadius: 999, background: '#ede9fe', overflow: 'hidden' } },
                e('div', { style: { width: (Number(job.progresso) || 3) + '%', height: '100%', background: '#7c3aed', transition: 'width .4s' } })))
          : e('button', { onClick: atualizar, className: 'h-10 px-4 rounded-lg border border-purple-600 text-purple-700 text-sm font-semibold hover:bg-purple-50 inline-flex items-center gap-2' },
              e(Ico, { d: ['M21 12a9 9 0 1 1-2.6-6.4', 'M21 3v6h-6'] }), 'Atualizar dados agora'),
        e('span', { className: 'text-xs text-gray-600' }, dados.dados_de_txt ? ('Dados do BI de ' + dados.dados_de_txt) : 'Sem importação do BI nesse dia ainda'))
    );

    if (loading && !dados) return e('div', { className: 'text-center py-10 text-gray-400 text-sm' }, 'Carregando fechamento...');
    if (!dados) return e('div', { className: 'space-y-4' }, cabecalho);

    // ─────────────── RECIBO (dia fechado) ───────────────
    if (dados.fechado) {
      const f = dados.fechamento;
      const itens = Array.isArray(f.itens) ? f.itens : [];
      const pagos = itens.filter((x) => Number(x.valor_final) > 0).sort((a, b) => b.valor_final - a.valor_final);
      const fora = itens.filter((x) => !(Number(x.valor_final) > 0));
      const integrais = pagos.filter((x) => Number(x.valor_final) >= Number(x.valor_base) - 0.005);
      const parciais = pagos.filter((x) => Number(x.valor_final) < Number(x.valor_base) - 0.005);
      const soma = (l) => l.reduce((s, x) => s + Number(x.valor_final || 0), 0);
      const msg = ['*Diária ' + (dados.central_nome || '') + ' · ' + dataBR(data).slice(0, 5) + '*']
        .concat(pagos.map((x) => nomeDe(x) + ' (' + x.cod_profissional + ') — ' + brl(x.valor_final)))
        .concat(['*Total: ' + brl(f.total) + '* (' + pagos.length + (pagos.length === 1 ? ' motoboy)' : ' motoboys)')])
        .concat(fora.length ? ['Não pagos: ' + fora.map((x) => nomeDe(x) + ' (' + x.cod_profissional + ')').join(', ')] : [])
        .join('\n');
      const copiar = async () => {
        try { await navigator.clipboard.writeText(msg); showToast && showToast('Resumo copiado', 'success'); }
        catch (_) { showToast && showToast('Não deu pra copiar — selecione o texto da mensagem', 'error'); }
      };
      const baixar = () => {
        const linhas = [['Motoboy', 'Código', 'Entrada', 'Última finalização', 'Corridas', 'Regra', 'Valor']]
          .concat(itens.map((x) => [nomeDe(x), x.cod_profissional, x.entrada || '', x.ultima_finalizacao || '', x.corridas, rotuloRegra(x).txt, String(Number(x.valor_final || 0).toFixed(2)).replace('.', ',')]));
        const csv = '﻿' + linhas.map((l) => l.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(';')).join('\r\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        a.download = 'diaria-' + String(dados.central_nome || centralId).replace(/[^\w-]+/g, '_') + '-' + data + '.csv';
        document.body.appendChild(a); a.click(); a.remove();
      };
      return e('div', { className: 'space-y-4' },
        cabecalho,
        e('div', { className: 'flex flex-wrap gap-2 justify-end' },
          e('button', { onClick: copiar, className: 'h-10 px-4 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50' }, 'Copiar resumo'),
          e('button', { onClick: baixar, className: 'h-10 px-4 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50' }, 'Baixar planilha'),
          f.status === 'fechado' && e('button', { onClick: () => acaoRecibo('reabrir'), disabled: ocupado, className: 'h-10 px-4 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50' }, 'Reabrir'),
          f.status === 'fechado' && e('button', { onClick: () => acaoRecibo('pago'), disabled: ocupado, className: 'h-10 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold' }, 'Marcar como pago')),
        e('div', { className: 'grid gap-3', style: { gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' } },
          e(Card, { escuro: true, titulo: f.status === 'pago' ? 'Total pago' : 'Total a pagar', valor: brl(f.total), sub: pagos.length + (pagos.length === 1 ? ' motoboy' : ' motoboys') }),
          e(Card, { titulo: 'Integral', cor: '#166534', valor: integrais.length, sub: brl(soma(integrais)) }),
          e(Card, { titulo: 'Proporcional', cor: '#9a3412', valor: parciais.length, sub: brl(soma(parciais)) }),
          e(Card, { titulo: 'Não pagos', cor: '#991b1b', valor: fora.length, sub: fora.length ? 'veja abaixo' : 'ninguém' })),
        e('div', { className: 'bg-white border border-gray-200 rounded-xl overflow-hidden' },
          e('div', { className: 'px-4 py-3 border-b border-gray-100 font-bold text-gray-800 text-sm' }, 'Quem recebe e quanto'),
          e('div', { style: { overflowX: 'auto' } },
            e('table', { className: 'w-full text-sm', style: { minWidth: 760, borderCollapse: 'collapse' } },
              e('thead', null, e('tr', { className: 'bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-600' },
                ['Motoboy', 'Cód.', 'Rodou', 'Corridas', 'Regra', 'Valor'].map((h, i) => e('th', { key: h, className: 'px-4 py-2 font-semibold' + (i === 5 ? ' text-right' : '') }, h)))),
              e('tbody', null,
                pagos.map((x) => {
                  const rg = rotuloRegra(x);
                  return e('tr', { key: x.cod_profissional, className: 'border-t border-gray-100' },
                    e('td', { className: 'px-4 py-2.5 font-semibold text-gray-800' }, nomeDe(x)),
                    e('td', { className: 'px-4 py-2.5 text-gray-600 tabular-nums' }, x.cod_profissional),
                    e('td', { className: 'px-4 py-2.5 tabular-nums' }, (x.entrada || '--:--') + ' → ' + (x.situacao === 'aberta' ? 'em execução' : (x.ultima_finalizacao || '--:--'))),
                    e('td', { className: 'px-4 py-2.5 tabular-nums' }, x.corridas + (x.abertas ? ' + ' + x.abertas : '')),
                    e('td', { className: 'px-4 py-2.5' }, e('span', { className: 'text-xs font-semibold px-2 py-0.5 rounded-full', style: { background: rg.bg, color: rg.fg } }, rg.txt)),
                    e('td', { className: 'px-4 py-2.5 text-right font-bold tabular-nums' }, brl(x.valor_final)));
                }),
                e('tr', { className: 'bg-gray-50', style: { borderTop: '2px solid #e5e7eb' } },
                  e('td', { className: 'px-4 py-3 font-extrabold', colSpan: 5 }, 'Total'),
                  e('td', { className: 'px-4 py-3 text-right font-extrabold tabular-nums' }, brl(f.total))))))),
        e('div', { className: 'grid gap-3', style: { gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' } },
          e('div', { className: 'bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-2' },
            e('div', { className: 'font-bold text-gray-800 text-sm' }, 'Fora deste pagamento'),
            fora.length === 0
              ? e('div', { className: 'text-xs text-gray-500' }, 'Todo mundo que entrou na fila recebe.')
              : fora.map((x) => e('div', { key: x.cod_profissional, className: 'rounded-lg px-3 py-2 text-sm', style: { background: '#fef2f2' } },
                  e('b', null, nomeDe(x)), ' · cód. ' + x.cod_profissional, e('br'),
                  e('span', { className: 'text-xs text-gray-700' }, (x.situacao === 'sem' ? 'Entrou na fila ' + (x.entrada || '') + ' e não fez corrida.' : 'Última finalização ' + (x.ultima_finalizacao || '--:--') + '.') + ' Decisão: não pagar.')))),
          e('div', { className: 'bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-2' },
            e('div', { className: 'flex items-center gap-2' },
              e('span', { className: 'font-bold text-gray-800 text-sm' }, 'Mensagem pronta'),
              e('span', { className: 'text-xs text-gray-500' }, 'para colar no WhatsApp do financeiro')),
            e('pre', { className: 'm-0 p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs leading-relaxed whitespace-pre-wrap text-gray-800', style: { fontFamily: 'ui-monospace, Menlo, monospace' } }, msg)))
      );
    }

    // ─────────────── AO VIVO (dia aberto) ───────────────
    const itens = dados.itens || [];
    const comValor = itens.map((it) => ({ it, ...valorEscolhido(it, decisoes[it.cod_profissional]) }));
    const prontos = itens.filter((x) => x.decisao === 'pagar' && x.situacao !== 'aberta');
    const abertos = itens.filter((x) => x.situacao === 'aberta');
    const decidir = itens.filter((x) => x.decisao === 'decidir');
    const cedo = decidir.filter((x) => x.situacao === 'cedo').length;
    const ausentes = decidir.filter((x) => x.situacao === 'ausente').length;
    const total = comValor.reduce((s, x) => s + Number(x.valor || 0), 0);
    const qtdPagos = comValor.filter((x) => x.valor > 0).length;
    const lista = itens.filter((x) => filtro === 'todos'
      || (filtro === 'decidir' && x.decisao === 'decidir')
      || (filtro === 'aberta' && x.situacao === 'aberta')
      || (filtro === 'prontos' && x.decisao === 'pagar' && x.situacao !== 'aberta'));
    const pilula = (val, txt) => e('button', {
      key: val, onClick: () => setFiltro(val), 'aria-pressed': filtro === val,
      className: 'h-8 px-3 rounded-full text-xs ' + (filtro === val ? 'border border-purple-600 bg-purple-50 text-purple-800 font-semibold' : 'border border-gray-200 bg-white text-gray-600')
    }, txt);
    const escolhaBtn = (it, val, txt, ativoBg) => {
      const atual = decisoes[it.cod_profissional] || it.sugerido;
      const ativo = atual === val;
      return e('button', {
        key: val, role: 'radio', 'aria-checked': ativo,
        onClick: () => setDecisoes((d) => ({ ...d, [it.cod_profissional]: val })),
        className: 'h-8 px-2.5 text-xs border-l border-gray-300 first:border-l-0 ' + (ativo ? 'font-semibold' : ''),
        style: ativo ? { background: ativoBg, color: '#fff' } : { background: '#fff', color: '#374151' }
      }, txt);
    };

    return e('div', { className: 'space-y-4' },
      cabecalho,
      !dados.diaria_ativa && e('div', { className: 'bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800' }, 'A diária está desligada nesta central — o fechamento mostra só os registros que existirem nesse dia.'),
      e('div', { className: 'grid gap-3', style: { gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' } },
        e(Card, { titulo: 'Prontos para pagar', cor: '#16a34a', valor: prontos.length, sub: brl(prontos.reduce((s, x) => s + x.valor_entrada, 0)) + (prontos.some((x) => x.situacao === 'longe') ? ' · ' + prontos.filter((x) => x.situacao === 'longe').length + ' encerraram longe' : '') }),
        e(Card, { titulo: 'Precisam de decisão', cor: '#ea580c', valor: decidir.length, sub: decidir.length ? [cedo ? cedo + ' parou cedo' : null, ausentes ? ausentes + ' ausente no meio do dia' : null, (decidir.length - cedo - ausentes) ? (decidir.length - cedo - ausentes) + ' não rodou' : null].filter(Boolean).join(' · ') : 'nenhuma' }),
        e(Card, { titulo: 'Com corrida em aberto', cor: '#2563eb', valor: abertos.length, sub: abertos.length ? 'ainda rodando — entram pagos' : 'nenhuma' }),
        e(Card, { escuro: true, titulo: 'Total a pagar', valor: brl(total), sub: itens.length + (itens.length === 1 ? ' motoboy na fila' : ' motoboys na fila') })),
      e('div', { className: 'bg-white border border-gray-200 rounded-xl overflow-hidden' },
        e('div', { className: 'px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2' },
          e('span', { className: 'font-bold text-gray-800 text-sm mr-1' }, 'Motoboys do dia'),
          pilula('todos', 'Todos ' + itens.length), pilula('decidir', 'Precisam de decisão ' + decidir.length),
          pilula('aberta', 'Em aberto ' + abertos.length), pilula('prontos', 'Prontos ' + prontos.length),
          e('span', { className: 'ml-auto text-xs text-gray-600 flex items-center gap-1.5' },
            '“Parou cedo” = última finalização mais de',
            e('input', { 'aria-label': 'Minutos antes da saída', type: 'number', min: 0, max: 600, defaultValue: dados.limiar_parou_cedo, key: 'lim' + dados.limiar_parou_cedo,
              onBlur: (ev) => salvarLimiar(ev.target.value), className: 'w-14 h-7 border border-gray-300 rounded text-center text-xs' }),
            'min antes da ' + (dados.eh_hoje && dados.referencia && dados.referencia < dados.escala_padrao.slice(6) ? 'hora atual' : 'saída') + ' · volta à base a',
            // DIARIA_ENCERROU_LONGE_V1: quem finalizou longe e não voltaria a tempo não é "parou cedo"
            e('input', { 'aria-label': 'Velocidade média de volta à base (km/h)', type: 'number', min: 5, max: 80, defaultValue: dados.velocidade_retorno, key: 'vel' + dados.velocidade_retorno,
              title: dados.base_tem_coordenada ? 'Distância: da última entrega até a base da central (linha reta × 1,3)' : 'A central não tem coordenada cadastrada — usa a km da própria entrega',
              onBlur: (ev) => salvarLimiar(ev.target.value, 'velocidade'), className: 'w-14 h-7 border border-gray-300 rounded text-center text-xs' }),
            'km/h · ausência no meio do dia acima de',
            // DIARIA_DISPONIBILIDADE_V1: fora da fila e fora de corrida, somado, antes da última atividade
            e('input', { 'aria-label': 'Minutos de ausência no meio do dia', type: 'number', min: 0, max: 600, defaultValue: dados.limiar_ausencia, key: 'aus' + dados.limiar_ausencia,
              title: 'Soma do tempo fora da fila e fora de corrida (descontando a volta até a base). 0 desliga.',
              onBlur: (ev) => salvarLimiar(ev.target.value, 'ausencia'), className: 'w-14 h-7 border border-gray-300 rounded text-center text-xs' }),
            'min vira decisão')),
        itens.length === 0
          ? e('div', { className: 'text-center py-8 text-gray-400 text-sm' }, 'Ninguém entrou na fila com diária nesse dia.')
          : e('div', { style: { overflowX: 'auto' } },
              e('table', { className: 'w-full text-sm', style: { minWidth: 1000, borderCollapse: 'collapse' } },
                e('thead', null, e('tr', { className: 'bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-600' },
                  ['Motoboy', 'Entrou', 'Corridas', 'Última finalização', 'Em aberto', 'Situação', 'Diária', 'Decisão'].map((h, i) =>
                    e('th', { key: h, className: 'px-4 py-2 font-semibold' + (i === 6 ? ' text-right' : '') }, h)))),
                e('tbody', null, lista.map((it) => {
                  const cv = valorEscolhido(it, decisoes[it.cod_profissional]);
                  const sit = SIT[it.situacao] || SIT.fim;
                  return e('tr', { key: it.cod_profissional, className: 'border-t border-gray-100 align-top', style: it.decisao === 'decidir' ? { background: '#fffbf5' } : null },
                    e('td', { className: 'px-4 py-3' },
                      e('div', { className: 'font-semibold text-gray-800' }, nomeDe(it)),
                      e('div', { className: 'text-xs text-gray-500' }, 'cód. ' + it.cod_profissional + (it.da_escala ? ' · escala ' + it.escala : ''))),
                    e('td', { className: 'px-4 py-3 tabular-nums' },
                      e('div', { className: 'font-semibold' }, it.entrada || '--:--'),
                      e('div', { className: 'text-xs', style: { color: it.minutos_atraso > 0 ? '#92400e' : '#6b7280' } }, it.minutos_atraso > 0 ? it.minutos_atraso + ' min de atraso' : 'no horário')),
                    e('td', { className: 'px-4 py-3 tabular-nums' },
                      e('div', { className: 'font-semibold' }, it.corridas + (it.abertas ? ' + ' + it.abertas : '')),
                      e('div', { className: 'text-xs text-gray-500' }, it.abertas ? it.abertas + ' em execução' : (it.corridas ? 'finalizadas' : 'nenhuma corrida'))),
                    e('td', { className: 'px-4 py-3 tabular-nums' },
                      e('div', { className: 'font-semibold' }, it.ultima_finalizacao || '—'),
                      e('div', { className: 'text-xs', style: { color: it.situacao === 'cedo' ? '#9a3412' : '#6b7280' } }, it.ultima_nota || ''),
                      it.km_volta !== null && it.km_volta !== undefined && it.situacao !== 'aberta' && e('div', { className: 'text-xs', style: { color: it.situacao === 'longe' ? '#115e59' : '#6b7280' } },
                        '~' + Math.round(it.km_volta) + ' km da base' + (it.retorno_estimado ? ' · voltaria ~' + it.retorno_estimado : ''))),
                    e('td', { className: 'px-4 py-3' },
                      it.os_aberta
                        ? e('div', null, e('div', { className: 'font-semibold', style: { color: '#1e40af' } }, 'OS ' + it.os_aberta),
                            e('div', { className: 'text-xs', style: { color: '#1e40af' } }, it.aberta_desde ? 'desde ' + it.aberta_desde : 'em execução'))
                        : e('span', { className: 'text-gray-400' }, '—')),
                    e('td', { className: 'px-4 py-3' },
                      e('span', { className: 'text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap', style: { background: sit.bg, color: sit.fg } }, it.rotulo),
                      // DIARIA_DISPONIBILIDADE_V1: quando ele ficou fora (sem fila e sem corrida)
                      Array.isArray(it.buracos) && it.buracos.length > 0 && e('div', { className: 'text-xs mt-1', style: { color: it.situacao === 'ausente' ? '#9d174d' : '#6b7280' } },
                        'fora ' + it.buracos.map((b) => b.de + '–' + b.ate).join(', '))),
                    e('td', { className: 'px-4 py-3 text-right tabular-nums' },
                      e('div', { className: 'font-bold' }, brl(cv.valor)),
                      e('div', { className: 'text-xs text-gray-500' }, it.decisao === 'pagar' ? it.nota : (cv.regra === 'proporcional' ? it.nota : (cv.regra === 'integral' ? 'integral' : 'não pago')))),
                    e('td', { className: 'px-4 py-2.5' },
                      it.decisao === 'pagar'
                        ? e('span', { className: 'inline-flex items-center gap-1.5 text-sm font-semibold', style: { color: it.situacao === 'aberta' ? '#1e40af' : '#166534' } },
                            e(Ico, { d: 'M20 6 9 17l-5-5' }), it.situacao === 'aberta' ? 'Pagar (ainda rodando)' : 'Pagar')
                        : e('div', { role: 'radiogroup', 'aria-label': 'Decisão da diária de ' + nomeDe(it), className: 'inline-flex border border-gray-300 rounded-lg overflow-hidden' },
                            escolhaBtn(it, 'integral', 'Integral', '#16a34a'),
                            (it.situacao === 'cedo' || it.situacao === 'ausente') && escolhaBtn(it, 'proporcional', 'Proporcional', '#7c3aed'),
                            escolhaBtn(it, 'nao', 'Não pagar', '#b91c1c'))));
                }))))),
      itens.length > 0 && e('div', { className: 'bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-center gap-3' },
        e('div', { className: 'flex-1 min-w-[280px]' },
          e('div', { className: 'font-bold text-gray-800 text-sm' }, 'Fechar o dia e mandar para o financeiro'),
          e('div', { className: 'text-xs text-gray-600 mt-0.5 leading-relaxed' },
            (decidir.length ? decidir.length + (decidir.length === 1 ? ' decisão usa' : ' decisões usam') + ' a sugestão marcada, a menos que você mude. ' : '')
            + (abertos.length ? abertos.length + ' com corrida em aberto entra' + (abertos.length === 1 ? '' : 'm') + ' pago' + (abertos.length === 1 ? '' : 's') + ' — ainda tem operação. ' : '')
            + 'O resumo fica gravado e não muda se o BI mudar depois.')),
        e('button', {
          onClick: () => fechar(total, qtdPagos), disabled: ocupado || !!job,
          className: 'h-11 px-5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-bold inline-flex items-center gap-2'
        }, e(Ico, { d: ['M22 2 11 13', 'M22 2 15 22l-4-9-9-4z'] }), 'Fechar e enviar ao financeiro · ' + brl(total)))
    );
  }

  function HistoricoDiaria({ apiUrl, fetchAuth, centralId, onAbrir }) {
    const [lista, setLista] = React.useState(null);
    React.useEffect(() => {
      (async () => {
        try {
          const r = await fetchAuth(`${apiUrl}/diaria/fechamentos/${centralId}`);
          const d = await r.json();
          setLista(r.ok ? (d.fechamentos || []) : []);
        } catch (_) { setLista([]); }
      })();
    }, [apiUrl, centralId]);
    if (lista === null) return e('div', { className: 'text-center py-10 text-gray-400 text-sm' }, 'Carregando histórico...');
    return e('div', { className: 'bg-white border border-gray-200 rounded-xl overflow-hidden' },
      e('div', { className: 'px-4 py-3 border-b border-gray-100 font-bold text-gray-800 text-sm' }, 'Histórico de pagamentos'),
      lista.length === 0
        ? e('div', { className: 'text-center py-8 text-gray-400 text-sm' }, 'Nenhum dia fechado ainda nesta central.')
        : lista.map((x) => e('button', {
            key: x.id, onClick: () => onAbrir(x.data_ref),
            className: 'w-full text-left px-4 py-3 border-t border-gray-100 first:border-t-0 hover:bg-gray-50 flex flex-wrap items-center gap-3'
          },
            e('span', { className: 'font-semibold text-gray-800 tabular-nums', style: { minWidth: 96 } }, dataBR(x.data_ref)),
            e('span', { className: 'text-[10px] font-bold px-2 py-0.5 rounded-full', style: x.status === 'pago' ? { background: '#dcfce7', color: '#166534' } : { background: '#ede9fe', color: '#5b21b6' } }, x.status === 'pago' ? 'PAGO' : 'A PAGAR'),
            e('span', { className: 'text-xs text-gray-600 flex-1' }, x.qtd_pagos + ' motoboys · fechado por ' + (x.fechado_por || '-') + ' em ' + (x.fechado_em || '-') + (x.pago_em ? ' · pago em ' + x.pago_em : '')),
            e('span', { className: 'font-bold text-gray-800 tabular-nums' }, brl(x.total))))
    );
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
    const [sub, setSub] = React.useState('config'); // DIARIA_FECHAMENTO_V1: config | fechamento | historico
    const [dataFech, setDataFech] = React.useState(null);

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

    // DIARIA_FECHAMENTO_V1: sub-abas da Diária
    const subTab = (val, txt) => e('button', {
      key: val, role: 'tab', 'aria-selected': sub === val, onClick: () => { setSub(val); if (val !== 'fechamento') setDataFech(null); },
      className: 'h-9 px-4 rounded-full text-sm ' + (sub === val ? 'bg-purple-600 text-white font-semibold border border-purple-600' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50')
    }, txt);
    const abas = e('div', { role: 'tablist', 'aria-label': 'Diária', className: 'flex flex-wrap gap-2' },
      subTab('config', 'Configuração e escala'), subTab('fechamento', 'Fechamento do dia'), subTab('historico', 'Histórico de pagamentos'));
    if (sub === 'fechamento') return e('div', { className: 'space-y-4' }, abas,
      e(FechamentoDiaria, { key: 'f' + (dataFech || ''), apiUrl, fetchAuth, showToast, centralId, dataInicial: dataFech }));
    if (sub === 'historico') return e('div', { className: 'space-y-4' }, abas,
      e(HistoricoDiaria, { apiUrl, fetchAuth, centralId, onAbrir: (d) => { setDataFech(d); setSub('fechamento'); } }));

    return e('div', { className: 'space-y-4' },
      abas,

      // ── CONFIG (o PADRÃO) ──
      e('div', { className: 'bg-white border border-gray-200 rounded-xl p-4' },
        e('div', { className: 'flex items-center justify-between pb-3 border-b border-gray-100' },
          e('div', { className: 'flex items-center gap-2' }, e('span', { className: 'text-xl' }, e("svg", { className: "ico", style: { width: 22, height: 22 }, "aria-hidden": "true" }, e("use", { href: "#i-calendar" }))), e('div', null,
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
          e('strong', null, e("span", { className: "inline-flex items-center gap-1.5" }, e("svg", { className: "ico", style: { width: 16, height: 16, color: "#d97706" }, "aria-hidden": "true" }, e("use", { href: "#i-alert" })), "O Garantido está ligado nesta central. ")),
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
