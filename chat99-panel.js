/* UI_UNIFICADO_V1: emojis -> sprite de icones; cores na paleta unica (CORES_TOKENS_V1). */
/* HUB_ABAS_V1: Chat 99 no padrão clean — duas colunas, bolhas cinza/roxo-50, status de envio em texto cinza. */
/**
 * chat99-panel.js  -  Painel do Chat 99 (pagina propria do Hub Logistico)
 *
 * Espelho do chat da 99Entrega. Le do backend (/api/logistics/chat99/*), que e
 * populado pelo agente RPA "chat99". Lista de conversas + thread, envio de
 * mensagens (limite 140 da 99), busca por OS.
 *
 * Exposto como window.Chat99Panel (padrao dos modulos externos do Hub, igual
 * window.ModuloLogisticaProviders). Recebe props do modulo-logistica:
 *   { API_URL, fetchAuth, showToast, estado, setEstado }
 *
 * Regras do codebase respeitadas:
 *   - React via CDN, h = React.createElement, SEM JSX
 *   - fetchAuth retorna Response cru (usa res.ok / res.json())
 *   - API_URL ja inclui /api (nunca duplicar prefixo)
 *   - SEM lib de icone (Tabler/Lucide/FontAwesome) - so emoji nativo
 *   - Cores: roxo #770fa8 / #770fa8, laranja #f67602
 */
(function () {
  'use strict';
  const h = React.createElement;
  const { useState, useEffect, useRef, useCallback } = React;

  const LIMITE_99 = 140;
  const POLL_LISTA_MS = 15000;
  const POLL_THREAD_MS = 5000;

  const ROXO = '#770fa8';
  const LARANJA = '#f67602';

  function iniciais(nome) {
    if (!nome) return '99';
    const p = String(nome).trim().split(/\s+/);
    return ((p[0] || '')[0] || '') + ((p[p.length - 1] || '')[0] || '');
  }
  function fmtHora(iso, horario99) {
    if (horario99) return horario99;
    if (!iso) return '';
    try { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
    catch (_) { return ''; }
  }

  // ── Item da lista de conversas (topo-nivel: nunca definir dentro do render) ──
  function ItemConversa({ conv, ativo, onClick }) {
    const naoLidas = Number(conv.nao_lidas) || 0;
    // HUB_ABAS_V1: seleção roxa suave (fundo roxo-50 + inset 2px), sem borda colorida grossa
    return h('div', {
      onClick, role: 'button', tabIndex: 0, 'aria-pressed': !!ativo,
      onKeyDown: (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onClick(); } },
      className: 'px-4 py-3 cursor-pointer border-t border-gray-100 first:border-t-0 focus:outline-none focus-visible:bg-gray-50 ' + (ativo ? '' : 'hover:bg-gray-50'),
      style: ativo ? { background: '#faf7fd', boxShadow: 'inset 2px 0 0 #770fa8' } : {},
    },
      h('div', { className: 'flex items-center justify-between gap-2' },
        h('span', { className: 'text-[13.5px] font-semibold text-gray-900 truncate' }, conv.motoboy_nome || 'Motoboy'),
        h('span', { className: 'text-[11px] text-gray-500 flex-shrink-0', style: { fontVariantNumeric: 'tabular-nums' } }, fmtHora(conv.ultima_msg_em)),
      ),
      h('div', { className: 'text-[11.5px] text-gray-500 mt-0.5', style: { fontVariantNumeric: 'tabular-nums' } }, `OS ${conv.codigo_os}`),
      h('div', { className: 'flex items-center justify-between gap-2 mt-0.5' },
        h('span', { className: 'text-[12.5px] truncate flex-1 ' + (naoLidas > 0 ? 'text-gray-900 font-medium' : 'text-gray-500') }, conv.ultima_msg_texto || '\u2014'),
        (naoLidas > 0) && h('span', {
          className: 'min-w-[18px] h-[18px] px-1 rounded-full text-[10.5px] font-bold flex items-center justify-center flex-shrink-0',
          style: { background: LARANJA, color: '#26093a' },
          'aria-label': `${naoLidas} não lida${naoLidas !== 1 ? 's' : ''}`,
        }, naoLidas > 9 ? '9+' : String(naoLidas)),
      ),
    );
  }

  // ── Bolha de mensagem ──────────────────────────────────────────────────────
  function Bolha({ msg, foto }) {
    const out = msg.direcao === 'out';
    const hora = fmtHora(msg.criado_em, msg.horario_99);
    if (out) {
      let statusTxt = '';
      if (msg.status_envio === 'pendente' || msg.status_envio === 'enviando') statusTxt = 'enviando';
      else if (msg.status_envio === 'erro') statusTxt = 'falhou';
      else statusTxt = msg.lido ? 'Lida' : 'Enviada';
      // HUB_ABAS_V1: nossa bolha roxo-50 (#faf7fd) com texto #3a1556; status em texto cinza (falha em vermelho)
      return h('div', { className: 'self-end max-w-[78%]' },
        h('div', {
          className: 'rounded-[12px] rounded-br-[4px] px-3 py-2 text-[13px] leading-snug break-words',
          style: { background: '#faf7fd', color: '#3a1556', border: '1px solid #f3e8fb' },
        }, msg.texto || (msg.img_url ? '[imagem]' : '')),
        h('div', { className: 'text-right text-[11px] text-gray-500 mt-1', style: { fontVariantNumeric: 'tabular-nums' } },
          hora, ' \u00b7 ',
          h('span', { style: msg.status_envio === 'erro' ? { color: '#991b1b', fontWeight: 600 } : null }, statusTxt),
        ),
      );
    }
    return h('div', { className: 'self-start max-w-[78%] flex gap-2 items-end' },
      foto
        ? h('img', { src: foto, alt: '', className: 'w-6 h-6 rounded-full object-cover flex-shrink-0 bg-gray-100',
            onError: (ev) => { ev.target.style.display = 'none'; } })
        : h('div', { className: 'w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-500 flex-shrink-0' }, Icon('bike')),
      h('div', null,
        h('div', { className: 'text-gray-900 rounded-[12px] rounded-bl-[4px] px-3 py-2 text-[13px] leading-snug break-words', style: { background: '#f3f4f6' } },
          msg.texto || (msg.img_url ? '[imagem]' : '')),
        h('div', { className: 'text-[11px] text-gray-500 mt-1', style: { fontVariantNumeric: 'tabular-nums' } }, hora),
      ),
    );
  }

  // ── Componente principal ────────────────────────────────────────────────────
  function Chat99Panel(props) {
    const { API_URL, fetchAuth, showToast, estado, setEstado } = props;

    const [conversas, setConversas] = useState([]);
    const [selecionada, setSelecionada] = useState(null); // codigo_os
    const [thread, setThread] = useState(null);           // { conversa, mensagens }
    const [texto, setTexto] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [busca, setBusca] = useState('');
    const [carregandoThread, setCarregandoThread] = useState(false);

    const fetchRef = useRef(fetchAuth);
    fetchRef.current = fetchAuth;
    const apiRef = useRef(API_URL);
    apiRef.current = API_URL;
    const fimRef = useRef(null);

    // OS vinda do card do Hub (estado.chat99OS) -> abre direto
    useEffect(() => {
      const os = estado && estado.chat99OS;
      if (os) {
        setSelecionada(String(os));
        if (setEstado) setEstado(st => ({ ...st, chat99OS: null }));
      }
      // eslint-disable-next-line
    }, [estado && estado.chat99OS]);

    // ── Lista de conversas (poll 15s) ──
    const puxarLista = useCallback(async () => {
      try {
        const r = await fetchRef.current(`${apiRef.current}/logistics/chat99/conversas`);
        if (!r || !r.ok) return;
        const d = await r.json();
        setConversas(Array.isArray(d.conversas) ? d.conversas : []);
      } catch (_) {}
    }, []);

    useEffect(() => {
      puxarLista();
      const t = setInterval(puxarLista, POLL_LISTA_MS);
      return () => clearInterval(t);
    }, [puxarLista]);

    // ── Thread da conversa selecionada (poll 5s) + marca lidas ──
    const puxarThread = useCallback(async (os, primeira) => {
      if (!os) return;
      if (primeira) setCarregandoThread(true);
      try {
        const r = await fetchRef.current(`${apiRef.current}/logistics/chat99/${encodeURIComponent(os)}`);
        if (r && r.ok) {
          const d = await r.json();
          setThread(d);
        }
      } catch (_) {} finally { if (primeira) setCarregandoThread(false); }
    }, []);

    const marcarLidas = useCallback(async (os) => {
      try {
        await fetchRef.current(`${apiRef.current}/logistics/chat99/${encodeURIComponent(os)}/marcar-lidas`, { method: 'POST' });
        setConversas(cs => cs.map(c => String(c.codigo_os) === String(os) ? { ...c, nao_lidas: 0 } : c));
      } catch (_) {}
    }, []);

    useEffect(() => {
      if (!selecionada) { setThread(null); return; }
      setThread(null);
      puxarThread(selecionada, true);
      marcarLidas(selecionada);
      const t = setInterval(() => { puxarThread(selecionada, false); marcarLidas(selecionada); }, POLL_THREAD_MS);
      return () => clearInterval(t);
    }, [selecionada, puxarThread, marcarLidas]);

    // scroll pro fim quando chegam mensagens
    useEffect(() => {
      if (fimRef.current) fimRef.current.scrollIntoView({ block: 'end' });
    }, [thread && thread.mensagens && thread.mensagens.length]);

    // ── Enviar ──
    const enviar = async () => {
      const t = (texto || '').trim();
      if (!t || !selecionada) return;
      if (t.length > LIMITE_99) { showToast && showToast(`Maximo ${LIMITE_99} caracteres`, 'error'); return; }
      setEnviando(true);
      try {
        const r = await fetchRef.current(`${apiRef.current}/logistics/chat99/${encodeURIComponent(selecionada)}/enviar`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto: t }),
        });
        if (!r || !r.ok) {
          let msg = 'Falha ao enviar';
          try { const d = await r.json(); if (d && d.error) msg = d.error; } catch (_) {}
          showToast && showToast(msg, 'error');
        } else {
          setTexto('');
          puxarThread(selecionada, false);
        }
      } catch (_) { showToast && showToast('Falha ao enviar', 'error'); }
      finally { setEnviando(false); }
    };

    // ── Lista filtrada pela busca (por OS ou nome) ──
    const termo = (busca || '').trim().toLowerCase();
    const listaFiltrada = termo
      ? conversas.filter(c => String(c.codigo_os).includes(termo) || (c.motoboy_nome || '').toLowerCase().includes(termo))
      : conversas;
    const buscaEhOS = /^\d{3,}$/.test(termo);
    const osNaLista = listaFiltrada.some(c => String(c.codigo_os) === termo);

    const conv = thread && thread.conversa ? thread.conversa : null;
    const foto = conv && conv.motoboy_foto_url;

    const naoLidasTot = conversas.reduce((acc, c) => acc + (Number(c.nao_lidas) || 0), 0);
    return h('div', { className: 'max-w-7xl mx-auto px-4 py-5 md:px-6 md:py-6 space-y-4' }, /* HUB_MARGEM_V1 */

        // Cabecalho — HUB_ABAS_V1
        h('div', { className: 'flex items-end justify-between flex-wrap gap-3' },
          h('div', null,
            h('h1', { className: 'text-2xl font-bold text-gray-900', style: { fontFamily: 'Sora, Inter, sans-serif', letterSpacing: '-0.01em' } }, 'Chat 99'),
            h('p', { className: 'text-[13px] text-gray-500 mt-1' },
              `Espelho do chat da 99Entrega · ${conversas.length} conversa${conversas.length !== 1 ? 's' : ''}`,
              naoLidasTot > 0 ? ` · ${naoLidasTot} não lida${naoLidasTot !== 1 ? 's' : ''}` : ''),
          ),
          h('button', {
            type: 'button', onClick: puxarLista, title: 'Atualizar', 'aria-label': 'Atualizar conversas',
            className: 'w-10 h-10 rounded-[10px] border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 grid place-items-center',
          }, Icon('refresh')),
        ),

        h('div', { className: 'grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4 md:h-[max(480px,calc(100vh-230px))]' },

          // ── Coluna esquerda: lista ──
          h('section', { 'aria-label': 'Conversas', className: 'bg-white border border-gray-200 rounded-[14px] overflow-hidden flex flex-col min-h-0 max-h-[340px] md:max-h-none' },
            h('div', { className: 'p-3 border-b border-gray-100' },
              h('label', { className: 'flex items-center gap-2 h-[38px] px-3 border border-gray-200 rounded-[10px] text-gray-400 focus-within:border-purple-400' },
                Icon('search'),
                h('input', {
                  type: 'search',
                  value: busca,
                  onChange: (ev) => setBusca(ev.target.value),
                  placeholder: 'Buscar por OS ou nome', 'aria-label': 'Buscar conversa por OS ou nome',
                  className: 'flex-1 min-w-0 border-0 outline-none bg-transparent text-[13px] text-gray-900',
                })),
              (buscaEhOS && !osNaLista) && h('button', {
                type: 'button',
                onClick: () => setSelecionada(termo),
                className: 'w-full mt-2 h-9 rounded-[10px] border border-gray-200 bg-white text-[13px] font-semibold text-gray-700 hover:bg-gray-50',
              }, `Abrir chat da OS ${termo}`),
            ),
            h('div', { className: 'flex-1 overflow-y-auto' },
              listaFiltrada.length
                ? listaFiltrada.map(c => h(ItemConversa, {
                    key: c.codigo_os, conv: c,
                    ativo: String(selecionada) === String(c.codigo_os),
                    onClick: () => setSelecionada(String(c.codigo_os)),
                  }))
                : h('div', { className: 'text-center py-10 px-4' },
                    h('div', { className: 'text-[13.5px] font-semibold text-gray-700' }, termo ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ativa'),
                    h('div', { className: 'text-[12.5px] text-gray-500 mt-1' }, termo ? 'Busque pelo número da OS para abrir o chat dela.' : 'O agente cria uma quando o motoboy aceita a corrida e abre o chat na 99.')),
            ),
          ),

          // ── Coluna direita: thread ──
          h('section', { 'aria-label': 'Conversa', className: 'bg-white border border-gray-200 rounded-[14px] overflow-hidden flex flex-col min-h-0 h-[560px] md:h-auto' },
            !selecionada
              ? h('div', { className: 'flex-1 flex items-center justify-center text-center p-6' },
                  h('div', null,
                    h('div', { className: 'text-[14px] font-semibold text-gray-700' }, 'Selecione uma conversa'),
                    h('div', { className: 'text-[13px] text-gray-500 mt-1' }, 'Escolha um motoboy na lista para ver e responder as mensagens.'),
                  ))
              : h(React.Fragment, null,
                  // header da thread
                  h('div', { className: 'flex items-center gap-3 px-4 py-3 border-b border-gray-100' },
                    foto
                      ? h('img', { src: foto, alt: '', className: 'w-9 h-9 rounded-full object-cover bg-gray-100',
                          onError: (ev) => { ev.target.style.display = 'none'; } })
                      : h('div', { className: 'w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-semibold uppercase', style: { background: '#f3e8fb', color: '#5d0b85' } }, iniciais(conv && conv.motoboy_nome)),
                    h('div', { className: 'flex-1 min-w-0' },
                      h('div', { className: 'text-[14px] font-semibold text-gray-900 truncate' }, (conv && conv.motoboy_nome) || 'Motoboy'),
                      h('div', { className: 'flex items-center gap-3 flex-wrap text-[12px] text-gray-500' },
                        h('span', { style: { fontVariantNumeric: 'tabular-nums' } }, `OS ${selecionada}`),
                        (conv && conv.motoboy_rating) && h('span', { className: 'inline-flex items-center gap-1' }, Icon('star'), conv.motoboy_rating),
                        (conv && conv.motoboy_telefone) && h('span', { className: 'inline-flex items-center gap-1', style: { fontVariantNumeric: 'tabular-nums' } }, Icon('phone'), conv.motoboy_telefone),
                      ),
                    ),
                  ),
                  // mensagens
                  h('div', { className: 'flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2.5', 'aria-live': 'polite' },
                    carregandoThread
                      ? h('div', { className: 'text-center text-[13px] text-gray-500 py-8' }, 'Carregando mensagens…')
                      : (thread && thread.mensagens && thread.mensagens.length
                          ? thread.mensagens.map(m => h(Bolha, { key: m.id, msg: m, foto: foto }))
                          : h('div', { className: 'text-center py-10' },
                              h('div', { className: 'text-[13.5px] font-semibold text-gray-700' }, 'Sem mensagens ainda'),
                              h('div', { className: 'text-[12.5px] text-gray-500 mt-1' }, 'Escreva abaixo para falar com o motoboy pela 99.'))),
                    h('div', { ref: fimRef }),
                  ),
                  // rodape / envio
                  h('div', { className: 'px-3 py-3 border-t border-gray-100' },
                    h('div', { className: 'flex gap-2 items-start' },
                      h('div', { className: 'flex-1 min-w-0' },
                        h('textarea', {
                          value: texto,
                          onChange: (ev) => setTexto(ev.target.value.slice(0, LIMITE_99)),
                          onKeyDown: (ev) => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); enviar(); } },
                          placeholder: 'Mensagem para o motoboy…', 'aria-label': 'Mensagem para o motoboy',
                          rows: 1,
                          className: 'w-full min-h-[40px] text-[13px] px-3 py-2 rounded-[10px] bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 resize-none block',
                        }),
                      ),
                      h('button', {
                        type: 'button',
                        onClick: enviar,
                        disabled: enviando || !texto.trim(),
                        className: 'h-10 px-4 rounded-[10px] bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed',
                      }, enviando ? 'Enviando…' : 'Enviar'),
                    ),
                    h('div', { className: 'flex items-center justify-between gap-2 text-[11px] text-gray-500 mt-1.5' },
                      h('span', { className: 'inline-flex items-center gap-1 min-w-0' }, Icon('bot'), h('span', { className: 'truncate' }, 'Enviado pela conta 99 via agente · limite de 140 caracteres')),
                      h('span', { style: { fontVariantNumeric: 'tabular-nums', color: texto.length >= LIMITE_99 ? '#991b1b' : undefined } }, `${texto.length}/${LIMITE_99}`)),
                  ),
                ),
          ),
        ),
    );
  }

  window.Chat99Panel = Chat99Panel;
})();
