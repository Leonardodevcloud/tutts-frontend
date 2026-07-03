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
 *   - Cores: roxo #7c3aed / #770fa8, laranja #f67602
 */
(function () {
  'use strict';
  const h = React.createElement;
  const { useState, useEffect, useRef, useCallback } = React;

  const LIMITE_99 = 140;
  const POLL_LISTA_MS = 15000;
  const POLL_THREAD_MS = 5000;

  const ROXO = '#7c3aed';
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
    return h('div', {
      onClick,
      className: 'px-3 py-2.5 cursor-pointer border-b border-gray-100 ' +
        (ativo ? 'bg-purple-50 border-l-4' : 'border-l-4 border-l-transparent hover:bg-gray-50'),
      style: ativo ? { borderLeftColor: ROXO } : {},
    },
      h('div', { className: 'flex items-center justify-between mb-0.5' },
        h('span', { className: 'text-[13px] font-semibold text-gray-800 truncate' }, conv.motoboy_nome || 'Motoboy'),
        h('span', { className: 'text-[10px] text-gray-400 flex-shrink-0 ml-2' }, fmtHora(conv.ultima_msg_em)),
      ),
      h('div', { className: 'flex items-center gap-1.5 mb-0.5' },
        h('span', { className: 'text-[9px] text-white rounded px-1.5 py-px', style: { background: ROXO } }, `OS ${conv.codigo_os}`),
      ),
      h('div', { className: 'flex items-center justify-between' },
        h('span', { className: 'text-[11px] text-gray-500 truncate flex-1' }, conv.ultima_msg_texto || '\u2014'),
        (naoLidas > 0) && h('span', {
          className: 'ml-2 min-w-[16px] h-4 px-1 rounded-full text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0',
          style: { background: LARANJA },
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
      if (msg.status_envio === 'pendente' || msg.status_envio === 'enviando') statusTxt = '\u23f3 enviando';
      else if (msg.status_envio === 'erro') statusTxt = '\u26a0\ufe0f falhou';
      else statusTxt = msg.lido ? '\u2713\u2713 Lido' : '\u2713 Enviada';
      return h('div', { className: 'self-end max-w-[74%]' },
        h('div', {
          className: 'text-white rounded-[12px] rounded-br-[3px] px-3 py-2 text-[13px] leading-snug break-words',
          style: { background: ROXO },
        }, msg.texto || (msg.img_url ? '[imagem]' : '')),
        h('div', { className: 'text-right text-[10px] text-gray-400 mt-0.5' },
          hora, ' \u00b7 ',
          h('span', { style: msg.status_envio === 'erro' ? { color: '#dc2626' } : { color: ROXO } }, statusTxt),
        ),
      );
    }
    return h('div', { className: 'self-start max-w-[74%] flex gap-2 items-end' },
      foto
        ? h('img', { src: foto, className: 'w-6 h-6 rounded-full object-cover flex-shrink-0 bg-purple-100',
            onError: (ev) => { ev.target.style.display = 'none'; } })
        : h('div', { className: 'w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-500 flex-shrink-0' }, '\ud83d\udeb4'),
      h('div', null,
        h('div', { className: 'bg-white border border-gray-200 text-gray-800 rounded-[12px] rounded-bl-[3px] px-3 py-2 text-[13px] leading-snug break-words' },
          msg.texto || (msg.img_url ? '[imagem]' : '')),
        h('div', { className: 'text-[10px] text-gray-400 mt-0.5' }, hora),
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

    return h('div', { className: 'min-h-[calc(100vh-120px)] bg-gray-50 p-3 md:p-4' },
      h('div', { className: 'max-w-6xl mx-auto' },

        // Cabecalho
        h('div', { className: 'flex items-center justify-between mb-3 px-1' },
          h('div', { className: 'flex items-center gap-2' },
            h('div', { className: 'w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm', style: { background: ROXO } }, '\ud83d\udcac'),
            h('span', { className: 'text-base font-bold text-gray-800' }, 'Chat 99'),
            h('span', { className: 'text-xs text-gray-400' }, 'espelho da 99Entrega'),
          ),
          h('button', {
            onClick: puxarLista,
            className: 'text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-white',
          }, '\ud83d\udd04 Atualizar'),
        ),

        h('div', { className: 'grid grid-cols-1 md:grid-cols-[280px_1fr] gap-3', style: { height: 'calc(100vh - 180px)' } },

          // ── Coluna esquerda: lista ──
          h('div', { className: 'bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col' },
            h('div', { className: 'p-2.5 border-b border-gray-100' },
              h('input', {
                value: busca,
                onChange: (ev) => setBusca(ev.target.value),
                placeholder: '\ud83d\udd0d Buscar por OS ou nome',
                className: 'w-full text-[13px] px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 focus:outline-none focus:border-purple-300',
              }),
              (buscaEhOS && !osNaLista) && h('button', {
                onClick: () => setSelecionada(termo),
                className: 'w-full mt-2 text-[12px] py-1.5 rounded-lg text-white font-semibold',
                style: { background: ROXO },
              }, `Abrir chat da OS ${termo}`),
            ),
            h('div', { className: 'flex-1 overflow-y-auto' },
              listaFiltrada.length
                ? listaFiltrada.map(c => h(ItemConversa, {
                    key: c.codigo_os, conv: c,
                    ativo: String(selecionada) === String(c.codigo_os),
                    onClick: () => setSelecionada(String(c.codigo_os)),
                  }))
                : h('div', { className: 'text-center text-[12px] text-gray-400 py-8 px-3' },
                    'Nenhuma conversa ativa. O agente cria uma quando o motoboy aceita a corrida e abre o chat na 99.'),
            ),
          ),

          // ── Coluna direita: thread ──
          h('div', { className: 'bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col' },
            !selecionada
              ? h('div', { className: 'flex-1 flex items-center justify-center text-center text-gray-400 text-sm p-6' },
                  h('div', null,
                    h('div', { className: 'text-4xl mb-2' }, '\ud83d\udcac'),
                    h('div', null, 'Selecione uma conversa a esquerda'),
                  ))
              : h(React.Fragment, null,
                  // header da thread
                  h('div', { className: 'flex items-center gap-3 p-3 border-b border-gray-100' },
                    foto
                      ? h('img', { src: foto, className: 'w-9 h-9 rounded-full object-cover bg-purple-100',
                          onError: (ev) => { ev.target.style.display = 'none'; } })
                      : h('div', { className: 'w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-[12px] font-bold text-purple-700 uppercase' }, iniciais(conv && conv.motoboy_nome)),
                    h('div', { className: 'flex-1 min-w-0' },
                      h('div', { className: 'text-[13px] font-semibold text-gray-800 truncate' }, (conv && conv.motoboy_nome) || 'Motoboy'),
                      h('div', { className: 'flex items-center gap-3 text-[11px] text-gray-500' },
                        (conv && conv.motoboy_rating) && h('span', null, '\u2b50 ', conv.motoboy_rating),
                        (conv && conv.motoboy_telefone) && h('span', null, '\ud83d\udcde ', conv.motoboy_telefone),
                        h('span', { className: 'font-semibold', style: { color: ROXO } }, `OS ${selecionada}`),
                      ),
                    ),
                  ),
                  // mensagens
                  h('div', { className: 'flex-1 overflow-y-auto p-3 flex flex-col gap-2 bg-gray-50' },
                    carregandoThread
                      ? h('div', { className: 'text-center text-[12px] text-gray-400 py-8' }, 'Carregando...')
                      : (thread && thread.mensagens && thread.mensagens.length
                          ? thread.mensagens.map(m => h(Bolha, { key: m.id, msg: m, foto: foto }))
                          : h('div', { className: 'text-center text-[12px] text-gray-400 py-8' }, 'Sem mensagens ainda.')),
                    h('div', { ref: fimRef }),
                  ),
                  // rodape / envio
                  h('div', { className: 'p-2.5 border-t border-gray-100' },
                    h('div', { className: 'flex gap-2 items-end' },
                      h('div', { className: 'flex-1' },
                        h('textarea', {
                          value: texto,
                          onChange: (ev) => setTexto(ev.target.value.slice(0, LIMITE_99)),
                          onKeyDown: (ev) => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); enviar(); } },
                          placeholder: 'Mensagem para o motoboy...',
                          rows: 1,
                          className: 'w-full text-[13px] px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 focus:outline-none focus:border-purple-300 resize-none',
                        }),
                        h('div', { className: 'text-right text-[10px] text-gray-400 mt-0.5' }, `${texto.length}/${LIMITE_99}`),
                      ),
                      h('button', {
                        onClick: enviar,
                        disabled: enviando || !texto.trim(),
                        className: 'text-[13px] font-semibold text-white rounded-lg h-9 px-4 flex items-center gap-1.5 flex-shrink-0 ' + (enviando || !texto.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'),
                        style: { background: ROXO },
                      }, enviando ? '...' : '\u27a4 Enviar'),
                    ),
                    h('div', { className: 'text-[10px] text-gray-400 mt-1' },
                      '\ud83e\udd16 Enviado pela conta 99 via agente \u00b7 limite de 140 caracteres'),
                  ),
                ),
          ),
        ),
      ),
    );
  }

  window.Chat99Panel = Chat99Panel;
})();
