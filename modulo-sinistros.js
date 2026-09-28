/**
 * modulo-sinistros.js — SINISTROS_V1
 * ─────────────────────────────────────────────────────────────────────────
 * Aba "Sinistros" do modulo Financeiro. Implementa a especificacao
 * "Central Tutts · Apuracao de Sinistros" v1.0 (28/09/2026).
 *
 * Tres blocos: indicadores no topo, lista com abas/busca e painel lateral
 * de cadastro/edicao. Cada sinistro tem duas tratativas independentes —
 * com o cliente e com o entregador (ou com a plataforma, no caso de
 * Uber/99) — e as etapas mudam em qualquer ordem, sem fluxo travado.
 *
 * Expoe window.ModuloSinistrosComponent.
 */
(function () {
  'use strict';

  var h = React.createElement;
  var useState = React.useState, useEffect = React.useEffect, useCallback = React.useCallback;

  // ── Formatadores ────────────────────────────────────────────────
  function fR(n) {
    return 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fData(iso) {
    if (!iso) return '—';
    var p = String(iso).slice(0, 10).split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }
  function fDataHora(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    return d.toLocaleDateString('pt-BR') + ' · ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  function hojeIso() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // ── Tratativas (itens 7.1 e 7.2) ────────────────────────────────
  var ETAPAS_CLIENTE = [
    { id: 'em_analise',       n: 1, rotulo: 'Em analise' },
    { id: 'aprovado',         n: 2, rotulo: 'Aprovado' },
    { id: 'reprovado',        n: 3, rotulo: 'Reprovado' },
    { id: 'devolvido_fatura', n: 4, rotulo: 'Devolucao realizada em debito na fatura' },
    { id: 'devolvido_pix',    n: 5, rotulo: 'Devolucao realizada via PIX' }
  ];
  var ETAPAS_ENTREGADOR = [
    { id: 'em_analise',              n: 1, rotulo: 'Em analise' },
    { id: 'alinhando_ressarcimento', n: 2, rotulo: 'Alinhando ressarcimento' },
    { id: 'aprovado',                n: 3, rotulo: 'Aprovado' },
    { id: 'reprovado',               n: 4, rotulo: 'Reprovado' }
  ];

  // Cores das etiquetas (item 7.3). Tons escolhidos para passar em contraste
  // sobre o fundo claro de cada pilula.
  var CORES = {
    em_analise:              { bg: '#f1f5f9', fg: '#475569', ponto: '#94a3b8' },
    aprovado_cliente:        { bg: '#dbeafe', fg: '#1d4ed8', ponto: '#3b82f6' },
    alinhando_ressarcimento: { bg: '#ffedd5', fg: '#9a3412', ponto: '#f97316' },
    aprovado_entregador:     { bg: '#dcfce7', fg: '#15803d', ponto: '#22c55e' },
    devolvido:               { bg: '#dcfce7', fg: '#15803d', ponto: '#22c55e' },
    reprovado:               { bg: '#fee2e2', fg: '#b91c1c', ponto: '#ef4444' }
  };
  function corCliente(st) {
    if (st === 'aprovado') return CORES.aprovado_cliente;
    if (st === 'reprovado') return CORES.reprovado;
    if (st === 'devolvido_fatura' || st === 'devolvido_pix') return CORES.devolvido;
    return CORES.em_analise;
  }
  function corEntregador(st) {
    if (st === 'aprovado') return CORES.aprovado_entregador;
    if (st === 'reprovado') return CORES.reprovado;
    if (st === 'alinhando_ressarcimento') return CORES.alinhando_ressarcimento;
    return CORES.em_analise;
  }
  function rotuloDe(lista, id) {
    for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i].rotulo;
    return id;
  }
  // Rotulos curtos para a lista (o texto longo so aparece no painel)
  var CURTO_CLIENTE = {
    em_analise: 'Em analise', aprovado: 'Aprovado · devolver', reprovado: 'Reprovado',
    devolvido_fatura: 'Devolvido · debito fatura', devolvido_pix: 'Devolvido · PIX'
  };
  var CURTO_ENTREGADOR = {
    em_analise: 'Em analise', alinhando_ressarcimento: 'Alinhando ressarcimento',
    aprovado: 'Aprovado', reprovado: 'Reprovado'
  };

  function Etiqueta(p) {
    var c = p.cor;
    return h('span', {
      className: 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-bold whitespace-nowrap',
      style: { background: c.bg, color: c.fg }
    },
      h('span', { className: 'w-1.5 h-1.5 rounded-full flex-shrink-0', style: { background: c.ponto } }),
      p.texto
    );
  }

  // ── Card de indicador ───────────────────────────────────────────
  function Card(p) {
    return h('div', {
      className: p.destaque
        ? 'rounded-xl p-4 text-white flex flex-col gap-1'
        : 'bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-1',
      style: p.destaque ? { background: 'linear-gradient(135deg,#7c3aed,#9333ea)' } : null
    },
      h('div', {
        className: 'text-[10.5px] font-extrabold uppercase tracking-wider',
        style: { color: p.destaque ? '#e9d5ff' : '#94a3b8' }
      }, p.rotulo),
      h('div', {
        className: 'text-[22px] font-extrabold tabular-nums leading-tight',
        style: { color: p.destaque ? '#ffffff' : (p.cor || '#0f172a') }
      }, p.valor),
      p.auxiliar ? h('div', {
        className: 'text-[11px]',
        style: { color: p.destaque ? '#ddd6fe' : '#94a3b8' }
      }, p.auxiliar) : null
    );
  }

  // ── Seletor de etapa (as bolinhas numeradas do painel) ──────────
  function Etapas(p) {
    return h('div', { className: 'flex flex-col gap-1.5' },
      p.etapas.map(function (e) {
        var on = p.valor === e.id;
        return h('button', {
          key: e.id,
          type: 'button',
          onClick: function () { p.onChange(e.id); },
          className: 'flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-colors ' +
            (on ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-300' : 'border-gray-200 bg-white hover:bg-gray-50'),
          style: { minHeight: 44 }
        },
          h('span', {
            className: 'w-6 h-6 flex-shrink-0 rounded-full flex items-center justify-center text-[11px] font-extrabold ' +
              (on ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500')
          }, String(e.n)),
          h('span', {
            className: 'flex-1 text-[12.5px] leading-snug ' + (on ? 'font-bold text-purple-900' : 'font-medium text-gray-700')
          }, e.rotulo)
        );
      })
    );
  }

  // ════════════════════════════════════════════════════════════════
  // PAINEL LATERAL — cadastro e edicao (item 5)
  // ════════════════════════════════════════════════════════════════
  function Painel(p) {
    var ehNovo = !p.sinistroId;
    var _f = useState(null), form = _f[0], setForm = _f[1];
    var _ev = useState([]), evidencias = _ev[0], setEvidencias = _ev[1];
    var _hi = useState([]), historico = _hi[0], setHistorico = _hi[1];
    var _l = useState(true), carregando = _l[0], setCarregando = _l[1];
    var _sv = useState(false), salvando = _sv[0], setSalvando = _sv[1];
    var _er = useState(null), erro = _er[0], setErro = _er[1];
    var _sujo = useState(false), sujo = _sujo[0], setSujo = _sujo[1];

    var _bp = useState(''), buscaProf = _bp[0], setBuscaProf = _bp[1];
    var _rp = useState([]), resProf = _rp[0], setResProf = _rp[1];
    var _bc = useState(''), buscaCli = _bc[0], setBuscaCli = _bc[1];
    var _ac = useState(false), abertoCli = _ac[0], setAbertoCli = _ac[1];

    // Carrega o sinistro (ou monta um em branco)
    useEffect(function () {
      var vivo = true;
      if (ehNovo) {
        setForm({
          cod_cliente: '', nome_cliente: '', os_numero: '', valor: '',
          data_ocorrencia: hojeIso(), descricao: '', origem_profissional: 'central',
          profissional_id: '', profissional_nome: '', valor_ressarcido: '',
          status_cliente: 'em_analise', status_entregador: 'em_analise'
        });
        setEvidencias([]); setHistorico([]); setCarregando(false);
        return;
      }
      setCarregando(true);
      p.api('/sinistros/' + p.sinistroId).then(function (j) {
        if (!vivo) return;
        var s = j.sinistro || {};
        setForm({
          cod_cliente: s.cod_cliente == null ? '' : String(s.cod_cliente),
          nome_cliente: s.nome_cliente || '',
          os_numero: s.os_numero || '',
          valor: s.valor == null ? '' : String(s.valor).replace('.', ','),
          data_ocorrencia: s.data_ocorrencia || hojeIso(),
          descricao: s.descricao || '',
          origem_profissional: s.origem_profissional || 'central',
          profissional_id: s.profissional_id || '',
          profissional_nome: s.profissional_nome || '',
          valor_ressarcido: s.valor_ressarcido == null ? '' : String(s.valor_ressarcido).replace('.', ','),
          status_cliente: s.status_cliente || 'em_analise',
          status_entregador: s.status_entregador || 'em_analise'
        });
        setEvidencias(j.evidencias || []);
        setHistorico(j.historico || []);
        setCarregando(false);
      }).catch(function (e) { if (vivo) { setErro(e.message); setCarregando(false); } });
      return function () { vivo = false; };
    }, [p.sinistroId]);

    function mudar(campo, valor) {
      setSujo(true);
      setForm(function (f) {
        var novo = Object.assign({}, f);
        novo[campo] = valor;
        // Trocar para Uber/99 limpa o vinculo com a Central (item 6)
        if (campo === 'origem_profissional' && valor !== 'central') {
          novo.profissional_id = ''; novo.profissional_nome = '';
        }
        return novo;
      });
    }

    // Busca de profissional (so quando a origem e "central")
    useEffect(function () {
      if (!form || form.origem_profissional !== 'central') { setResProf([]); return; }
      if (buscaProf.trim().length < 2) { setResProf([]); return; }
      var vivo = true;
      var t = setTimeout(function () {
        p.api('/sinistros/profissionais?busca=' + encodeURIComponent(buscaProf.trim()))
          .then(function (j) { if (vivo) setResProf(j.profissionais || []); })
          .catch(function () { if (vivo) setResProf([]); });
      }, 300);
      return function () { vivo = false; clearTimeout(t); };
    }, [buscaProf, form && form.origem_profissional]);

    function fechar() {
      if (sujo && !window.confirm('Ha alteracoes nao salvas. Descartar?')) return;
      p.onFechar();
    }

    async function salvar() {
      setSalvando(true); setErro(null);
      try {
        var corpo = {
          cod_cliente: form.cod_cliente, os_numero: form.os_numero,
          valor: form.valor, data_ocorrencia: form.data_ocorrencia,
          descricao: form.descricao, origem_profissional: form.origem_profissional,
          profissional_id: form.profissional_id, profissional_nome: form.profissional_nome,
          status_cliente: form.status_cliente, status_entregador: form.status_entregador,
          valor_ressarcido: form.valor_ressarcido
        };
        var j = ehNovo
          ? await p.api('/sinistros', { method: 'POST', body: JSON.stringify(corpo) })
          : await p.api('/sinistros/' + p.sinistroId, { method: 'PUT', body: JSON.stringify(corpo) });
        setSujo(false);
        p.onSalvo(j.sinistro);
      } catch (e) {
        setErro(e.message);
      } finally {
        setSalvando(false);
      }
    }

    async function anexar(ev) {
      var arquivos = Array.prototype.slice.call(ev.target.files || []);
      ev.target.value = '';
      if (!arquivos.length) return;
      if (ehNovo) { setErro('Salve o sinistro antes de anexar evidencias.'); return; }
      for (var i = 0; i < arquivos.length; i++) {
        var arq = arquivos[i];
        try {
          var b64 = await new Promise(function (ok, falha) {
            var fr = new FileReader();
            fr.onload = function () { ok(String(fr.result).split(',')[1]); };
            fr.onerror = function () { falha(new Error('Falha ao ler ' + arq.name)); };
            fr.readAsDataURL(arq);
          });
          var j = await p.api('/sinistros/' + p.sinistroId + '/evidencias', {
            method: 'POST',
            body: JSON.stringify({ nome_arquivo: arq.name, mime_type: arq.type, conteudo_base64: b64 })
          });
          setEvidencias(function (lista) { return lista.concat([j.evidencia]); });
        } catch (e) {
          setErro('Anexo "' + arq.name + '": ' + e.message);
        }
      }
    }

    async function removerAnexo(id) {
      if (!window.confirm('Remover esta evidencia?')) return;
      try {
        await p.api('/sinistros/evidencias/' + id, { method: 'DELETE' });
        setEvidencias(function (l) { return l.filter(function (e) { return e.id !== id; }); });
      } catch (e) { setErro(e.message); }
    }

    var rotuloSegunda = (form && form.origem_profissional !== 'central')
      ? 'Tratativa com a plataforma (' + (form.origem_profissional === 'uber' ? 'Uber' : '99') + ')'
      : 'Tratativa com o entregador';

    var clientesFiltrados = (p.clientes || []).filter(function (c) {
      if (!buscaCli.trim()) return true;
      var t = buscaCli.toLowerCase();
      return String(c.cod_cliente).indexOf(t) >= 0 || (c.nome || '').toLowerCase().indexOf(t) >= 0;
    }).slice(0, 60);

    var rotuloCampo = 'block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1';
    var caixa = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300';

    return h('div', { className: 'fixed inset-0 z-50 flex justify-end' },
      h('div', { className: 'absolute inset-0 bg-black/30', onClick: fechar, 'aria-hidden': 'true' }),
      h('div', {
        className: 'relative bg-white w-full max-w-[560px] h-full overflow-y-auto shadow-2xl flex flex-col',
        role: 'dialog', 'aria-label': ehNovo ? 'Novo sinistro' : 'Editar sinistro'
      },
        // Cabecalho
        h('div', { className: 'sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-start gap-3 z-10' },
          h('div', { className: 'flex-1' },
            h('div', { className: 'text-[10.5px] font-extrabold uppercase tracking-wider text-gray-400' },
              ehNovo ? 'Novo sinistro' : ('Editar sinistro' + (form && form.nome_cliente ? ' · ' + form.nome_cliente : ''))),
            h('h2', { className: 'text-xl font-extrabold text-gray-900' },
              ehNovo ? 'Cadastro' : (p.codigo || ''))
          ),
          h('button', {
            type: 'button', onClick: fechar, 'aria-label': 'Fechar painel',
            className: 'w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50'
          }, '×')
        ),

        carregando ? h('div', { className: 'p-10 text-center text-gray-400 text-sm' }, 'Carregando...') :
        h('div', { className: 'flex-1 px-5 py-4 flex flex-col gap-4' },

          erro ? h('div', { className: 'bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[12.5px] text-red-700' }, erro) : null,

          // Cliente
          h('div', null,
            h('label', { className: rotuloCampo, htmlFor: 'sin-cliente' }, 'Cliente *'),
            h('input', {
              id: 'sin-cliente', className: caixa, autoComplete: 'off',
              placeholder: 'Buscar cliente por nome ou codigo',
              value: abertoCli ? buscaCli : (form.nome_cliente || ''),
              onFocus: function () { setAbertoCli(true); setBuscaCli(''); },
              onChange: function (e) { setBuscaCli(e.target.value); }
            }),
            abertoCli ? h('div', { className: 'mt-1 border border-gray-200 rounded-lg max-h-56 overflow-y-auto bg-white shadow-sm' },
              clientesFiltrados.length === 0
                ? h('div', { className: 'px-3 py-3 text-[12.5px] text-gray-400' }, 'Nenhum cliente encontrado')
                : clientesFiltrados.map(function (c) {
                    return h('button', {
                      key: c.cod_cliente, type: 'button',
                      onClick: function () {
                        setSujo(true);
                        setForm(function (f) { return Object.assign({}, f, { cod_cliente: String(c.cod_cliente), nome_cliente: c.nome }); });
                        setAbertoCli(false);
                      },
                      className: 'w-full text-left px-3 py-2 hover:bg-purple-50 flex items-center gap-2'
                    },
                      h('span', { className: 'text-[12.5px] font-semibold text-gray-800 flex-1' }, c.nome),
                      h('span', { className: 'text-[11px] text-gray-400 tabular-nums' }, c.cod_cliente)
                    );
                  })
            ) : null
          ),

          // OS + valor
          h('div', { className: 'grid grid-cols-2 gap-3' },
            h('div', null,
              h('label', { className: rotuloCampo, htmlFor: 'sin-os' }, 'OS / Pedido *'),
              h('input', { id: 'sin-os', className: caixa, value: form.os_numero,
                onChange: function (e) { mudar('os_numero', e.target.value); }, placeholder: 'OS 58102' })
            ),
            h('div', null,
              h('label', { className: rotuloCampo, htmlFor: 'sin-valor' }, 'Valor do sinistro (R$) *'),
              h('input', { id: 'sin-valor', className: caixa, inputMode: 'decimal', value: form.valor,
                onChange: function (e) { mudar('valor', e.target.value); }, placeholder: '320,00' })
            )
          ),

          // Data + evidencias
          h('div', { className: 'grid grid-cols-2 gap-3' },
            h('div', null,
              h('label', { className: rotuloCampo, htmlFor: 'sin-data' }, 'Data da ocorrencia *'),
              h('input', { id: 'sin-data', type: 'date', className: caixa, max: hojeIso(),
                value: form.data_ocorrencia, onChange: function (e) { mudar('data_ocorrencia', e.target.value); } })
            ),
            h('div', null,
              h('span', { className: rotuloCampo }, 'Evidencias'),
              h('label', {
                className: 'w-full px-3 py-2 border border-purple-200 bg-purple-50 text-purple-700 rounded-lg text-[12.5px] font-bold text-center cursor-pointer block hover:bg-purple-100',
                style: { minHeight: 40, lineHeight: '24px' }
              },
                'Anexar fotos / arquivos',
                h('input', { type: 'file', multiple: true, className: 'hidden',
                  accept: 'image/png,image/jpeg,image/webp,image/heic,application/pdf', onChange: anexar })
              )
            )
          ),

          evidencias.length ? h('div', { className: 'flex flex-wrap gap-2' },
            evidencias.map(function (e) {
              return h('span', { key: e.id, className: 'inline-flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11.5px]' },
                h('a', {
                  href: p.urlEvidencia(e.id), target: '_blank', rel: 'noreferrer',
                  className: 'font-semibold text-purple-700 hover:underline max-w-[180px] truncate'
                }, e.nome_arquivo),
                h('span', { className: 'text-gray-400 tabular-nums' }, Math.round((e.tamanho_bytes || 0) / 1024) + ' KB'),
                h('button', { type: 'button', onClick: function () { removerAnexo(e.id); },
                  'aria-label': 'Remover ' + e.nome_arquivo, className: 'text-gray-400 hover:text-red-600 font-bold' }, '×')
              );
            })
          ) : null,

          // Descricao
          h('div', null,
            h('label', { className: rotuloCampo, htmlFor: 'sin-desc' }, 'Descricao *'),
            h('textarea', { id: 'sin-desc', className: caixa, rows: 2, value: form.descricao,
              onChange: function (e) { mudar('descricao', e.target.value); },
              placeholder: 'O que aconteceu, peca envolvida, relato do cliente.' })
          ),

          // Profissional (item 6)
          h('div', null,
            h('span', { className: rotuloCampo }, 'Profissional *'),
            h('div', { className: 'grid grid-cols-3 gap-2 mb-2' },
              [['central', 'Profissional da Central'], ['uber', 'Uber'], ['99', '99']].map(function (o) {
                var on = form.origem_profissional === o[0];
                return h('button', {
                  key: o[0], type: 'button', onClick: function () { mudar('origem_profissional', o[0]); },
                  className: 'px-3 py-2.5 rounded-lg text-[12px] font-bold border ' +
                    (on ? 'bg-purple-700 text-white border-purple-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'),
                  style: { minHeight: 44 }
                }, o[1]);
              })
            ),

            form.origem_profissional === 'central' ? h('div', null,
              h('input', { className: caixa, autoComplete: 'off',
                placeholder: 'Buscar no cadastro da Central (nome, ID ou CPF)',
                value: buscaProf, onChange: function (e) { setBuscaProf(e.target.value); } }),
              form.profissional_id ? h('div', { className: 'mt-2 flex items-center gap-2.5 px-3 py-2.5 border border-purple-300 bg-purple-50 rounded-lg' },
                h('span', { className: 'w-8 h-8 rounded-full bg-purple-700 text-white flex items-center justify-center text-[11px] font-extrabold flex-shrink-0' },
                  (form.profissional_nome || '?').split(' ').map(function (x) { return x[0]; }).slice(0, 2).join('').toUpperCase()),
                h('span', { className: 'flex-1 min-w-0' },
                  h('span', { className: 'block text-[12.5px] font-bold text-gray-900 truncate' }, form.profissional_nome || '—'),
                  h('span', { className: 'block text-[11px] text-gray-500' }, 'ID ' + form.profissional_id)),
                h('button', { type: 'button', className: 'text-[11.5px] font-bold text-purple-700 hover:underline',
                  onClick: function () { setSujo(true); setForm(function (f) { return Object.assign({}, f, { profissional_id: '', profissional_nome: '' }); }); } }, 'Trocar')
              ) : null,
              resProf.length ? h('div', { className: 'mt-1 border border-gray-200 rounded-lg max-h-52 overflow-y-auto' },
                resProf.map(function (pr) {
                  return h('button', {
                    key: pr.cod, type: 'button',
                    onClick: function () {
                      setSujo(true);
                      setForm(function (f) { return Object.assign({}, f, { profissional_id: String(pr.cod), profissional_nome: pr.nome }); });
                      setResProf([]); setBuscaProf('');
                    },
                    className: 'w-full text-left px-3 py-2 hover:bg-purple-50 flex items-center gap-2'
                  },
                    h('span', { className: 'flex-1 min-w-0' },
                      h('span', { className: 'block text-[12.5px] font-semibold text-gray-800 truncate' }, pr.nome || '(sem nome)'),
                      h('span', { className: 'block text-[11px] text-gray-400' },
                        'ID ' + pr.cod + (pr.categoria ? ' · ' + pr.categoria : '') + (pr.cpf ? ' · ' + pr.cpf : ''))),
                    h('span', { className: 'text-[11.5px] font-bold text-purple-700' }, 'Vincular')
                  );
                })
              ) : null
            ) : h('div', { className: 'px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[12px] text-amber-800' },
              'Entrega feita via ' + (form.origem_profissional === 'uber' ? 'Uber' : '99') +
              '. O sinistro fica vinculado a plataforma, sem profissional do cadastro da Central.')
          ),

          // As duas tratativas
          h('div', { className: 'grid grid-cols-2 gap-3' },
            h('div', null,
              h('span', { className: 'block text-[12.5px] font-bold text-gray-900 mb-2' }, 'Tratativa com o cliente'),
              h(Etapas, { etapas: ETAPAS_CLIENTE, valor: form.status_cliente,
                onChange: function (v) { mudar('status_cliente', v); } })
            ),
            h('div', null,
              h('span', { className: 'block text-[12.5px] font-bold text-gray-900 mb-2' }, rotuloSegunda),
              h(Etapas, { etapas: ETAPAS_ENTREGADOR, valor: form.status_entregador,
                onChange: function (v) { mudar('status_entregador', v); } }),
              form.status_entregador === 'aprovado' ? h('div', { className: 'mt-2' },
                h('label', { className: rotuloCampo, htmlFor: 'sin-ress' }, 'Valor ressarcido (opcional)'),
                h('input', { id: 'sin-ress', className: caixa, inputMode: 'decimal',
                  value: form.valor_ressarcido, placeholder: 'em branco = valor total',
                  onChange: function (e) { mudar('valor_ressarcido', e.target.value); } })
              ) : null
            )
          ),

          // Historico (item 8)
          historico.length ? h('div', null,
            h('span', { className: 'block text-[12.5px] font-bold text-gray-900 mb-2' }, 'Historico'),
            h('ul', { className: 'flex flex-col gap-2' },
              historico.map(function (hh) {
                return h('li', { key: hh.id, className: 'flex gap-2.5' },
                  h('span', { className: 'w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0 mt-1.5' }),
                  h('span', { className: 'flex-1' },
                    h('span', { className: 'block text-[12px] text-gray-800' }, hh.descricao),
                    h('span', { className: 'block text-[11px] text-gray-400' },
                      fDataHora(hh.criado_em) + (hh.usuario_id ? ' · ' + hh.usuario_id : '')))
                );
              })
            )
          ) : null
        ),

        // Rodape
        h('div', { className: 'sticky bottom-0 bg-white border-t border-gray-200 px-5 py-3 flex justify-end gap-2' },
          h('button', { type: 'button', onClick: fechar, style: { minHeight: 44 },
            className: 'px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50' }, 'Cancelar'),
          h('button', { type: 'button', onClick: salvar, disabled: salvando || carregando, style: { minHeight: 44 },
            className: 'px-5 py-2 rounded-lg bg-purple-700 text-white text-sm font-bold hover:bg-purple-800 disabled:opacity-60' },
            salvando ? 'Salvando...' : 'Salvar sinistro')
        )
      )
    );
  }

  // ════════════════════════════════════════════════════════════════
  // TELA PRINCIPAL
  // ════════════════════════════════════════════════════════════════
  window.ModuloSinistrosComponent = function (props) {
    var API_URL = props.API_URL, fetchAuth = props.fetchAuth, toast = props.ja;

    var _ab = useState('andamento'), aba = _ab[0], setAba = _ab[1];
    var _bu = useState(''), busca = _bu[0], setBusca = _bu[1];
    var _di = useState(''), dataInicio = _di[0], setDataInicio = _di[1];
    var _df = useState(''), dataFim = _df[0], setDataFim = _df[1];
    var _li = useState([]), lista = _li[0], setLista = _li[1];
    var _ct = useState({}), contagens = _ct[0], setContagens = _ct[1];
    var _cd = useState(null), cards = _cd[0], setCards = _cd[1];
    var _cl = useState([]), clientes = _cl[0], setClientes = _cl[1];
    var _lo = useState(true), carregando = _lo[0], setCarregando = _lo[1];
    var _er = useState(null), erro = _er[0], setErro = _er[1];
    var _pa = useState(null), painel = _pa[0], setPainel = _pa[1]; // {id, codigo} | {id:null}

    var api = useCallback(async function (rota, opcoes) {
      opcoes = opcoes || {};
      var r = await fetchAuth(API_URL + rota, Object.assign({}, opcoes, {
        headers: Object.assign({ 'Content-Type': 'application/json' }, opcoes.headers || {})
      }));
      var j = null;
      try { j = await r.json(); } catch (e) { j = null; }
      if (!r.ok) throw new Error((j && j.error) || ('HTTP ' + r.status));
      return j;
    }, [API_URL, fetchAuth]);

    var periodo = (dataInicio ? '&data_inicio=' + dataInicio : '') + (dataFim ? '&data_fim=' + dataFim : '');

    var recarregar = useCallback(function () {
      setCarregando(true); setErro(null);
      Promise.all([
        api('/sinistros?aba=' + aba + '&busca=' + encodeURIComponent(busca) + periodo),
        api('/sinistros/cards?' + periodo.replace(/^&/, ''))
      ]).then(function (res) {
        setLista(res[0].sinistros || []);
        setContagens(res[0].contagens || {});
        setCards(res[1].cards || null);
        setCarregando(false);
      }).catch(function (e) { setErro(e.message); setCarregando(false); });
    }, [api, aba, busca, dataInicio, dataFim]);

    useEffect(function () {
      var t = setTimeout(recarregar, busca ? 350 : 0);
      return function () { clearTimeout(t); };
    }, [recarregar]);

    useEffect(function () {
      api('/sinistros/clientes').then(function (j) { setClientes(j.clientes || []); }).catch(function () {});
    }, [api]);

    function urlEvidencia(id) { return API_URL + '/sinistros/evidencias/' + id; }

    function aoSalvar() {
      setPainel(null);
      if (typeof toast === 'function') toast('Sinistro salvo', 'success');
      recarregar();
    }

    var abas = [
      { id: 'andamento', rotulo: 'Em andamento', n: contagens.andamento },
      { id: 'concluidos', rotulo: 'Concluidos', n: contagens.concluidos },
      { id: 'todos', rotulo: 'Todos', n: contagens.todos }
    ];

    var th = function (txt, right) {
      return h('th', {
        className: (right ? 'text-right' : 'text-left') + ' px-3 py-2.5 text-[10.5px] font-extrabold uppercase tracking-wide text-gray-500'
      }, txt);
    };

    return h('div', { className: 'space-y-4' },

      // Cabecalho
      h('div', { className: 'flex flex-col sm:flex-row sm:items-end gap-3' },
        h('div', { className: 'flex-1' },
          h('h2', { className: 'text-xl font-extrabold text-gray-900' }, 'Apuracao de sinistros'),
          h('p', { className: 'text-[12.5px] text-gray-500' },
            'Acompanhe cada sinistro em duas frentes: tratativa com o cliente e tratativa com o entregador.')
        ),
        h('div', { className: 'flex items-center gap-2' },
          h('input', { type: 'date', value: dataInicio, 'aria-label': 'Data inicial',
            onChange: function (e) { setDataInicio(e.target.value); },
            className: 'px-2.5 py-2 border border-gray-200 rounded-lg text-[12.5px]' }),
          h('span', { className: 'text-gray-400 text-xs' }, 'ate'),
          h('input', { type: 'date', value: dataFim, 'aria-label': 'Data final',
            onChange: function (e) { setDataFim(e.target.value); },
            className: 'px-2.5 py-2 border border-gray-200 rounded-lg text-[12.5px]' }),
          h('button', {
            type: 'button', onClick: function () { setPainel({ id: null }); }, style: { minHeight: 44 },
            className: 'px-4 py-2 rounded-lg bg-purple-700 text-white text-sm font-bold hover:bg-purple-800 whitespace-nowrap'
          }, '+ Novo sinistro')
        )
      ),

      // Cards (item 3)
      cards ? h('div', { className: 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3' },
        h(Card, { rotulo: 'Sinistros em andamento', valor: String(cards.em_andamento),
          auxiliar: cards.total + ' no total' }),
        h(Card, { rotulo: 'Aprovados · aguardando devolucao', valor: String(cards.aguardando_devolucao),
          auxiliar: 'Devolver via fatura ou PIX' }),
        h(Card, { rotulo: 'Ressarcimento em alinhamento', valor: String(cards.em_alinhamento),
          auxiliar: 'Entregador ou plataforma' }),
        h(Card, { rotulo: 'Valor em aberto', valor: fR(cards.valor_aberto),
          auxiliar: 'Sinistros em andamento' }),
        h(Card, { rotulo: 'Total devolvido a clientes', valor: fR(cards.total_devolvido), cor: '#b91c1c',
          auxiliar: cards.devolvido_fatura_qtd + ' em fatura · ' + cards.devolvido_pix_qtd + ' via PIX' }),
        h(Card, { rotulo: 'Total ressarcido pelo entregador', valor: fR(cards.ressarcido_entregador), cor: '#15803d',
          auxiliar: '+ ' + fR(cards.ressarcido_plataforma) + ' ressarcido por plataformas' })
      ) : null,

      // Abas + busca
      h('div', { className: 'flex flex-col sm:flex-row sm:items-center gap-3' },
        h('div', { className: 'flex bg-white border border-gray-200 rounded-lg overflow-hidden' },
          abas.map(function (a) {
            var on = aba === a.id;
            return h('button', {
              key: a.id, type: 'button', onClick: function () { setAba(a.id); },
              className: 'px-4 py-2 text-[12.5px] font-bold ' + (on ? 'bg-purple-700 text-white' : 'text-gray-600 hover:bg-gray-50'),
              style: { minHeight: 44 }
            }, a.rotulo + (a.n == null ? '' : ' · ' + a.n));
          })
        ),
        h('input', {
          type: 'search', value: busca, onChange: function (e) { setBusca(e.target.value); },
          placeholder: 'Buscar por nº, cliente, OS ou profissional', 'aria-label': 'Buscar sinistro',
          className: 'flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm'
        })
      ),

      // Lista (item 4)
      erro ? h('div', { className: 'bg-red-50 border border-red-200 rounded-xl p-5 text-center text-red-700 text-sm' }, erro) :
      h('div', { className: 'bg-white rounded-xl shadow-sm overflow-hidden overflow-x-auto' },
        carregando ? h('div', { className: 'p-10 text-center text-gray-400 text-sm' }, 'Carregando...') :
        lista.length === 0 ? h('div', { className: 'p-10 text-center text-gray-400 text-sm' }, 'Nenhum sinistro nesta visao.') :
        h('table', { className: 'w-full border-collapse text-sm' },
          h('thead', null, h('tr', { className: 'bg-gray-50 border-b border-gray-200' },
            th('Nº'), th('Data'), th('Cliente'), th('OS'), th('Profissional'),
            th('Valor', true), th('Tratativa cliente'), th('Tratativa entregador / plataforma')
          )),
          h('tbody', null, lista.map(function (s) {
            var plataforma = s.origem_profissional !== 'central';
            return h('tr', {
              key: s.id, tabIndex: 0, role: 'button',
              onClick: function () { setPainel({ id: s.id, codigo: s.codigo }); },
              onKeyDown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPainel({ id: s.id, codigo: s.codigo }); } },
              className: 'border-b border-gray-100 hover:bg-purple-50/50 cursor-pointer'
            },
              h('td', { className: 'px-3 py-3 font-extrabold text-purple-700 whitespace-nowrap' }, s.codigo),
              h('td', { className: 'px-3 py-3 text-gray-600 whitespace-nowrap tabular-nums' }, fData(s.data_ocorrencia)),
              h('td', { className: 'px-3 py-3 font-semibold text-gray-800 max-w-[200px] truncate' }, s.nome_cliente || '—'),
              h('td', { className: 'px-3 py-3 text-gray-600 whitespace-nowrap' }, s.os_numero || '—'),
              h('td', { className: 'px-3 py-3' },
                h('span', { className: 'block font-semibold text-gray-800 text-[13px] max-w-[170px] truncate' },
                  plataforma ? (s.origem_profissional === 'uber' ? 'Uber' : '99') : (s.profissional_nome || '—')),
                h('span', { className: 'block text-[11px] text-gray-400' },
                  plataforma ? 'Plataforma parceira' : ('Central · ID ' + (s.profissional_id || '?')))),
              h('td', { className: 'px-3 py-3 text-right font-bold text-gray-900 whitespace-nowrap tabular-nums' }, fR(s.valor)),
              h('td', { className: 'px-3 py-3' },
                h(Etiqueta, { cor: corCliente(s.status_cliente), texto: CURTO_CLIENTE[s.status_cliente] || s.status_cliente })),
              h('td', { className: 'px-3 py-3' },
                h(Etiqueta, { cor: corEntregador(s.status_entregador), texto: CURTO_ENTREGADOR[s.status_entregador] || s.status_entregador }))
            );
          }))
        )
      ),

      painel ? h(Painel, {
        sinistroId: painel.id, codigo: painel.codigo, api: api, clientes: clientes,
        urlEvidencia: urlEvidencia,
        onFechar: function () { setPainel(null); },
        onSalvo: aoSalvar
      }) : null
    );
  };

  console.log('✅ Modulo Sinistros v1 carregado (SINISTROS_V1)');
})();
