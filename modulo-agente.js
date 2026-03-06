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

    // Estados da localização do ponto (coordenada + endereço geocodificado)
    const [pontoCoords, setPontoCoords]     = useState(null); // { lat, lng }
    const [enderecoGeo, setEnderecoGeo]     = useState('');
    const [geoLoading, setGeoLoading]       = useState(false);

    const pararPolling = useCallback(() => {
      if (pollingRef.current)  clearInterval(pollingRef.current);
      if (timeoutRef.current)  clearTimeout(timeoutRef.current);
      pollingRef.current = null;
      timeoutRef.current = null;
    }, []);

    useEffect(() => () => pararPolling(), [pararPolling]);

    // GPS em tempo real com watchPosition (atualização contínua)
    const watchIdRef = useRef(null);

    useEffect(() => {
      iniciarWatchGPS();
      return () => {
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      };
    }, []);

    function iniciarWatchGPS() {
      if (!navigator.geolocation) {
        setGpsErro('Geolocalização não suportada neste navegador.');
        return;
      }
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      setGpsLoad(true);
      setGpsErro('');
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
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
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
      );
    }

    function capturarGPS() {
      iniciarWatchGPS();
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

    // Enviar localização atual do motoboy como coordenada do ponto + geocodificação reversa
    async function enviarLocalizacao() {
      if (!gps) {
        showToast('Aguarde o GPS capturar sua localização.', 'error');
        return;
      }
      const coordStr = `${gps.lat}, ${gps.lng}`;
      setForm(f => ({ ...f, localizacao_raw: coordStr }));
      setPontoCoords({ lat: gps.lat, lng: gps.lng });
      setGeoLoading(true);
      setEnderecoGeo('');

      try {
        const res = await fetchAuth(`${API_URL}/api/geocode/reverse?lat=${gps.lat}&lng=${gps.lng}`);
        const data = await res.json();
        if (res.ok && data.endereco) {
          setEnderecoGeo(data.endereco);
        } else {
          setEnderecoGeo('Endereço não encontrado');
        }
      } catch {
        setEnderecoGeo('Erro ao buscar endereço');
      } finally {
        setGeoLoading(false);
      }
      showToast('Localização enviada com sucesso!', 'success');
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
          // OS duplicada: mostrar toast e manter no formulário (não ir para tela de erro)
          if (res.status === 409) {
            showToast(msg, 'error');
            setLoading(false);
            setFase('idle');
            return;
          }
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
      setPontoCoords(null);
      setEnderecoGeo('');
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

    // ── Render: polling — tela cheia com robô animado ──────────────────
    if (fase === 'polling') return h('div', {
      className: 'fixed inset-0 z-50 flex flex-col items-center justify-center px-6 overflow-hidden',
      style: { background: 'linear-gradient(135deg, #550776 0%, #7c3aed 50%, #550776 100%)', backgroundSize: '200% 200%', animation: 'gradientShift 4s ease infinite', overflowX: 'hidden', overflowY: 'auto', width: '100vw', maxWidth: '100%' }
    },
      h('style', null, `
        @keyframes gradientShift { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        @keyframes robotFloat { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
        @keyframes robotWave { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(20deg); } 75% { transform: rotate(-10deg); } }
        @keyframes robotBlink { 0%, 42%, 58%, 100% { transform: scaleY(1); } 45%, 55% { transform: scaleY(0.1); } }
        @keyframes gearSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulseRing { 0% { transform: scale(0.8); opacity: 0.5; } 50% { transform: scale(1.2); opacity: 0; } 100% { transform: scale(0.8); opacity: 0; } }
        @keyframes dotPulse { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1.2); } }
        @keyframes progressBar { 0% { width: 5%; } 20% { width: 25%; } 50% { width: 55%; } 80% { width: 80%; } 100% { width: 95%; } }
      `),
      h('div', { style: { position: 'relative', width: '180px', height: '180px', marginBottom: '24px' } },
        h('div', { style: { position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', animation: 'pulseRing 2s ease-in-out infinite' } }),
        h('div', { style: { position: 'absolute', inset: '-10px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', animation: 'pulseRing 2s ease-in-out 0.5s infinite' } }),
        h('div', { style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'robotFloat 3s ease-in-out infinite' } },
          h('svg', { width: '120', height: '140', viewBox: '0 0 120 140', fill: 'none' },
            h('line', { x1: '60', y1: '8', x2: '60', y2: '25', stroke: 'white', strokeWidth: '3', strokeLinecap: 'round' }),
            h('circle', { cx: '60', cy: '6', r: '5', fill: '#fbbf24', style: { animation: 'robotBlink 3s ease infinite' } }),
            h('rect', { x: '25', y: '25', width: '70', height: '50', rx: '16', fill: 'white', opacity: '0.95' }),
            h('circle', { cx: '43', cy: '48', r: '7', fill: '#550776' }),
            h('circle', { cx: '77', cy: '48', r: '7', fill: '#550776' }),
            h('circle', { cx: '45', cy: '46', r: '2.5', fill: 'white' }),
            h('circle', { cx: '79', cy: '46', r: '2.5', fill: 'white' }),
            h('path', { d: 'M 45 58 Q 60 68 75 58', stroke: '#550776', strokeWidth: '2.5', fill: 'none', strokeLinecap: 'round' }),
            h('rect', { x: '30', y: '80', width: '60', height: '40', rx: '12', fill: 'white', opacity: '0.9' }),
            h('circle', { cx: '60', cy: '100', r: '8', fill: 'none', stroke: '#7c3aed', strokeWidth: '2', style: { transformOrigin: '60px 100px', animation: 'gearSpin 3s linear infinite' } }),
            h('circle', { cx: '60', cy: '100', r: '3', fill: '#7c3aed' }),
            h('g', { style: { transformOrigin: '25px 85px', animation: 'robotWave 1.5s ease-in-out infinite' } },
              h('rect', { x: '5', y: '82', width: '22', height: '12', rx: '6', fill: 'white', opacity: '0.85' }),
              h('circle', { cx: '8', cy: '88', r: '6', fill: '#fbbf24' })
            ),
            h('rect', { x: '93', y: '88', width: '22', height: '12', rx: '6', fill: 'white', opacity: '0.85' }),
            h('rect', { x: '35', y: '122', width: '16', height: '10', rx: '5', fill: 'white', opacity: '0.8' }),
            h('rect', { x: '69', y: '122', width: '16', height: '10', rx: '5', fill: 'white', opacity: '0.8' })
          )
        )
      ),
      h('h2', { className: 'text-2xl font-bold text-white mb-3 text-center', style: { textShadow: '0 2px 8px rgba(0,0,0,0.3)' } },
        'Aguarde...'
      ),
      h('p', { className: 'text-base text-purple-100 text-center mb-2 leading-relaxed max-w-xs' },
        'O robô está executando sua solicitação.'
      ),
      h('p', { className: 'text-sm text-purple-200 text-center mb-8 max-w-xs' },
        'Em menos de 1 minuto seu serviço será atualizado e você conseguirá finalizar a corrida!'
      ),
      h('div', { className: 'w-64 h-2 rounded-full overflow-hidden', style: { background: 'rgba(255,255,255,0.15)' } },
        h('div', { style: { height: '100%', borderRadius: '9999px', background: 'linear-gradient(90deg, #fbbf24, #f59e0b)', animation: 'progressBar 60s ease-out forwards' } })
      ),
      h('div', { className: 'flex gap-2 mt-6' },
        h('div', { className: 'w-2.5 h-2.5 rounded-full bg-white', style: { animation: 'dotPulse 1.4s ease-in-out infinite' } }),
        h('div', { className: 'w-2.5 h-2.5 rounded-full bg-white', style: { animation: 'dotPulse 1.4s ease-in-out 0.2s infinite' } }),
        h('div', { className: 'w-2.5 h-2.5 rounded-full bg-white', style: { animation: 'dotPulse 1.4s ease-in-out 0.4s infinite' } })
      ),
      h('div', { className: 'mt-8 px-4 py-2 rounded-full text-xs font-semibold text-purple-200', style: { background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)' } },
        `OS ${form.os_numero || '—'} • Ponto ${form.ponto || '—'}`
      )
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
              h('strong', null, 'Atenção ao preenchimento!'),
              ' Nossa equipe de especialistas fará uma validação posteriormente.'
            ),
            h('p', { className: 'text-sm text-red-800 mt-1 leading-relaxed' },
              'É importante informar o número da OS de forma correta, bem como a indicação de qual ponto ajustar. A foto da fachada do cliente deve ser legível.'
            ),
            h('p', { className: 'text-sm text-red-700 font-semibold mt-1' },
              'Caso não siga os padrões, terá a corrida invalidada pelo sistema.'
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
                  gps ? ('GPS ao vivo ' + (gps.accuracy ? '(±' + Math.round(gps.accuracy) + 'm)' : '')) :
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
          h('label', { className: 'block text-sm font-semibold text-gray-700 mb-1.5' }, 'Ponto de coleta a corrigir *'),
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

        // Localização do ponto
        h('div', null,
          h('label', { className: 'block text-sm font-semibold text-gray-700 mb-1.5' }, 'Localização do ponto *'),

          h('p', { className: 'text-xs text-gray-500 mb-3 leading-relaxed' },
            'Vá até o local exato do ponto que precisa ser corrigido e clique no botão abaixo para enviar sua localização.'
          ),

          !pontoCoords
            ? h('button', {
                onClick: enviarLocalizacao,
                disabled: disabled || !gps || geoLoading,
                className: `w-full py-4 rounded-xl font-bold text-lg transition flex items-center justify-center gap-3 border-2
                  ${!gps || disabled
                    ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-green-50 border-green-400 text-green-700 hover:bg-green-100 hover:border-green-500 active:scale-[0.98] shadow-md'}`,
              },
                geoLoading
                  ? h(React.Fragment, null,
                      h('div', { className: 'w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin' }),
                      'Obtendo endereço...'
                    )
                  : h(React.Fragment, null,
                      h('span', { className: 'text-2xl' }, String.fromCodePoint(0x1F4CD)),
                      'Enviar minha localização atual'
                    )
              )
            : h('div', { className: 'bg-green-50 border border-green-200 rounded-xl p-4 space-y-2' },
                h('div', { className: 'flex items-center justify-between' },
                  h('div', { className: 'flex items-center gap-2' },
                    h('span', { className: 'text-green-600 text-lg' }, String.fromCodePoint(0x2705)),
                    h('span', { className: 'text-sm font-semibold text-green-700' }, 'Localização enviada')
                  ),
                  h('button', {
                    onClick: () => { setPontoCoords(null); setEnderecoGeo(''); setForm(f => ({ ...f, localizacao_raw: '' })); },
                    disabled,
                    className: 'text-xs px-3 py-1 rounded-lg font-semibold text-orange-700 bg-orange-50 border border-orange-200 hover:bg-orange-100 transition',
                  }, String.fromCodePoint(0x1F504) + ' Reenviar')
                ),
                h('p', { className: 'text-xs font-mono text-green-800' },
                  `${String.fromCodePoint(0x1F4CD)} ${pontoCoords.lat.toFixed(6)}, ${pontoCoords.lng.toFixed(6)}`
                ),
                null
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

        );
  }

  // ── COMPONENTE: Mapa com rotas (Leaflet + OSRM) ──────────────────────────
  // Mostra Ponto 1 (origem) -> End. antigo (vermelho) e Ponto 1 -> End. corrigido (verde)
  function MapaTracado({ registro, API_URL, fetchAuth }) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const [mapError, setMapError] = useState('');
    const [mapLoaded, setMapLoaded] = useState(false);
    const [statusMsg, setStatusMsg] = useState('Buscando Ponto 1 da OS...');

    useEffect(() => {
      if (!registro || !mapRef.current) return;
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }

      const r = registro;
      const motoboyLat = parseFloat(r.motoboy_lat);
      const motoboyLng = parseFloat(r.motoboy_lng);
      const corrLat = parseFloat(r.latitude);
      const corrLng = parseFloat(r.longitude);
      const temMotoboy = !isNaN(motoboyLat) && !isNaN(motoboyLng);
      const temCorrigido = !isNaN(corrLat) && !isNaN(corrLng);

      if (!temCorrigido && !temMotoboy) {
        setMapError('Sem coordenadas disponiveis.');
        return;
      }

      const iniciar = async () => {
        let ponto1 = null;

        // Tentar coordenadas do ponto1 ja no registro (capturadas pelo playwright)
        if (r.ponto1_lat && r.ponto1_lng) {
          ponto1 = { lat: parseFloat(r.ponto1_lat), lng: parseFloat(r.ponto1_lng), endereco: r.ponto1_endereco || '' };
        }

        // Se nao tem, buscar no backend
        if (!ponto1) {
          try {
            setStatusMsg('Buscando Ponto 1 da OS ' + r.os_numero + '...');
            const res = await fetchAuth(API_URL + '/agent/historico/ponto1/' + r.os_numero);
            const data = await res.json();
            if (data.encontrado && data.ponto1 && data.ponto1.latitude && data.ponto1.longitude) {
              ponto1 = { lat: data.ponto1.latitude, lng: data.ponto1.longitude, endereco: data.ponto1.endereco || '' };
            }
          } catch (err) { console.warn('Ponto 1 nao encontrado:', err); }
        }

        if (typeof L === 'undefined') { setMapError('Leaflet nao carregado.'); return; }
        if (mapRef.current._leaflet_id) { mapRef.current._leaflet_id = null; mapRef.current.innerHTML = ''; }

        setStatusMsg('Renderizando mapa...');
        const map = L.map(mapRef.current, { zoomControl: true }).setView([-15.7, -47.9], 5);
        mapInstanceRef.current = map;
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '\u00a9 OSM', maxZoom: 19 }).addTo(map);

        const bounds = L.latLngBounds([]);
        const mkIcon = (cor, simbolo) => L.divIcon({
          className: '',
          html: '<div style="width:32px;height:32px;border-radius:50%;background:' + cor + ';border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:16px">' + simbolo + '</div>',
          iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -20],
        });

        if (ponto1) {
          L.marker([ponto1.lat, ponto1.lng], { icon: mkIcon('#2563eb', '1') })
            .addTo(map).bindPopup('<div style="text-align:center"><strong style="color:#2563eb">Ponto 1 (Origem)</strong><br><span style="font-size:11px">' + (ponto1.endereco || '') + '</span></div>');
          bounds.extend([ponto1.lat, ponto1.lng]);
        }

        if (temMotoboy) {
          L.marker([motoboyLat, motoboyLng], { icon: mkIcon('#dc2626', '\u2715') })
            .addTo(map).bindPopup('<div style="text-align:center"><strong style="color:#dc2626">End. Errado (GPS)</strong><br><span style="font-size:11px">' + (r.endereco_antigo || motoboyLat.toFixed(6) + ', ' + motoboyLng.toFixed(6)) + '</span></div>');
          bounds.extend([motoboyLat, motoboyLng]);
        }

        if (temCorrigido) {
          L.marker([corrLat, corrLng], { icon: mkIcon('#16a34a', '\u2713') })
            .addTo(map).bindPopup('<div style="text-align:center"><strong style="color:#16a34a">End. Corrigido</strong><br><span style="font-size:11px">' + (r.endereco_corrigido || corrLat.toFixed(6) + ', ' + corrLng.toFixed(6)) + '</span></div>');
          bounds.extend([corrLat, corrLng]);
        }

        const buscarRota = async (oLat, oLng, dLat, dLng) => {
          try {
            const url = 'https://router.project-osrm.org/route/v1/driving/' + oLng + ',' + oLat + ';' + dLng + ',' + dLat + '?overview=full&geometries=geojson';
            const resp = await fetch(url);
            const data = await resp.json();
            if (data.routes && data.routes[0]) return data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          } catch (err) { console.warn('OSRM erro:', err); }
          return null;
        };

        if (ponto1) {
          if (temMotoboy) {
            setStatusMsg('Tracando rota ate endereco errado...');
            const rota = await buscarRota(ponto1.lat, ponto1.lng, motoboyLat, motoboyLng);
            if (rota) {
              L.polyline(rota, { color: '#dc2626', weight: 5, opacity: 0.7, dashArray: '12, 8' }).addTo(map).bindPopup('<strong style="color:#dc2626">Rota ate endereco ERRADO</strong>');
            } else {
              L.polyline([[ponto1.lat, ponto1.lng], [motoboyLat, motoboyLng]], { color: '#dc2626', weight: 3, opacity: 0.5, dashArray: '8, 6' }).addTo(map);
            }
          }
          if (temCorrigido) {
            setStatusMsg('Tracando rota ate endereco corrigido...');
            const rota = await buscarRota(ponto1.lat, ponto1.lng, corrLat, corrLng);
            if (rota) {
              L.polyline(rota, { color: '#16a34a', weight: 5, opacity: 0.85 }).addTo(map).bindPopup('<strong style="color:#16a34a">Rota ate endereco CORRIGIDO</strong>');
            } else {
              L.polyline([[ponto1.lat, ponto1.lng], [corrLat, corrLng]], { color: '#16a34a', weight: 3, opacity: 0.6 }).addTo(map);
            }
          }
        } else {
          if (temMotoboy && temCorrigido) {
            L.polyline([[motoboyLat, motoboyLng], [corrLat, corrLng]], { color: '#9333ea', weight: 3, dashArray: '6, 6', opacity: 0.6 }).addTo(map);
            const dist = map.distance([motoboyLat, motoboyLng], [corrLat, corrLng]);
            const distStr = dist >= 1000 ? (dist / 1000).toFixed(2) + ' km' : Math.round(dist) + ' m';
            L.popup({ closeButton: false, autoClose: false, closeOnClick: false })
              .setLatLng([(motoboyLat + corrLat) / 2, (motoboyLng + corrLng) / 2])
              .setContent('<div style="font-weight:bold;color:#7c3aed">\u2194 ' + distStr + '</div>')
              .openOn(map);
          }
        }

        if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50] });
        setTimeout(() => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); setMapLoaded(true); }, 300);
      };

      iniciar();
      return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
    }, [registro]);

    if (mapError) {
      return h('div', { className: 'flex items-center justify-center h-full text-red-500 text-sm p-8' },
        h('div', { className: 'text-center' },
          h('p', { className: 'text-4xl mb-3' }, '\ud83d\uddfa\ufe0f'),
          h('p', { className: 'font-semibold' }, 'Nao foi possivel carregar o mapa'),
          h('p', { className: 'text-gray-400 mt-1' }, mapError)
        )
      );
    }

    return h('div', { className: 'relative w-full h-full' },
      !mapLoaded && h('div', { className: 'absolute inset-0 flex items-center justify-center bg-gray-100 z-10' },
        h('div', { className: 'text-center' },
          h('div', { className: 'w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2' }),
          h('p', { className: 'text-sm text-gray-500' }, statusMsg)
        )
      ),
      h('div', { ref: mapRef, style: { width: '100%', height: '100%', minHeight: '400px' } })
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

    const filtrosRef = useRef(filtros);
    filtrosRef.current = filtros;

    const carregar = useCallback(async (pg = 1, f) => {
      const filtrosAtivos = f || filtrosRef.current;
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: pg, per_page: PER_PAGE });
        if (filtrosAtivos.status)    params.set('status',    filtrosAtivos.status);
        if (filtrosAtivos.os_numero) params.set('os_numero', filtrosAtivos.os_numero);
        if (filtrosAtivos.de)        params.set('de',        filtrosAtivos.de);
        if (filtrosAtivos.ate)       params.set('ate',       filtrosAtivos.ate);

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
        const res = await fetchAuth(`${API_URL}/agent/validar/${id}`, { method: 'PATCH' });
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

    // Estado do modal de mapa
    const [mapaModal, setMapaModal] = useState(null); // { r } registro completo

    const excluir = async (id) => {
      if (!confirm('Tem certeza que deseja excluir esta solicitação? Esta ação não pode ser desfeita.')) return;
      try {
        const res = await fetchAuth(`${API_URL}/agent/historico/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showToast('Solicitação excluída!', 'success');
          carregar(page, filtros);
        } else {
          const data = await res.json().catch(() => ({}));
          showToast(data.erro || 'Erro ao excluir', 'error');
        }
      } catch { showToast('Erro de conexão', 'error'); }
    };

    const abrirMapa = (r) => {
      // Precisa de pelo menos as coordenadas corrigidas
      if (!r.latitude && !r.longitude && !r.motoboy_lat && !r.motoboy_lng) {
        showToast('Sem coordenadas disponíveis para este registro', 'error');
        return;
      }
      setMapaModal(r);
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
                ['ID','Motoboy','OS','Ponto','Status','End. Antigo','End. Novo','Criado em','Foto','Ações'].map(col =>
                  h('th', { key: col, className: 'px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide' }, col)
                )
              )
            ),
            h('tbody', null,
              dados.length === 0 && h('tr', null,
                h('td', { colSpan: 11, className: 'text-center py-12 text-gray-400' }, 'Nenhum registro encontrado.')
              ),
              dados.map(r => h(React.Fragment, { key: r.id },
                h('tr', {
                  className: `border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer ${expandido === r.id ? 'bg-purple-50' : ''}`,
                  onClick: () => setExpandido(expandido === r.id ? null : r.id),
                },
                  h('td', { className: 'px-3 py-3 font-mono text-gray-500 text-xs' }, `#${r.id}`),
                  h('td', { className: 'px-3 py-3 text-xs' },
                    r.usuario_nome
                      ? h('div', null,
                          h('div', { className: 'font-semibold text-gray-900' }, r.usuario_nome),
                          h('div', { className: 'text-gray-400 font-mono' }, `Cód: ${r.cod_profissional || '—'}`)
                        )
                      : h('span', { className: 'text-gray-400' }, '—')
                  ),
                  h('td', { className: 'px-3 py-3 font-semibold text-gray-900' }, r.os_numero),
                  h('td', { className: 'px-3 py-3 text-gray-600' }, `Ponto ${r.ponto}`),
                  h('td', { className: 'px-3 py-3' },
                    h(BadgeStatus, { status: r.status }),
                    r.status === 'sucesso' && r.frete_recalculado === false && h('div', {
                      className: 'mt-1 text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5 text-center',
                      title: 'Endereço corrigido, mas o frete NÃO foi recalculado automaticamente. Necessário recalcular manualmente.',
                    }, '⚠️ Frete pendente')
                  ),
                  h('td', { className: 'px-3 py-3 text-xs text-gray-500 max-w-[180px]' },
                    r.endereco_antigo
                      ? h('span', { className: 'line-clamp-2', title: r.endereco_antigo }, r.endereco_antigo)
                      : '—'
                  ),
                  h('td', { className: 'px-3 py-3 text-xs max-w-[180px]' },
                    r.endereco_corrigido
                      ? h('span', { className: 'text-green-700 font-medium line-clamp-2', title: r.endereco_corrigido }, r.endereco_corrigido)
                      : '—'
                  ),
                  h('td', { className: 'px-3 py-3 text-gray-500 text-xs' }, fmtDT(r.criado_em)),
                  h('td', { className: 'px-3 py-3' },
                    h('button', {
                      onClick: (e) => { e.stopPropagation(); abrirFoto(r.id); },
                      className: 'text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold transition',
                    }, '📷 Ver')
                  ),
                  h('td', { className: 'px-3 py-3' },
                    h('div', { className: 'flex flex-col gap-1' },
                      (r.latitude || r.motoboy_lat) && h('button', {
                        onClick: (e) => { e.stopPropagation(); abrirMapa(r); },
                        className: 'px-3 py-1 text-xs font-semibold rounded-lg text-white transition hover:opacity-80',
                        style: { background: '#2563eb' },
                      }, '🗺️ Mapa'),
                      h('button', {
                        onClick: (e) => { e.stopPropagation(); excluir(r.id); },
                        className: 'px-3 py-1 text-xs font-semibold rounded-lg text-white transition hover:opacity-80',
                        style: { background: '#dc2626' },
                      }, '🗑️ Excluir')
                    )
                  )
                ),
                expandido === r.id && h('tr', { key: `exp-${r.id}` },
                  h('td', { colSpan: 10, className: 'px-6 py-3 bg-gray-50 border-b border-gray-200' },
                    h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3 text-xs' },
                      // Endereço antigo detalhado
                      h('div', { className: 'p-2 bg-orange-50 rounded-lg' },
                        h('p', { className: 'font-semibold text-orange-700 mb-1' }, '📍 Endereço Antigo'),
                        h('p', { className: 'text-orange-600' }, r.endereco_antigo || 'Não capturado')
                      ),
                      // Endereço novo detalhado
                      h('div', { className: 'p-2 bg-green-50 rounded-lg' },
                        h('p', { className: 'font-semibold text-green-700 mb-1' }, '✅ Endereço Corrigido'),
                        h('p', { className: 'text-green-600' }, r.endereco_corrigido || 'Não disponível')
                      ),
                      // Erro se existir
                      r.detalhe_erro && h('div', { className: 'p-2 bg-red-50 rounded-lg col-span-2' },
                        h('p', { className: 'font-semibold text-red-700 mb-1' }, '🔍 Detalhe do erro'),
                        h('pre', { className: 'text-red-600 whitespace-pre-wrap font-mono' }, r.detalhe_erro)
                      )
                    )
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
            // Header: OS + Status
            h('div', { className: 'flex items-start justify-between mb-2' },
              h('div', null,
                h('span', { className: 'font-semibold text-gray-900' }, `OS ${r.os_numero}`),
                h('span', { className: 'ml-2 text-gray-400 text-xs' }, `Ponto ${r.ponto}`)
              ),
              h('div', { className: 'flex items-center gap-1' },
                h(BadgeStatus, { status: r.status }),
                r.status === 'sucesso' && r.frete_recalculado === false && h('span', {
                  className: 'text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200 rounded px-1 py-0.5',
                }, '⚠️')
              )
            ),
            r.usuario_nome && h('div', { className: 'text-xs text-gray-600 mb-1' },
              h('span', { className: 'font-semibold' }, '🏍️ '),
              r.usuario_nome,
              h('span', { className: 'text-gray-400 ml-1' }, `(Cód: ${r.cod_profissional || '—'})`)
            ),
            // Endereços
            r.endereco_antigo && h('div', { className: 'text-xs text-orange-600 bg-orange-50 p-2 rounded-lg mb-1' },
              h('span', { className: 'font-semibold' }, 'Antigo: '), r.endereco_antigo
            ),
            r.endereco_corrigido && h('div', { className: 'text-xs text-green-600 bg-green-50 p-2 rounded-lg mb-1' },
              h('span', { className: 'font-semibold' }, 'Novo: '), r.endereco_corrigido
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
            h('div', { className: 'flex gap-2 mt-3' },
              (r.latitude || r.motoboy_lat) && h('button', {
                onClick: () => abrirMapa(r),
                className: 'flex-1 py-2 text-sm font-semibold rounded-xl text-white',
                style: { background: '#2563eb' },
              }, '🗺️ Mapa'),
              h('button', {
                onClick: () => excluir(r.id),
                className: 'flex-1 py-2 text-sm font-semibold rounded-xl text-white',
                style: { background: '#dc2626' },
              }, '🗑️ Excluir')
            )
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

      // Modal de Mapa — traçados vermelho (errado) e verde (corrigido)
      mapaModal && h('div', {
        className: 'fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4',
        onClick: () => setMapaModal(null),
      },
        h('div', {
          className: 'relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden',
          style: { height: '80vh' },
          onClick: e => e.stopPropagation(),
        },
          h('div', { className: 'flex items-center justify-between px-4 py-3 bg-gray-50 border-b' },
            h('div', null,
              h('span', { className: 'font-bold text-gray-900' }, `OS ${mapaModal.os_numero} — Ponto ${mapaModal.ponto}`),
              h('div', { className: 'flex gap-3 mt-1 text-xs flex-wrap' },
                h('span', { className: 'flex items-center gap-1' },
                  h('span', { className: 'inline-block w-3 h-3 rounded-full', style: { background: '#2563eb' } }),
                  'Ponto 1 (origem)'
                ),
                h('span', { className: 'flex items-center gap-1' },
                  h('span', { className: 'inline-block w-3 h-3 rounded-full', style: { background: '#dc2626' } }),
                  'Endereço errado (motoboy GPS)'
                ),
                h('span', { className: 'flex items-center gap-1' },
                  h('span', { className: 'inline-block w-3 h-3 rounded-full', style: { background: '#16a34a' } }),
                  'Endereço corrigido'
                )
              )
            ),
            h('button', {
              onClick: () => setMapaModal(null),
              className: 'w-10 h-10 bg-gray-200 text-gray-800 rounded-full flex items-center justify-center text-lg font-bold hover:bg-gray-300',
            }, '✕')
          ),
          h(MapaTracado, { registro: mapaModal, API_URL, fetchAuth })
        )
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

  // ── ABA: Analytics (admin) ────────────────────────────────────────────────
  // Cache global para analytics — sobrevive a qualquer remount
  let _analyticsData = null;
  let _analyticsFetching = false;
  let _analyticsError = false;

  function TabAnalytics({ API_URL, fetchAuth, showToast }) {
    const containerRef = useRef(null);
    const [, forceUpdate] = useState(0);

    useEffect(() => {
      if (_analyticsData) {
        forceUpdate(n => n + 1);
        return;
      }
      if (_analyticsFetching) return;
      _analyticsFetching = true;

      (async () => {
        try {
          const res = await fetchAuth(`${API_URL}/agent/analytics`);
          _analyticsData = await res.json();
        } catch {
          _analyticsError = true;
        }
        _analyticsFetching = false;
        forceUpdate(n => n + 1);
      })();
    }, []);

    if (_analyticsFetching && !_analyticsData) return h('div', { className: 'flex items-center justify-center py-16' },
      h('div', { className: 'animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full' })
    );
    if (_analyticsError && !_analyticsData) return h('div', { className: 'text-center py-16 text-gray-400' }, 'Erro ao carregar.');
    if (!_analyticsData) return null;

    const data = _analyticsData;
    const t = data.totais || {};
    const meses = [...(data.por_mes || [])].reverse();
    const semanas = [...(data.por_semana || [])].reverse();
    const dias = data.por_dia || [];
    const maxMes = Math.max(...meses.map(m => parseInt(m.total) || 0), 1);
    const maxSemana = Math.max(...semanas.map(s => parseInt(s.total) || 0), 1);
    const maxDia = Math.max(...dias.map(d => parseInt(d.total) || 0), 1);

    return h('div', { className: 'max-w-7xl mx-auto p-4 sm:p-6 space-y-6' },

      // KPI Cards
      h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-4' },
        [
          { label: 'Total Ajustes',  value: t.total,     bg: 'bg-purple-50',  tc: 'text-purple-600', icon: '📊' },
          { label: 'Sucesso',        value: t.sucesso,   bg: 'bg-green-50',   tc: 'text-green-600',  icon: '✅' },
          { label: 'Erros',          value: t.erro,      bg: 'bg-red-50',     tc: 'text-red-600',    icon: '❌' },
          { label: 'Pendentes',      value: t.pendentes, bg: 'bg-yellow-50',  tc: 'text-yellow-600', icon: '⏳' },
        ].map(k => h('div', {
          key: k.label,
          className: `${k.bg} rounded-xl border border-gray-100 shadow-sm p-4`,
        },
          h('div', { className: 'flex items-center gap-2 mb-2' },
            h('span', { className: 'text-xl' }, k.icon),
            h('span', { className: 'text-xs font-semibold text-gray-500 uppercase' }, k.label)
          ),
          h('p', { className: `text-3xl font-bold ${k.tc}` }, k.value || 0)
        ))
      ),

      // Gráfico por mês
      h('div', { className: 'bg-white rounded-xl border border-gray-100 shadow-sm p-5' },
        h('h3', { className: 'text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide' }, '📈 Ajustes por Mês (últimos 6 meses)'),
        meses.length === 0
          ? h('p', { className: 'text-gray-400 text-sm' }, 'Sem dados')
          : h('div', { className: 'space-y-2' },
              meses.map(m => {
                const sucPct = (parseInt(m.sucesso) / maxMes) * 100;
                const errPct = (parseInt(m.erro) / maxMes) * 100;
                return h('div', { key: m.mes, className: 'flex items-center gap-3' },
                  h('span', { className: 'w-16 text-xs font-mono text-gray-500 flex-shrink-0' }, m.mes),
                  h('div', { className: 'flex-1 h-6 bg-gray-100 rounded-full overflow-hidden flex' },
                    sucPct > 0 && h('div', {
                      className: 'h-full bg-green-500',
                      style: { width: sucPct + '%', minWidth: sucPct > 0 ? '2px' : 0 },
                      title: `Sucesso: ${m.sucesso}`,
                    }),
                    errPct > 0 && h('div', {
                      className: 'h-full bg-red-400',
                      style: { width: errPct + '%', minWidth: errPct > 0 ? '2px' : 0 },
                      title: `Erro: ${m.erro}`,
                    })
                  ),
                  h('span', { className: 'w-10 text-right text-xs font-bold text-gray-700' }, m.total)
                );
              })
            ),
        h('div', { className: 'flex items-center gap-4 mt-3 text-xs text-gray-400' },
          h('span', { className: 'flex items-center gap-1' }, h('span', { className: 'w-3 h-3 rounded bg-green-500 inline-block' }), 'Sucesso'),
          h('span', { className: 'flex items-center gap-1' }, h('span', { className: 'w-3 h-3 rounded bg-red-400 inline-block' }), 'Erro')
        )
      ),

      // Gráfico por semana
      h('div', { className: 'bg-white rounded-xl border border-gray-100 shadow-sm p-5' },
        h('h3', { className: 'text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide' }, '📅 Ajustes por Semana (últimas 8 semanas)'),
        semanas.length === 0
          ? h('p', { className: 'text-gray-400 text-sm' }, 'Sem dados')
          : h('div', { className: 'flex items-end gap-2 h-40' },
              semanas.map(s => {
                const pct = (parseInt(s.total) / maxSemana) * 100;
                return h('div', { key: s.semana_inicio, className: 'flex-1 flex flex-col items-center gap-1' },
                  h('span', { className: 'text-xs font-bold text-gray-600' }, s.total),
                  h('div', { className: 'w-full rounded-t-lg bg-purple-500', style: { height: Math.max(pct, 4) + '%' } }),
                  h('span', { className: 'text-[10px] text-gray-400 mt-1' }, s.semana_inicio)
                );
              })
            )
      ),

      // Gráfico por dia (últimos 7 dias)
      h('div', { className: 'bg-white rounded-xl border border-gray-100 shadow-sm p-5' },
        h('h3', { className: 'text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide' }, '📆 Solicitações por Dia (últimos 7 dias)'),
        dias.length === 0
          ? h('p', { className: 'text-gray-400 text-sm' }, 'Sem dados nos últimos 7 dias')
          : h('div', { className: 'space-y-2' },
              dias.map(d => {
                const sucPct = (parseInt(d.sucesso) / maxDia) * 100;
                const errPct = (parseInt(d.erro) / maxDia) * 100;
                const total = parseInt(d.total) || 0;
                const sucesso = parseInt(d.sucesso) || 0;
                const erro = parseInt(d.erro) || 0;
                return h('div', { key: d.dia, className: 'flex items-center gap-3' },
                  h('span', { className: 'w-12 text-xs font-mono font-semibold text-gray-600 flex-shrink-0' }, d.dia),
                  h('div', { className: 'flex-1 h-7 bg-gray-100 rounded-lg overflow-hidden flex relative' },
                    sucPct > 0 && h('div', {
                      className: 'h-full bg-green-500 transition-all',
                      style: { width: sucPct + '%', minWidth: sucPct > 0 ? '2px' : 0 },
                      title: `Sucesso: ${sucesso}`,
                    }),
                    errPct > 0 && h('div', {
                      className: 'h-full bg-red-400 transition-all',
                      style: { width: errPct + '%', minWidth: errPct > 0 ? '2px' : 0 },
                      title: `Erro: ${erro}`,
                    })
                  ),
                  h('div', { className: 'w-28 flex-shrink-0 flex items-center gap-1.5 text-xs' },
                    h('span', { className: 'font-bold text-gray-800 w-6 text-right' }, total),
                    h('span', { className: 'text-green-600 font-medium' }, `✅${sucesso}`),
                    erro > 0 && h('span', { className: 'text-red-500 font-medium' }, `❌${erro}`)
                  )
                );
              }),
              h('div', { className: 'flex items-center gap-4 mt-3 text-xs text-gray-400' },
                h('span', { className: 'flex items-center gap-1' },
                  h('span', { className: 'w-3 h-3 rounded bg-green-500 inline-block' }), 'Sucesso'),
                h('span', { className: 'flex items-center gap-1' },
                  h('span', { className: 'w-3 h-3 rounded bg-red-400 inline-block' }), 'Erro')
              )
            )
      ),

      // Red Flags
      h('div', { className: 'bg-white rounded-xl border shadow-sm overflow-hidden' },
        h('div', { className: 'p-4 border-b bg-red-50 flex items-center gap-2' },
          h('span', { className: 'text-xl' }, '🚩'),
          h('h3', { className: 'text-sm font-bold text-red-700 uppercase tracking-wide' }, 'Red Flags — Profissionais com +10 solicitações na semana'),
        ),
        (data.red_flags || []).length === 0
          ? h('div', { className: 'p-6 text-center text-gray-400 text-sm' }, '✅ Nenhum profissional com volume anormal esta semana.')
          : h('div', { className: 'divide-y divide-gray-100' },
              data.red_flags.map((rf, i) => h('div', {
                key: i,
                className: 'flex items-center justify-between p-4 hover:bg-red-50 transition',
              },
                h('div', null,
                  h('p', { className: 'font-semibold text-gray-800' }, rf.usuario_nome || '—'),
                  h('p', { className: 'text-xs text-gray-400 font-mono' }, `Cód: ${rf.cod_profissional || '—'}`)
                ),
                h('div', { className: 'text-right' },
                  h('p', { className: 'text-2xl font-bold text-red-600' }, rf.total_semana),
                  h('p', { className: 'text-xs text-gray-400' }, `✅ ${rf.sucesso} | ❌ ${rf.erro}`)
                )
              ))
            )
      ),

      // Top Profissionais
      h('div', { className: 'bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden' },
        h('div', { className: 'p-4 border-b bg-purple-50' },
          h('h3', { className: 'text-sm font-bold text-purple-700 uppercase tracking-wide' }, '🏍️ Top Profissionais (mais solicitações)')
        ),
        h('div', { className: 'divide-y divide-gray-100 max-h-96 overflow-y-auto' },
          (data.top_profissionais || []).map((p, i) => h('div', {
            key: i,
            className: 'flex items-center justify-between px-4 py-3 hover:bg-gray-50',
          },
            h('div', { className: 'flex items-center gap-3' },
              h('span', { className: `w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}` }, i + 1),
              h('div', null,
                h('p', { className: 'text-sm font-semibold text-gray-800' }, p.usuario_nome || '—'),
                h('p', { className: 'text-xs text-gray-400 font-mono' }, `Cód: ${p.cod_profissional || '—'}`)
              )
            ),
            h('div', { className: 'text-right' },
              h('span', { className: 'text-lg font-bold text-gray-700' }, p.total),
              h('div', { className: 'text-[10px] text-gray-400' }, `✅${p.sucesso} ❌${p.erro}`)
            )
          ))
        )
      )
    );
  }

  // ── Componente raiz do módulo ───────────────────────────────────────────────
  // Usa um portal DOM isolado para que re-renders do App pai não afetem este módulo.
  // O wrapper externo é o que o app.js renderiza — ele cria um div e monta o módulo real via ReactDOM.render uma única vez.

  // Componente interno REAL (montado uma única vez)
  function ModuloAgenteInterno({ initialProps }) {
    const propsRef = useRef(initialProps);
    const { usuario, API_URL, fetchAuth, HeaderCompacto, showToast, he, onLogout, socialProfile, onNavigate } = propsRef.current;

    const isAdmin = usuario && (usuario.role === 'admin' || usuario.role === 'admin_master');
    const [aba, setAba] = useState(isAdmin ? 'historico' : 'formulario');
    
    // Props voláteis via ref global (atualizadas pelo wrapper sem re-render)
    const volatileRef = useRef({ isLoading: false, lastUpdate: null, onRefresh: null, i: null });

    // Expor setter para o wrapper atualizar props voláteis
    useEffect(() => {
      window.__agenteVolatileRef = volatileRef;
      return () => { delete window.__agenteVolatileRef; };
    }, []);

    const ABAS = isAdmin
      ? [{ id: 'historico', label: '📋 Histórico' }, { id: 'analytics', label: '📊 Analytics' }]
      : [{ id: 'formulario', label: '📍 Correção' }, { id: 'meu-historico', label: '📋 Minhas Solicitações' }];

    return h('div', { className: `${HeaderCompacto ? 'min-h-screen' : 'overflow-y-auto'} bg-gray-50 flex flex-col` },

      HeaderCompacto && h(HeaderCompacto, {
        usuario,
        moduloAtivo: 'agente',
        abaAtiva: aba,
        onGoHome: () => he && he('home'),
        onNavigate: onNavigate || ((m) => he && he(m)),
        onLogout: onLogout || (() => {}),
        onChangeTab: setAba,
        socialProfile,
        isLoading: volatileRef.current.isLoading,
        lastUpdate: volatileRef.current.lastUpdate,
        onRefresh: volatileRef.current.onRefresh,
      }),

      // Sub-tabs
      ABAS.length > 1 && h('div', { className: `bg-white border-b border-gray-200 shadow-sm ${HeaderCompacto ? 'sticky top-[52px] z-20' : ''}` },
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

      // Tabs — display:none para evitar remount
      h('div', { className: 'flex-1' },
        isAdmin
          ? h(React.Fragment, null,
              h('div', { style: { display: aba === 'historico' ? 'block' : 'none' } },
                h(TabHistorico, { API_URL, fetchAuth, showToast, usuario })
              ),
              h('div', { style: { display: aba === 'analytics' ? 'block' : 'none' } },
                h(TabAnalytics, { API_URL, fetchAuth, showToast })
              )
            )
          : h(React.Fragment, null,
              h('div', { style: { display: aba === 'formulario' ? 'block' : 'none' } },
                h(TabFormulario, { API_URL, fetchAuth, showToast })
              ),
              h('div', { style: { display: aba === 'meu-historico' ? 'block' : 'none' } },
                h(TabMeuHistorico, { API_URL, fetchAuth, showToast })
              )
            )
      )
    );
  }

  // Wrapper externo — este é o que o app.js monta/desmonta.
  // Ele cria um container DOM e renderiza o módulo real UMA ÚNICA VEZ.
  window.ModuloAgenteComponent = function ModuloAgenteWrapper(props) {
    const containerRef = useRef(null);
    const mountedRef = useRef(false);
    const divRef = useRef(null);

    // Atualizar props voláteis sem causar re-render
    useEffect(() => {
      if (window.__agenteVolatileRef) {
        window.__agenteVolatileRef.current = {
          isLoading: props.isLoading || props.n,
          lastUpdate: props.lastUpdate || props.E,
          onRefresh: props.onRefresh,
          i: props.i,
        };
      }
    });

    useEffect(() => {
      if (mountedRef.current || !containerRef.current) return;
      mountedRef.current = true;

      // Montar o módulo real uma única vez
      ReactDOM.render(
        h(ModuloAgenteInterno, { initialProps: props }),
        containerRef.current
      );

      return () => {
        // Limpar quando o módulo é realmente desmontado (navegar para outro módulo)
        if (containerRef.current) {
          ReactDOM.unmountComponentAtNode(containerRef.current);
        }
        mountedRef.current = false;
      };
    }, []);

    return h('div', { ref: containerRef, className: 'agente-portal-root', style: { minHeight: '100vh' } });
  };

  console.log('✅ Módulo Agente RPA carregado — BUILD 2025-03-01T15:00 — COM sub-tabs meu-historico');
})();
