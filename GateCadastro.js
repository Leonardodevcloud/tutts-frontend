// ============================================================
// GATE DE CADASTRO DO MOTOBOY - v1 (2026-05)
// Tela obrigatória: selfie ao vivo + WhatsApp validado.
// Aparece por cima de tudo até o motoboy completar.
// Padrão: Vanilla JS + React via CDN (sem JSX)
// ============================================================

(function () {
  const e = React.createElement;

  function GateCadastro({ usuario, apiUrl, fetchAuth, showToast, onConcluido }) {
    const _fetch = React.useRef(fetchAuth || (typeof window !== 'undefined' && window.fetchAuth) || fetch);
    const _api = React.useRef(apiUrl || (typeof window !== 'undefined' && window.API_URL) || '');
    React.useEffect(() => { if (fetchAuth) _fetch.current = fetchAuth; }, [fetchAuth]);

    const [verificando, setVerificando] = React.useState(true);
    const [cameraAberta, setCameraAberta] = React.useState(false);
    const [fotoSelfie, setFotoSelfie] = React.useState(null); // data URL
    const [telefone, setTelefone] = React.useState('');
    const [waEstado, setWaEstado] = React.useState(null); // null|verificando|ok|sem_whatsapp|invalido
    const [enviando, setEnviando] = React.useState(false);
    const [erroCamera, setErroCamera] = React.useState(null);

    const videoRef = React.useRef(null);
    const streamRef = React.useRef(null);

    const toast = (msg, tipo) => { if (typeof showToast === 'function') showToast(msg, tipo); };

    // ── Revalida com o backend ao montar ────────────────────────────
    // O usuário em memória pode estar desatualizado (sessionStorage antigo).
    // Confirma a verdade no banco — se já completou, libera direto.
    React.useEffect(() => {
      let vivo = true;
      (async () => {
        try {
          const r = await _fetch.current(`${_api.current}/perfil/status-cadastro`);
          if (r.ok) {
            const d = await r.json();
            if (vivo && d.cadastro_completo === true) {
              if (typeof onConcluido === 'function') onConcluido();
              return;
            }
            if (vivo && d.exige_cadastro === false) {
              // não é motoboy — não deveria ver o gate
              if (typeof onConcluido === 'function') onConcluido();
              return;
            }
          }
        } catch (err) {
          // se falhar, segue mostrando o gate (mais seguro)
        }
        if (vivo) setVerificando(false);
      })();
      return () => { vivo = false; };
    }, []);

    // ── Câmera ──────────────────────────────────────────────────────
    const abrirCamera = async () => {
      setErroCamera(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } },
          audio: false,
        });
        streamRef.current = stream;
        setCameraAberta(true);
        // o vídeo é montado no próximo render — conecta o stream nele
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        }, 50);
      } catch (err) {
        console.error('Erro câmera:', err);
        setErroCamera('Não foi possível abrir a câmera. Verifique a permissão no navegador.');
      }
    };

    const fecharCamera = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setCameraAberta(false);
    };

    const tirarFoto = () => {
      const video = videoRef.current;
      if (!video) return;
      const lado = Math.min(video.videoWidth, video.videoHeight) || 480;
      const canvas = document.createElement('canvas');
      canvas.width = lado;
      canvas.height = lado;
      const ctx = canvas.getContext('2d');
      // recorte central quadrado + espelha (selfie)
      const sx = (video.videoWidth - lado) / 2;
      const sy = (video.videoHeight - lado) / 2;
      ctx.translate(lado, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, sx, sy, lado, lado, 0, 0, lado, lado);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      setFotoSelfie(dataUrl);
      fecharCamera();
    };

    // limpa o stream se o componente desmontar
    React.useEffect(() => () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    }, []);

    // ── Validação do WhatsApp (no blur) ─────────────────────────────
    const validarWhats = async () => {
      const tel = (telefone || '').trim();
      if (!tel) { setWaEstado(null); return; }
      setWaEstado('verificando');
      try {
        const r = await _fetch.current(`${_api.current}/perfil/validar-whatsapp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telefone: tel }),
        });
        const d = await r.json();
        if (d.estado === 'ok' || d.estado === 'indeterminado') setWaEstado('ok');
        else if (d.estado === 'sem_whatsapp') setWaEstado('sem_whatsapp');
        else setWaEstado('invalido');
      } catch (err) {
        setWaEstado(null); // erro de conexão — não bloqueia, valida no envio
      }
    };

    // ── Envio final ─────────────────────────────────────────────────
    const podeConcluir = !!fotoSelfie && (telefone || '').trim().length >= 10 && waEstado !== 'sem_whatsapp' && waEstado !== 'invalido';

    const concluir = async () => {
      if (!fotoSelfie) { toast('Tire sua foto primeiro', 'error'); return; }
      if (!(telefone || '').trim()) { toast('Informe seu WhatsApp', 'error'); return; }
      setEnviando(true);
      try {
        const r = await _fetch.current(`${_api.current}/perfil/completar-cadastro`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ foto_selfie: fotoSelfie, telefone: telefone.trim() }),
        });
        const d = await r.json();
        if (r.ok && d.ok) {
          toast('Cadastro concluído!', 'success');
          if (typeof onConcluido === 'function') onConcluido();
        } else if (d.error === 'sem_whatsapp') {
          setWaEstado('sem_whatsapp');
          toast('Esse número não tem WhatsApp', 'error');
        } else {
          toast(d.error || d.mensagem || 'Erro ao salvar cadastro', 'error');
        }
      } catch (err) {
        toast('Erro de conexão. Tente novamente.', 'error');
      }
      setEnviando(false);
    };

    // ── Render ──────────────────────────────────────────────────────
    if (verificando) {
      return e('div', {
        style: {
          position: 'fixed', inset: 0, background: '#26215C',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999,
        }
      }, e('div', { style: { color: '#CECBF6', fontSize: '14px' } }, 'Carregando...'));
    }

    const ROXO = '#534AB7', ROXO_ESC = '#26215C', ROXO_CLARO = '#AFA9EC';

    return e('div', {
      style: {
        position: 'fixed', inset: 0, background: '#F3F4F6', zIndex: 999999,
        overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center',
      }
    },
      // Topo
      e('div', {
        style: { width: '100%', background: ROXO_ESC, padding: '18px 20px', boxSizing: 'border-box' }
      },
        e('p', { style: { color: '#fff', fontSize: '17px', fontWeight: 600, margin: 0 } }, 'Atualização cadastral'),
        e('p', { style: { color: ROXO_CLARO, fontSize: '12px', margin: '4px 0 0' } }, 'Necessário para continuar')
      ),

      // Conteúdo
      e('div', {
        style: { width: '100%', maxWidth: '440px', padding: '20px', boxSizing: 'border-box' }
      },
        e('p', { style: { fontSize: '14px', color: '#4b5563', lineHeight: 1.5, margin: '0 0 20px' } },
          `Olá, ${(usuario && (usuario.fullName || usuario.full_name || usuario.nome)) || ''}! Para usar a Central, precisamos da sua foto e do seu WhatsApp. É rápido e só vai pedir uma vez.`),

        // ─── FOTO ───
        e('div', { style: { fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' } },
          'Sua foto ', e('span', { style: { color: '#A32D2D' } }, '*')),

        cameraAberta
          ? e('div', null,
              e('div', {
                style: { background: '#000', borderRadius: '10px', overflow: 'hidden', position: 'relative', aspectRatio: '1/1' }
              },
                e('video', {
                  ref: videoRef,
                  autoPlay: true, playsInline: true, muted: true,
                  style: { width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }
                })
              ),
              e('div', { style: { display: 'flex', gap: '8px', marginTop: '8px' } },
                e('button', {
                  onClick: tirarFoto,
                  style: { flex: 1, background: ROXO, color: '#fff', border: 0, height: '46px', borderRadius: '10px', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }
                }, '📸 Tirar foto'),
                e('button', {
                  onClick: fecharCamera,
                  style: { background: 'transparent', border: '1px solid #d1d5db', color: '#6b7280', height: '46px', padding: '0 16px', borderRadius: '10px', fontSize: '14px', cursor: 'pointer' }
                }, 'Cancelar')
              )
            )
          : fotoSelfie
            ? e('div', null,
                e('div', {
                  style: { background: '#1D9E75', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }
                },
                  e('img', {
                    src: fotoSelfie,
                    alt: 'Sua selfie',
                    style: { width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #fff' }
                  }),
                  e('span', { style: { fontSize: '13px', color: '#E1F5EE', fontWeight: 500 } }, '✓ Foto capturada')
                ),
                e('button', {
                  onClick: abrirCamera,
                  style: { width: '100%', background: 'transparent', border: '1px solid #d1d5db', color: '#6b7280', height: '40px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', marginTop: '8px' }
                }, '📷 Tirar outra foto')
              )
            : e('div', null,
                e('div', {
                  onClick: abrirCamera,
                  style: {
                    background: ROXO_ESC, borderRadius: '10px', aspectRatio: '1/1',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: '12px', cursor: 'pointer',
                  }
                },
                  e('div', {
                    style: { width: '120px', height: '120px', borderRadius: '50%', border: '2px dashed ' + ROXO_CLARO, display: 'flex', alignItems: 'center', justifyContent: 'center' }
                  }, e('span', { style: { fontSize: '40px' } }, '📷')),
                  e('span', { style: { fontSize: '12px', color: '#CECBF6' } }, 'Toque para abrir a câmera')
                ),
                erroCamera && e('p', { style: { fontSize: '12px', color: '#A32D2D', margin: '8px 0 0' } }, erroCamera)
              ),

        // ─── WHATSAPP ───
        e('div', { style: { fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px', margin: '20px 0 8px' } },
          'Seu WhatsApp ', e('span', { style: { color: '#A32D2D' } }, '*')),
        e('input', {
          type: 'tel',
          inputMode: 'numeric',
          placeholder: '(71) 99999-9999',
          value: telefone,
          onChange: (ev) => { setTelefone(ev.target.value); setWaEstado(null); },
          onBlur: validarWhats,
          style: {
            width: '100%', height: '46px', boxSizing: 'border-box', padding: '0 14px',
            fontSize: '15px', borderRadius: '10px',
            border: '1px solid ' + (waEstado === 'ok' ? '#1D9E75' : (waEstado === 'sem_whatsapp' || waEstado === 'invalido') ? '#A32D2D' : '#d1d5db'),
            outline: 'none',
          }
        }),
        (() => {
          if (waEstado === 'verificando') return e('div', { style: { fontSize: '12px', color: '#9ca3af', marginTop: '6px' } }, 'Verificando...');
          if (waEstado === 'ok') return e('div', { style: { fontSize: '12px', color: '#0F6E56', marginTop: '6px', fontWeight: 500 } }, '✓ WhatsApp confirmado');
          if (waEstado === 'sem_whatsapp') return e('div', { style: { fontSize: '12px', color: '#A32D2D', marginTop: '6px' } }, '✕ Esse número não tem WhatsApp');
          if (waEstado === 'invalido') return e('div', { style: { fontSize: '12px', color: '#A32D2D', marginTop: '6px' } }, '✕ Número inválido');
          return e('div', { style: { fontSize: '12px', color: '#9ca3af', marginTop: '6px' } }, 'Vamos confirmar se tem WhatsApp');
        })(),

        // ─── BOTÃO ───
        e('button', {
          onClick: concluir,
          disabled: !podeConcluir || enviando,
          style: {
            width: '100%', height: '48px', marginTop: '24px', borderRadius: '10px',
            border: 0, fontSize: '15px', fontWeight: 600,
            background: (podeConcluir && !enviando) ? ROXO : '#C7C5E8',
            color: '#fff',
            cursor: (podeConcluir && !enviando) ? 'pointer' : 'not-allowed',
          }
        }, enviando ? 'Salvando...' : 'Concluir e entrar'),

        e('p', { style: { fontSize: '12px', color: '#9ca3af', textAlign: 'center', margin: '12px 0 24px', lineHeight: 1.5 } },
          'Os dois campos são obrigatórios. Não é possível pular esta etapa.')
      )
    );
  }

  if (typeof window !== 'undefined') {
    window.GateCadastro = GateCadastro;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GateCadastro };
  }

  console.log('✅ GateCadastro v1.0 carregado');
})();
