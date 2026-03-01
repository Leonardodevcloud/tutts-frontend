// ==================== MÓDULO AGENTE RPA — CORREÇÃO DE ENDEREÇOS ====================
// Arquivo: modulo-agente.js
// Admin: só histórico  |  User/Motoboy: formulário com GPS nativo + foto fachada
// Cores: roxo #550776, laranja #f37601, dark mode responsivo
// ==================================================================================

(function () {
  'use strict';

  const { useState, useEffect, useCallback, useRef } = React;
  const h = React.createElement;

  // ── Constantes ─────────────────────────────────────────────────────────────
  const PONTOS = [2, 3, 4, 5, 6, 7];
  const POLLING_INTERVAL = 5000;
  const POLLING_TIMEOUT  = 180000;
  const MAX_FOTO_SIZE    = 5 * 1024 * 1024; // 5MB

  // ── Helpers ────────────────────────────────────────────────────────────────
  function fmtDT(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function BadgeStatus({ status }) {
    const map = {
      pendente:     { bg: 'bg-yellow-100',  text: 'text-yellow-800',  label: 'Pendente'     },
      processando:  { bg: 'bg-blue-100',    text: 'text-blue-800',    label: 'Processando'  },
      sucesso:      { bg: 'bg-green-100',   text: 'text-green-800',   label: 'Sucesso'      },
      erro:         { bg: 'bg-red-100',     text: 'text-red-800',     label: 'Erro'         },
    };
    const s = map[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status };
    return h('span', {
      className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`
    }, s.label);
  }

  function compressImage(file, maxWidth = 1200, quality = 0.7) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, ht = img.height;
          if (w > maxWidth) { ht = (ht * maxWidth) / w; w = maxWidth; }
          canvas.width = w; canvas.height = ht;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, ht);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ── ABA: Formulário do motoboy ──────────────────────────────────────────────
  function TabFormulario({ API_URL, fetchAuth, showToast }) {
    const [form, setForm]           = useState({ os_numero: '', ponto: '', localizacao_raw: '' });
    const [loading, setLoading]     = useState(false);
    const [solicitacaoId, setSolId] = useState(null);
    const [fase, setFase]           = useState('idle');
    const [detalheErro, setDetalhe] = useState('');
    const pollingRef                = useRef(null);
    const timeoutRef                = useRef(null);
    const fotoInputRef              = useRef(null);

    // GPS e foto states
    const [gps, setGps]             = useState(null);       // { lat, lng }
    const [gpsLoading, setGpsLoad]  = useState(false);
    const [gpsErro, setGpsErro]     = useState('');
    const [fotoBase64, setFotoB64]  = useState(null);
    const [fotoPreview, setFotoPre] = useState(null);

    const pararPolling = useCallback(() => {
      if (pollingRef.current)  clearInterval(pollingRef.current);
      if (timeoutRef.current)  clearTimeout(timeoutRef.current);
      pollingRef.current = null;
      timeoutRef.current = null;
    }, []);

    useEffect(() => () => pararPolling(), [pararPolling]);

    // Capturar GPS automaticamente ao montar
    useEffect(() => {
      capturarGPS();
    }, []);

    function capturarGPS() {
      if (!navigator.geolocation) {
        setGpsErro('Geolocalização não suportada neste navegador.');
        return;
      }
      setGpsLoad(true);
      setGpsErro('');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsLoad(false);
          setGpsErro('');
        },
        (err) => {
          const msgs = {
            1: 'Permissão de localização negada. Ative nas configurações do navegador.',
            2: 'Localização indisponível. Verifique seu GPS.',
            3: 'Tempo esgotado ao obter localização. Tente novamente.',
          };
          setGpsErro(msgs[err.code] || 'Erro ao obter localização.');
          setGpsLoad(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }

    async function handleFoto(e) {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        showToast('Selecione uma imagem válida.', 'error');
        return;
      }
      if (file.size > MAX_FOTO_SIZE * 2) {
        showToast('Imagem muito grande. Máximo 10MB antes da compressão.', 'error');
        return;
      }

      try {
        const compressed = await compressImage(file);
        setFotoB64(compressed);
        setFotoPre(compressed);
      } catch {
        showToast('Erro ao processar a imagem.', 'error');
      }
    }

    const iniciarPolling = useCallback((id) => {
      timeoutRef.current = setTimeout(() => {
        pararPolling();
        setFase('timeout');
        setLoading(false);
      }, POLLING_TIMEOUT);

      pollingRef.current = setInterval(async () => {
        try {
          const res  = await fetchAuth(`${API_URL}/agent/status/${id}`);
          const data = await res.json();

          if (data.status === 'sucesso') {
            pararPolling(); setFase('sucesso'); setLoading(false);
          } else if (data.status === 'erro') {
            pararPolling(); setDetalhe(data.detalhe_erro || 'Erro desconhecido.'); setFase('erro'); setLoading(false);
          }
        } catch {}
      }, POLLING_INTERVAL);
    }, [fetchAuth, API_URL, pararPolling]);

    const handleChange = (e) => {
      const { name, value } = e.target;
      setForm(f => ({ ...f, [name]: value }));
    };

    // Usar localização GPS nativa como coordenadas do ponto
    function usarGPSComoLocalizacao() {
      if (!gps) return;
      setForm(f => ({ ...f, localizacao_raw: `${gps.lat}, ${gps.lng}` }));
      showToast('Localização GPS inserida!', 'success');
    }

    const handleSubmit = async () => {
      if (!form.os_numero.trim() || !form.ponto || !form.localizacao_raw.trim()) {
        showToast('Preencha todos os campos obrigatórios.', 'error');
        return;
      }
      if (!gps) {
        showToast('GPS obrigatório! Ative a localização e clique em "Atualizar GPS".', 'error');
        return;
      }
      if (!fotoBase64) {
        showToast('Foto da fachada é obrigatória!', 'error');
        return;
      }

      setLoading(true);
      setFase('polling');
      setDetalhe('');

      try {
        const res = await fetchAuth(`${API_URL}/agent/corrigir-endereco`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            os_numero:       form.os_numero.trim(),
            ponto:           parseInt(form.ponto, 10),
            localizacao_raw: form.localizacao_raw.trim(),
            motoboy_lat:     gps.lat,
            motoboy_lng:     gps.lng,
            foto_fachada:    fotoBase64,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          const msg = data.erros ? data.erros.join(' ') : (data.erro || 'Erro ao enviar.');
          setFase('erro'); setDetalhe(msg); setLoading(false);
          return;
        }

        setSolId(data.id);
        iniciarPolling(data.id);

      } catch (err) {
        setFase('erro'); setDetalhe('Falha de conexão. Tente novamente.'); setLoading(false);
      }
    };

    const resetar = () => {
      pararPolling();
      setForm({ os_numero: '', ponto: '', localizacao_raw: '' });
      setSolId(null);
      setFase('idle');
      setDetalhe('');
      setLoading(false);
      setFotoB64(null);
      setFotoPre(null);
      capturarGPS();
    };

    // ── Render: feedback ──────────────────────────────────────────────────
    if (fase === 'sucesso') return h('div', { className: 'flex flex-col items-center justify-center py-16 px-6 text-center' },
      h('div', { className: 'w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6' },
        h('span', { className: 'text-4xl' }, '✅')
      ),
      h('h2', { className: 'text-2xl font-bold text-green-700 mb-2' }, 'Endereço corrigido com sucesso!'),
      h('p', { className: 'text-gray-500 mb-8' }, `OS ${form.os_numero || ''} — Ponto ${form.ponto || ''}`),
      h('button', {
        onClick: resetar,
        className: 'px-8 py-3 rounded-xl font-semibold text-white',
        style: { background: 'linear-gradient(135deg, #550776, #7c3aed)' },
      }, '+ Nova Correção')
    );

    if (fase === 'erro' && !loading) return h('div', { className: 'flex flex-col items-center justify-center py-16 px-6 text-center' },
      h('div', { className: 'w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6' },
        h('span', { className: 'text-4xl' }, '❌')
      ),
      h('h2', { className: 'text-xl font-bold text-red-700 mb-2' }, 'Erro ao processar correção'),
      h('p', { className: 'text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-4 mb-8 max-w-md' }, detalheErro),
      h('button', {
        onClick: resetar,
        className: 'px-8 py-3 rounded-xl font-semibold text-white',
        style: { background: 'linear-gradient(135deg, #f37601, #ea580c)' },
      }, '↩ Tentar Novamente')
    );

    if (fase === 'timeout') return h('div', { className: 'flex flex-col items-center justify-center py-16 px-6 text-center' },
      h('div', { className: 'w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mb-6' },
        h('span', { className: 'text-4xl' }, '⏱️')
      ),
      h('h2', { className: 'text-xl font-bold text-yellow-700 mb-2' }, 'Processamento em andamento'),
      h('p', { className: 'text-gray-500 mb-8' }, 'Verifique o histórico em breve para ver o resultado.'),
      h('button', {
        onClick: resetar,
        className: 'px-8 py-3 rounded-xl font-semibold text-white',
        style: { background: 'linear-gradient(135deg, #550776, #7c3aed)' },
      }, '+ Nova Correção')
    );

    // ── Render: formulário ────────────────────────────────────────────────
    const disabled = loading;

    return h('div', { className: 'max-w-lg mx-auto px-4 py-8' },

      // Cabeçalho
      h('div', { className: 'text-center mb-8' },
        h('div', { className: 'w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center',
          style: { background: 'linear-gradient(135deg, #550776, #7c3aed)' } },
          h('span', { className: 'text-3xl' }, '📍')
        ),
        h('h1', { className: 'text-2xl font-bold text-gray-900' }, 'Correção de Endereço')
      ),

      // Alerta de aviso
      h('div', { className: 'mb-5 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl' },
        h('div', { className: 'flex items-start gap-3' },
          h('span', { className: 'text-red-500 text-lg mt-0.5 flex-shrink-0' }, '🚨'),
          h('div', null,
            h('p', { className: 'text-sm text-red-800 leading-relaxed' },
              'Todas as solicitações são revisadas posteriormente por um de nossos especialistas. ',
              h('strong', null, 'NÃO SERÁ TOLERADO'),
              ' nenhuma solicitação de má-fé ou tentativas de burlar o sistema.'
            ),
            h('p', { className: 'text-sm text-red-700 font-semibold mt-1' },
              'Caso seja identificado, o profissional perderá o acesso ao aplicativo.'
            )
          )
        )
      ),

      // Card do formulário
      h('div', { className: 'bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-5' },

        // ── GPS Status ────────────────────────────────────────────────────
        h('div', { className: `p-3 rounded-xl border ${gps ? 'bg-green-50 border-green-200' : gpsErro ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}` },
          h('div', { className: 'flex items-center justify-between' },
            h('div', { className: 'flex items-center gap-2' },
              h('span', null, gps ? '📡' : gpsLoading ? '⏳' : '⚠️'),
              h('div', null,
                h('p', { className: `text-sm font-semibold ${gps ? 'text-green-700' : gpsErro ? 'text-red-700' : 'text-blue-700'}` },
                  gpsLoading ? 'Obtendo localização...' :
                  gps ? 'GPS capturado' :
                  'GPS não disponível'
                ),
                gps && h('p', { className: 'text-xs text-green-600 font-mono' }, `${gps.lat.toFixed(6)}, ${gps.lng.toFixed(6)}`),
                gpsErro && h('p', { className: 'text-xs text-red-600' }, gpsErro)
              )
            ),
            h('button', {
              onClick: capturarGPS,
              disabled: gpsLoading,
              className: 'text-xs px-3 py-1.5 rounded-lg font-semibold text-white transition hover:opacity-80',
              style: { background: gps ? '#16a34a' : '#2563eb' },
            }, gpsLoading ? '...' : '🔄 Atualizar GPS')
          )
        ),

        // Campo OS
        h('div', null,
          h('label', { className: 'block text-sm font-semibold text-gray-700 mb-1.5' }, 'Número da OS *'),
          h('input', {
            name: 'os_numero', type: 'tel', inputMode: 'numeric', pattern: '[0-9]*',
            placeholder: 'Ex: 1071614', value: form.os_numero, onChange: handleChange, disabled,
            className: `w-full rounded-xl border px-4 py-3 text-gray-900 text-lg font-mono transition
              ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200'}
              outline-none`,
          })
        ),

        // Ponto
        h('div', null,
          h('label', { className: 'block text-sm font-semibold text-gray-700 mb-1.5' }, 'Ponto a corrigir *'),
          h('select', {
            name: 'ponto', value: form.ponto, onChange: handleChange, disabled,
            className: `w-full rounded-xl border px-4 py-3 text-gray-900 transition
              ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200'}
              outline-none appearance-none`,
          },
            h('option', { value: '' }, '— Selecione o ponto —'),
            PONTOS.map(p => h('option', { key: p, value: p }, `Ponto ${p}`))
          )
        ),

        // Localização
        h('div', null,
          h('label', { className: 'block text-sm font-semibold text-gray-700 mb-1.5' }, 'Localização do ponto *'),
          h('div', { className: 'relative' },
            h('textarea', {
              name: 'localizacao_raw', rows: 3,
              placeholder: 'Cole o link do Maps ou as coordenadas\nEx: https://maps.app.goo.gl/Xxx ou -16.738952, -49.293811',
              value: form.localizacao_raw, onChange: handleChange, disabled,
              className: `w-full rounded-xl border px-4 py-3 text-gray-900 text-sm resize-none transition
                ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200'}
                outline-none`,
            })
          ),
          h('div', { className: 'flex items-center justify-between mt-1.5' },
            h('p', { className: 'text-xs text-gray-400' }, 'Link do Maps ou coordenadas'),
            gps && h('button', {
              onClick: usarGPSComoLocalizacao, disabled,
              className: 'text-xs px-3 py-1 rounded-lg font-semibold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition',
            }, '📍 Usar minha localização')
          )
        ),

        // ── Foto da fachada ──────────────────────────────────────────────
        h('div', null,
          h('label', { className: 'block text-sm font-semibold text-gray-700 mb-1.5' }, '📸 Foto da fachada *'),

          // Input hidden
          h('input', {
            ref: fotoInputRef,
            type: 'file',
            accept: 'image/*',
            capture: 'environment', // Câmera traseira no mobile
            onChange: handleFoto,
            className: 'hidden',
          }),

          fotoPreview
            ? h('div', { className: 'relative' },
                h('img', {
                  src: fotoPreview,
                  className: 'w-full h-48 object-cover rounded-xl border-2 border-green-300',
                  alt: 'Foto da fachada',
                }),
                h('button', {
                  onClick: () => { setFotoB64(null); setFotoPre(null); },
                  className: 'absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg hover:bg-red-600',
                }, '✕'),
                h('div', { className: 'absolute bottom-2 left-2 px-2 py-1 bg-green-500 text-white text-xs rounded-lg font-semibold' }, '✓ Foto capturada')
              )
            : h('button', {
                onClick: () => fotoInputRef.current?.click(),
                disabled,
                className: `w-full h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition
                  ${disabled ? 'border-gray-200 bg-gray-50 cursor-not-allowed' : 'border-purple-300 bg-purple-50 hover:bg-purple-100 hover:border-purple-400 cursor-pointer'}`,
              },
                h('span', { className: 'text-3xl' }, '📷'),
                h('span', { className: 'text-sm font-semibold text-purple-700' }, 'Tirar foto da fachada'),
                h('span', { className: 'text-xs text-purple-500' }, 'Obrigatório — toque para abrir a câmera')
              )
        ),

        // Botão enviar
        h('button', {
          onClick: handleSubmit, disabled,
          className: `w-full py-4 rounded-xl font-bold text-white text-lg transition flex items-center justify-center gap-3
            ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90 active:scale-[0.98]'}`,
          style: { background: 'linear-gradient(135deg, #550776, #7c3aed)' },
        },
          loading
            ? h(React.Fragment, null,
                h('div', { className: 'w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin' }),
                'Processando...'
              )
            : h(React.Fragment, null, h('span', null, '🚀'), 'Enviar Correção')
        )
      ),

      // Status do polling
      fase === 'polling' && h('div', { className: 'mt-6 flex items-center gap-3 justify-center text-gray-500 text-sm' },
        h('div', { className: 'w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin' }),
        'Aguardando confirmação do robô...'
      )
    );
  }

  // ── ABA: Histórico Admin ────────────────────────────────────────────────────
  function TabHistorico({ API_URL, fetchAuth, showToast, usuario }) {
    const [dados, setDados]        = useState([]);
    const [total, setTotal]        = useState(0);
    const [loading, setLoading]    = useState(false);
    const [expandido, setExpandido] = useState(null);
    const [filtros, setFiltros]    = useState({ status: '', os_numero: '', de: '', ate: '' });
    const [page, setPage]          = useState(1);
    const [fotoModal, setFotoModal] = useState(null);
    const PER_PAGE = 20;

    const carregar = useCallback(async (pg = 1, f = filtros) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: pg, per_page: PER_PAGE });
        if (f.status)    params.set('status',    f.status);
        if (f.os_numero) params.set('os_numero', f.os_numero);
        if (f.de)        params.set('de',        f.de);
        if (f.ate)       params.set('ate',       f.ate);

        const res  = await fetchAuth(`${API_URL}/agent/historico?${params}`);
        const data = await res.json();
        setDados(data.registros || []);
        setTotal(data.total || 0);
        setPage(pg);
      } catch {
        showToast('Erro ao carregar histórico', 'error');
      } finally {
        setLoading(false);
      }
    }, [fetchAuth, API_URL, showToast]);

    useEffect(() => { carregar(); }, []);

    const totalPaginas = Math.ceil(total / PER_PAGE);

    const aplicarFiltros = () => carregar(1, filtros);
    const handleFiltro = (e) => {
      const { name, value } = e.target;
      setFiltros(f => ({ ...f, [name]: value }));
    };

    const validar = async (id) => {
      try {
        const res = await fetchAuth(`${API_URL}/agent/historico/${id}/validar`, { method: 'PATCH' });
        if (res.ok) {
          showToast('Registro validado!', 'success');
          carregar(page, filtros);
        } else {
          showToast('Erro ao validar', 'error');
        }
      } catch { showToast('Erro de conexão', 'error'); }
    };

    const abrirFoto = async (id) => {
      try {
        const res = await fetchAuth(`${API_URL}/agent/foto/${id}`);
        const data = await res.json();
        if (data.foto) {
          setFotoModal(data.foto);
        } else {
          showToast('Foto não encontrada', 'error');
        }
      } catch { showToast('Erro ao carregar foto', 'error'); }
    };

    return h('div', { className: 'max-w-6xl mx-auto px-4 py-6' },

      // Filtros
      h('div', { className: 'grid grid-cols-2 md:grid-cols-5 gap-3 mb-5' },
        h('select', {
          name: 'status', value: filtros.status, onChange: handleFiltro,
          className: 'col-span-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-400',
        },
          h('option', { value: '' }, 'Todos status'),
          ['pendente','processando','sucesso','erro'].map(s =>
            h('option', { key: s, value: s }, s.charAt(0).toUpperCase() + s.slice(1))
          )
        ),
        h('input', {
          name: 'os_numero', value: filtros.os_numero, onChange: handleFiltro,
          placeholder: 'Nº OS',
          className: 'col-span-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-400',
        }),
        h('input', {
          name: 'de', type: 'date', value: filtros.de, onChange: handleFiltro,
          className: 'col-span-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-400',
        }),
        h('input', {
          name: 'ate', type: 'date', value: filtros.ate, onChange: handleFiltro,
          className: 'col-span-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-400',
        }),
        h('button', {
          onClick: aplicarFiltros,
          className: 'col-span-2 md:col-span-1 rounded-xl text-sm font-semibold text-white py-2 transition hover:opacity-90',
          style: { background: 'linear-gradient(135deg, #550776, #7c3aed)' },
        }, '🔍 Filtrar')
      ),

      // Loading
      loading && h('div', { className: 'flex items-center justify-center py-12 gap-3 text-gray-400' },
        h('div', { className: 'w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin' }),
        'Carregando...'
      ),

      // Tabela
      !loading && h('div', { className: 'bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden' },
        // Desktop
        h('div', { className: 'hidden md:block overflow-x-auto' },
          h('table', { className: 'w-full text-sm' },
            h('thead', null,
              h('tr', { className: 'bg-gray-50 border-b border-gray-100' },
                ['ID','OS','Ponto','Status','Criado em','Processado em','Foto','Validado por','Ações'].map(col =>
                  h('th', { key: col, className: 'px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide' }, col)
                )
              )
            ),
            h('tbody', null,
              dados.length === 0 && h('tr', null,
                h('td', { colSpan: 9, className: 'text-center py-12 text-gray-400' }, 'Nenhum registro encontrado.')
              ),
              dados.map(r => h(React.Fragment, { key: r.id },
                h('tr', {
                  className: `border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer ${expandido === r.id ? 'bg-purple-50' : ''}`,
                  onClick: () => setExpandido(expandido === r.id ? null : r.id),
                },
                  h('td', { className: 'px-4 py-3 font-mono text-gray-500 text-xs' }, `#${r.id}`),
                  h('td', { className: 'px-4 py-3 font-semibold text-gray-900' }, r.os_numero),
                  h('td', { className: 'px-4 py-3 text-gray-600' }, `Ponto ${r.ponto}`),
                  h('td', { className: 'px-4 py-3' }, h(BadgeStatus, { status: r.status })),
                  h('td', { className: 'px-4 py-3 text-gray-500 text-xs' }, fmtDT(r.criado_em)),
                  h('td', { className: 'px-4 py-3 text-gray-500 text-xs' }, fmtDT(r.processado_em)),
                  h('td', { className: 'px-4 py-3' },
                    h('button', {
                      onClick: (e) => { e.stopPropagation(); abrirFoto(r.id); },
                      className: 'text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold transition',
                    }, '📷 Ver')
                  ),
                  h('td', { className: 'px-4 py-3 text-gray-500 text-xs' },
                    r.validado_por
                      ? h('div', null,
                          h('div', { className: 'font-medium text-gray-700' }, r.validado_por),
                          h('div', { className: 'text-gray-400' }, fmtDT(r.validado_em))
                        )
                      : '—'
                  ),
                  h('td', { className: 'px-4 py-3' },
                    !r.validado_por && h('button', {
                      onClick: (e) => { e.stopPropagation(); validar(r.id); },
                      className: 'px-3 py-1 text-xs font-semibold rounded-lg text-white transition hover:opacity-80',
                      style: { background: '#f37601' },
                    }, '✓ Validar')
                  )
                ),
                expandido === r.id && r.detalhe_erro && h('tr', { key: `exp-${r.id}` },
                  h('td', { colSpan: 9, className: 'px-6 py-3 bg-red-50 border-b border-red-100' },
                    h('p', { className: 'text-xs font-semibold text-red-700 mb-1' }, '🔍 Detalhe do erro:'),
                    h('pre', { className: 'text-xs text-red-600 whitespace-pre-wrap font-mono' }, r.detalhe_erro)
                  )
                )
              ))
            )
          )
        ),

        // Mobile cards
        h('div', { className: 'md:hidden divide-y divide-gray-100' },
          dados.length === 0 && h('div', { className: 'text-center py-12 text-gray-400 text-sm' }, 'Nenhum registro encontrado.'),
          dados.map(r => h('div', { key: r.id, className: 'p-4' },
            h('div', { className: 'flex items-start justify-between mb-2' },
              h('div', null,
                h('span', { className: 'font-semibold text-gray-900' }, `OS ${r.os_numero}`),
                h('span', { className: 'ml-2 text-gray-400 text-xs' }, `Ponto ${r.ponto}`)
              ),
              h(BadgeStatus, { status: r.status })
            ),
            h('div', { className: 'text-xs text-gray-400 mb-2' }, fmtDT(r.criado_em)),
            h('div', { className: 'flex gap-2 mb-2' },
              h('button', {
                onClick: () => abrirFoto(r.id),
                className: 'text-xs px-3 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold',
              }, '📷 Ver foto')
            ),
            r.detalhe_erro && h('div', {
              className: 'mt-2 p-2 bg-red-50 rounded-lg text-xs text-red-600 cursor-pointer',
              onClick: () => setExpandido(expandido === r.id ? null : r.id),
            }, expandido === r.id ? r.detalhe_erro : '🔴 Ver detalhe do erro'),
            !r.validado_por && h('button', {
              onClick: () => validar(r.id),
              className: 'mt-3 w-full py-2 text-sm font-semibold rounded-xl text-white',
              style: { background: '#f37601' },
            }, '✓ Marcar como validado')
          ))
        )
      ),

      // Paginação
      totalPaginas > 1 && h('div', { className: 'flex items-center justify-center gap-2 mt-5' },
        h('button', {
          onClick: () => carregar(page - 1, filtros),
          disabled: page <= 1,
          className: 'px-3 py-2 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50',
        }, '← Anterior'),
        h('span', { className: 'text-sm text-gray-500' }, `${page} / ${totalPaginas}`),
        h('button', {
          onClick: () => carregar(page + 1, filtros),
          disabled: page >= totalPaginas,
          className: 'px-3 py-2 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50',
        }, 'Próxima →')
      ),

      // Modal de foto
      fotoModal && h('div', {
        className: 'fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4',
        onClick: () => setFotoModal(null),
      },
        h('div', { className: 'relative max-w-2xl w-full', onClick: e => e.stopPropagation() },
          h('button', {
            onClick: () => setFotoModal(null),
            className: 'absolute -top-3 -right-3 w-10 h-10 bg-white text-gray-800 rounded-full flex items-center justify-center shadow-lg text-lg font-bold hover:bg-gray-100 z-10',
          }, '✕'),
          h('img', {
            src: fotoModal,
            className: 'w-full rounded-xl shadow-2xl',
            alt: 'Foto da fachada',
          })
        )
      )
    );
  }

  // ── ABA: Meu Histórico (Motoboy) ──────────────────────────────────────────
  function TabMeuHistorico({ API_URL, fetchAuth, showToast }) {
    const [dados, setDados]        = useState([]);
    const [total, setTotal]        = useState(0);
    const [loading, setLoading]    = useState(false);
    const [page, setPage]          = useState(1);
    const [fotoModal, setFotoModal] = useState(null);
    const PER_PAGE = 15;

    const carregar = useCallback(async (pg = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: pg, per_page: PER_PAGE });
        const res  = await fetchAuth(`${API_URL}/agent/meu-historico?${params}`);
        const data = await res.json();
        setDados(data.registros || []);
        setTotal(data.total || 0);
        setPage(pg);
      } catch {
        showToast('Erro ao carregar histórico', 'error');
      } finally {
        setLoading(false);
      }
    }, [fetchAuth, API_URL, showToast]);

    useEffect(() => { carregar(); }, []);

    const totalPaginas = Math.ceil(total / PER_PAGE);

    const abrirFoto = async (id) => {
      try {
        const res = await fetchAuth(`${API_URL}/agent/meu-historico/${id}/foto`);
        const data = await res.json();
        if (data.foto) {
          setFotoModal(data.foto);
        } else {
          showToast('Foto não encontrada', 'error');
        }
      } catch { showToast('Erro ao carregar foto', 'error'); }
    };

    function formatCoord(r) {
      if (r.latitude && r.longitude) return `${Number(r.latitude).toFixed(6)}, ${Number(r.longitude).toFixed(6)}`;
      if (r.localizacao_raw) return r.localizacao_raw;
      return '—';
    }

    return h('div', { className: 'max-w-2xl mx-auto px-4 py-6' },

      // Header
      h('div', { className: 'flex items-center justify-between mb-5' },
        h('div', null,
          h('h2', { className: 'text-lg font-bold text-gray-900' }, '📋 Minhas Solicitações'),
          h('p', { className: 'text-xs text-gray-400 mt-0.5' }, `${total} solicitação(ões) no total`)
        ),
        h('button', {
          onClick: () => carregar(page),
          className: 'text-xs px-3 py-1.5 rounded-lg font-semibold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition',
        }, '🔄 Atualizar')
      ),

      // Loading
      loading && h('div', { className: 'flex items-center justify-center py-12 gap-3 text-gray-400' },
        h('div', { className: 'w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin' }),
        'Carregando...'
      ),

      // Lista vazia
      !loading && dados.length === 0 && h('div', { className: 'text-center py-16' },
        h('div', { className: 'w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4' },
          h('span', { className: 'text-3xl' }, '📭')
        ),
        h('p', { className: 'text-gray-500 font-medium' }, 'Nenhuma solicitação ainda'),
        h('p', { className: 'text-gray-400 text-sm mt-1' }, 'Suas correções de endereço aparecerão aqui.')
      ),

      // Cards de solicitações
      !loading && dados.length > 0 && h('div', { className: 'space-y-3' },
        dados.map(r => h('div', {
          key: r.id,
          className: 'bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden',
        },
          // Header do card
          h('div', { className: 'flex items-center justify-between px-4 py-3 border-b border-gray-50' },
            h('div', { className: 'flex items-center gap-2' },
              h('span', { className: 'font-bold text-gray-900' }, `OS ${r.os_numero}`),
              h('span', { className: 'text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full' }, `Ponto ${r.ponto}`)
            ),
            h(BadgeStatus, { status: r.status })
          ),

          // Corpo do card
          h('div', { className: 'px-4 py-3 space-y-2' },

            // Coordenada
            h('div', { className: 'flex items-start gap-2' },
              h('span', { className: 'text-gray-400 text-xs mt-0.5 flex-shrink-0' }, '📍'),
              h('div', null,
                h('p', { className: 'text-xs font-medium text-gray-500' }, 'Coordenada enviada'),
                h('p', { className: 'text-xs text-gray-700 font-mono' }, formatCoord(r))
              )
            ),

            // Endereço corrigido (se disponível)
            r.endereco_corrigido && h('div', { className: 'flex items-start gap-2' },
              h('span', { className: 'text-green-500 text-xs mt-0.5 flex-shrink-0' }, '✅'),
              h('div', null,
                h('p', { className: 'text-xs font-medium text-gray-500' }, 'Endereço ajustado'),
                h('p', { className: 'text-xs text-green-700 font-medium' }, r.endereco_corrigido)
              )
            ),

            // Erro (se existir)
            r.status === 'erro' && r.detalhe_erro && h('div', { className: 'flex items-start gap-2' },
              h('span', { className: 'text-red-500 text-xs mt-0.5 flex-shrink-0' }, '❌'),
              h('div', null,
                h('p', { className: 'text-xs font-medium text-gray-500' }, 'Motivo do erro'),
                h('p', { className: 'text-xs text-red-600' }, r.detalhe_erro)
              )
            ),

            // Data e foto
            h('div', { className: 'flex items-center justify-between pt-1' },
              h('span', { className: 'text-xs text-gray-400' }, fmtDT(r.criado_em)),
              h('button', {
                onClick: () => abrirFoto(r.id),
                className: 'text-xs px-3 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold transition',
              }, '📷 Ver foto')
            )
          )
        ))
      ),

      // Paginação
      totalPaginas > 1 && h('div', { className: 'flex items-center justify-center gap-2 mt-5' },
        h('button', {
          onClick: () => carregar(page - 1),
          disabled: page <= 1,
          className: 'px-3 py-2 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50',
        }, '← Anterior'),
        h('span', { className: 'text-sm text-gray-500' }, `${page} / ${totalPaginas}`),
        h('button', {
          onClick: () => carregar(page + 1),
          disabled: page >= totalPaginas,
          className: 'px-3 py-2 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50',
        }, 'Próxima →')
      ),

      // Modal de foto
      fotoModal && h('div', {
        className: 'fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4',
        onClick: () => setFotoModal(null),
      },
        h('div', { className: 'relative max-w-2xl w-full', onClick: e => e.stopPropagation() },
          h('button', {
            onClick: () => setFotoModal(null),
            className: 'absolute -top-3 -right-3 w-10 h-10 bg-white text-gray-800 rounded-full flex items-center justify-center shadow-lg text-lg font-bold hover:bg-gray-100 z-10',
          }, '✕'),
          h('img', {
            src: fotoModal,
            className: 'w-full rounded-xl shadow-2xl',
            alt: 'Foto da fachada',
          })
        )
      )
    );
  }

  // ── Componente raiz do módulo ───────────────────────────────────────────────
  window.ModuloAgenteComponent = function ModuloAgente({
    usuario,
    API_URL,
    fetchAuth,
    HeaderCompacto,
    showToast,
    he,
    Ee,
    f, E, n, i,
  }) {
    const isAdmin = usuario && (usuario.role === 'admin' || usuario.role === 'admin_master');

    // Admin: só histórico  |  User: só formulário
    const [aba, setAba] = useState(isAdmin ? 'historico' : 'formulario');

    const ABAS = isAdmin
      ? [{ id: 'historico',  label: '📋 Histórico', visible: true }]
      : [
          { id: 'formulario',    label: '📍 Correção',      visible: true },
          { id: 'meu-historico', label: '📋 Minhas Solicitações', visible: true },
        ];

    return h('div', { className: 'min-h-screen bg-gray-50 flex flex-col' },

      i && h(window.__TuttsToastComponent || 'div', i),

      HeaderCompacto && h(HeaderCompacto, {
        usuario,
        moduloAtivo: 'agente',
        abaAtiva: aba,
        onGoHome: () => he && he('home'),
        onLogout: () => {},
        onChangeTab: (id) => setAba(id),
      }),

      // Sub-tabs (só se mais de 1 aba)
      ABAS.length > 1 && h('div', { className: 'bg-white border-b border-gray-200 shadow-sm' },
        h('div', { className: 'max-w-6xl mx-auto px-4 flex' },
          ABAS.map(a => h('button', {
            key: a.id,
            onClick: () => setAba(a.id),
            className: `py-3 px-5 text-sm font-semibold border-b-2 transition ${
              aba === a.id
                ? 'border-purple-700 text-purple-800'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`,
          }, a.label))
        )
      ),

      h('div', { className: 'flex-1' },
        aba === 'formulario'
          ? h(TabFormulario, { API_URL, fetchAuth, showToast })
          : aba === 'meu-historico'
          ? h(TabMeuHistorico, { API_URL, fetchAuth, showToast })
          : h(TabHistorico,  { API_URL, fetchAuth, showToast, usuario })
      )
    );
  };

  console.log('✅ Módulo Agente RPA carregado');
})();
