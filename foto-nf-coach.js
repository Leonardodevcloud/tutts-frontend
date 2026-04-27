/**
 * Arquivo: foto-nf-coach.js
 * 
 * 📷 Camera Coaching para foto da NF
 *
 * Componente React standalone que substitui o input file tradicional para
 * captura da foto da nota fiscal. Combina:
 *
 *   FASE 1 — Validação local em tempo real:
 *     - Nitidez (Laplacian variance)
 *     - Brilho médio
 *     - Contraste
 *     - Tudo no celular do motoboy, sem rede, instantâneo
 *
 *   FASE 2 — Pré-validação Gemini (após captura):
 *     - Chama POST /agent/validar-foto-nf-preview
 *     - Mostra dica acionável se foto for ruim
 *     - Mostra CNPJ lido se foto for boa (motoboy confirma visualmente)
 *
 *   FASE 3 — Camera coaching real-time:
 *     - Stream da câmera ao vivo via getUserMedia
 *     - Análise local de cada frame (1.5s) com indicadores visuais
 *     - Auto-captura quando todos indicadores OK por 0.5s
 *     - Fallback pra input file tradicional se câmera não disponível
 *
 * Como o app.js usa React via CDN sem JSX, este componente é construído com
 * React.createElement (h) — segue o padrão do modulo-agente.js.
 *
 * USO (no modulo-agente.js):
 *   const FotoNfCoach = window.FotoNfCoach;
 *   ...
 *   h(FotoNfCoach, {
 *     API_URL,
 *     fetchAuth,
 *     onCapturada: (base64) => setFotoNfB64(base64),  // foto final aprovada
 *     onCancelar: () => { ... },                       // motoboy clicou em fechar
 *   })
 *
 * Expõe: window.FotoNfCoach (componente React) + window.fotoNfCoachUtils
 *        (funções puras pra outros módulos reutilizarem)
 */

(function () {
  'use strict';

  const { useState, useEffect, useRef, useCallback } = React;
  const h = React.createElement;

  // ════════════════════════════════════════════════════════════════════════
  // FASE 1 — Funções puras de análise de qualidade (rodam local)
  // ════════════════════════════════════════════════════════════════════════

  // Limites calibrados empiricamente. Ajustáveis.
  const LIMITES = {
    NITIDEZ_MIN:        80,    // < 80 = borrada (Laplacian variance)
    BRILHO_MIN:         40,    // < 40 = muito escuro
    BRILHO_MAX:         225,   // > 225 = muito claro / queimado
    CONTRASTE_MIN:      30,    // < 30 = sem contraste (foto chapada)
    RESOLUCAO_MIN:      640,   // largura mínima em pixels
  };

  /**
   * Calcula nitidez via variância do Laplaciano em uma imagem grayscale.
   * Variância alta = bordas nítidas = foto focada.
   * Variância baixa = bordas suaves = foto borrada.
   *
   * Usa amostragem (1 a cada N pixels) pra performance — análise completa
   * em 1080p tomaria 200ms+. Com amostragem fica em 20-40ms.
   */
  function calcularNitidez(canvas) {
    const ctx = canvas.getContext('2d');
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const STRIDE = 4;  // analisa 1 a cada 4 pixels (16x mais rápido)

    let soma = 0, somaSq = 0, count = 0;
    for (let y = 1; y < height - 1; y += STRIDE) {
      for (let x = 1; x < width - 1; x += STRIDE) {
        const i = (y * width + x) * 4;
        // Grayscale: luminância padrão 0.299R + 0.587G + 0.114B
        const center = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];

        const iTop = ((y-1) * width + x) * 4;
        const top = 0.299 * data[iTop] + 0.587 * data[iTop+1] + 0.114 * data[iTop+2];

        const iBot = ((y+1) * width + x) * 4;
        const bot = 0.299 * data[iBot] + 0.587 * data[iBot+1] + 0.114 * data[iBot+2];

        const iLft = (y * width + x - 1) * 4;
        const lft = 0.299 * data[iLft] + 0.587 * data[iLft+1] + 0.114 * data[iLft+2];

        const iRgt = (y * width + x + 1) * 4;
        const rgt = 0.299 * data[iRgt] + 0.587 * data[iRgt+1] + 0.114 * data[iRgt+2];

        const lap = 4 * center - top - bot - lft - rgt;
        soma += lap;
        somaSq += lap * lap;
        count++;
      }
    }

    if (count === 0) return 0;
    const media = soma / count;
    return (somaSq / count) - (media * media);  // variância
  }

  /**
   * Calcula brilho médio (0-255) e contraste (desvio padrão).
   * Tudo num passo só por performance.
   */
  function calcularBrilhoEContraste(canvas) {
    const ctx = canvas.getContext('2d');
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const STRIDE = 4;

    let soma = 0, somaSq = 0, count = 0;
    for (let y = 0; y < height; y += STRIDE) {
      for (let x = 0; x < width; x += STRIDE) {
        const i = (y * width + x) * 4;
        const lum = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
        soma += lum;
        somaSq += lum * lum;
        count++;
      }
    }

    if (count === 0) return { brilho: 0, contraste: 0 };
    const media = soma / count;
    const variancia = (somaSq / count) - (media * media);
    return {
      brilho: media,
      contraste: Math.sqrt(Math.max(0, variancia)),
    };
  }

  /**
   * Análise completa local de uma imagem (em canvas).
   * Retorna métricas + decisão (ok=true/false) + dica.
   */
  function analisarLocal(canvas) {
    const t0 = performance.now();
    const nitidez = calcularNitidez(canvas);
    const { brilho, contraste } = calcularBrilhoEContraste(canvas);

    const problemas = [];
    let dica = null;

    // Resolução
    if (canvas.width < LIMITES.RESOLUCAO_MIN) {
      problemas.push('resolucao_baixa');
      dica = dica || 'Câmera com resolução muito baixa.';
    }
    // Nitidez (foco)
    if (nitidez < LIMITES.NITIDEZ_MIN) {
      problemas.push('borrada');
      dica = dica || '📷 Segure firme — foto borrada';
    }
    // Luz
    if (brilho < LIMITES.BRILHO_MIN) {
      problemas.push('muito_escura');
      dica = dica || '🔦 Muito escura — vá pra um lugar mais iluminado';
    } else if (brilho > LIMITES.BRILHO_MAX) {
      problemas.push('muito_clara');
      dica = dica || '☀️ Muito clara — saia do sol direto';
    }
    // Contraste
    if (contraste < LIMITES.CONTRASTE_MIN) {
      problemas.push('sem_contraste');
      dica = dica || '📄 Aproxime mais a câmera da NF';
    }

    const ok = problemas.length === 0;

    return {
      ok,
      nitidez,
      brilho,
      contraste,
      width: canvas.width,
      height: canvas.height,
      problemas,
      dica,
      tempo_ms: performance.now() - t0,
    };
  }

  /**
   * Reduz uma imagem (File ou ImageBitmap) num canvas com largura máxima
   * dada, mantendo proporção. Retorna o canvas pronto pra ser analisado.
   */
  async function imagemParaCanvas(source, maxWidth = 1200) {
    let bitmap;
    if (source instanceof HTMLCanvasElement) return source;
    if (source instanceof File || source instanceof Blob) {
      bitmap = await createImageBitmap(source);
    } else if (source instanceof HTMLVideoElement) {
      // Captura frame do vídeo
      bitmap = await createImageBitmap(source);
    } else {
      throw new Error('imagemParaCanvas: tipo de source não suportado');
    }

    let w = bitmap.width;
    let h = bitmap.height;
    if (w > maxWidth) {
      h = Math.round((h * maxWidth) / w);
      w = maxWidth;
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, w, h);
    try { bitmap.close && bitmap.close(); } catch(_) {}
    return canvas;
  }

  /**
   * Encoda canvas pra base64 JPEG (data URL).
   */
  function canvasParaBase64(canvas, quality = 0.7) {
    return canvas.toDataURL('image/jpeg', quality);
  }

  // Expõe utilidades pra outros módulos
  window.fotoNfCoachUtils = {
    analisarLocal,
    imagemParaCanvas,
    canvasParaBase64,
    LIMITES,
  };

  // ════════════════════════════════════════════════════════════════════════
  // FASE 2 — Pré-validação Gemini (chamada à API)
  // ════════════════════════════════════════════════════════════════════════

  async function preValidarComGemini(API_URL, fetchAuth, base64) {
    try {
      const res = await fetchAuth(`${API_URL}/agent/validar-foto-nf-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foto: base64 }),
      });
      return await res.json();
    } catch (err) {
      // Falha aberta — deixa motoboy mandar
      return {
        ok: true,
        qualidade: 'media',
        cnpj_lido: null,
        dica: null,
        erro: 'erro_rede',
      };
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // FASE 3 — Componente Camera Coaching
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Componente principal que apresenta a câmera ao vivo + indicadores.
   *
   * Props:
   *   API_URL (string)            — base da API
   *   fetchAuth (function)        — wrapper de fetch com auth
   *   onCapturada (function)      — callback(base64) chamado quando foto é APROVADA pela IA
   *   onCancelar (function)       — callback() chamado quando motoboy fecha sem capturar
   *   onTrocarParaCnpj (function) — callback() chamado quando motoboy desiste e quer digitar CNPJ
   */
  function FotoNfCoach({ API_URL, fetchAuth, onCapturada, onCancelar, onTrocarParaCnpj }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    // Estado da câmera
    const [cameraDisponivel, setCameraDisponivel] = useState(true);
    const [cameraIniciando, setCameraIniciando] = useState(true);
    const [erroCamera, setErroCamera] = useState(null);

    // Estado das métricas em tempo real (Fase 1) — só visual, NÃO auto-captura mais
    const [metricas, setMetricas] = useState(null);

    // Estado da captura
    const [capturando, setCapturando] = useState(false);
    const [fotoCapturada, setFotoCapturada] = useState(null);  // base64 após captura
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewResult, setPreviewResult] = useState(null);  // resultado da Fase 2

    // Refs para controlar análise contínua (não causa re-render)
    const analiseAtivaRef = useRef(false);
    const ultimoFrameRef = useRef(0);

    // ── 1. Iniciar câmera ────────────────────────────────────────────────
    useEffect(() => {
      let cancelado = false;

      async function iniciar() {
        try {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('camera_nao_suportada');
          }

          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },  // câmera traseira
              width:  { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          });

          if (cancelado) {
            stream.getTracks().forEach(t => t.stop());
            return;
          }

          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play().catch(() => {});
          }
          setCameraIniciando(false);
          analiseAtivaRef.current = true;
        } catch (err) {
          if (cancelado) return;
          setCameraDisponivel(false);
          setCameraIniciando(false);
          setErroCamera(err.message || 'erro_camera');
        }
      }

      iniciar();

      return () => {
        cancelado = true;
        analiseAtivaRef.current = false;
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
      };
    }, []);

    // ── 2. Loop de análise contínua (1 frame a cada 1500ms) ──────────────
    // 2026-04 v4.1: REMOVIDA auto-captura — motoboy reclamou que era invasivo.
    // Agora os indicadores são SÓ visuais (✓ Foco, ✓ Iluminação, ✓ Contraste).
    // A captura SEMPRE é feita pelo botão central (clique manual).
    useEffect(() => {
      if (!cameraDisponivel || cameraIniciando || fotoCapturada) return;

      const loop = setInterval(async () => {
        if (!analiseAtivaRef.current || !videoRef.current) return;
        if (videoRef.current.readyState < 2) return;  // esperando dados
        const agora = Date.now();
        if (agora - ultimoFrameRef.current < 1400) return;
        ultimoFrameRef.current = agora;

        try {
          const canvas = await imagemParaCanvas(videoRef.current, 800);
          const m = analisarLocal(canvas);
          setMetricas(m);
        } catch (err) {
          // Silencioso — análise é best-effort
        }
      }, 1500);

      return () => clearInterval(loop);
    }, [cameraDisponivel, cameraIniciando, fotoCapturada]);

    // ── 3. Capturar foto ─────────────────────────────────────────────────
    const capturar = useCallback(async () => {
      if (capturando || !videoRef.current) return;
      setCapturando(true);
      analiseAtivaRef.current = false;

      try {
        // Captura em alta qualidade
        const canvas = await imagemParaCanvas(videoRef.current, 1200);
        const base64 = canvasParaBase64(canvas, 0.75);
        setFotoCapturada(base64);

        // Para a câmera (economiza bateria/CPU)
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }

        // Dispara Fase 2 (pré-validação Gemini)
        setPreviewLoading(true);
        const resultado = await preValidarComGemini(API_URL, fetchAuth, base64);
        setPreviewResult(resultado);
        setPreviewLoading(false);
      } catch (err) {
        setCapturando(false);
        analiseAtivaRef.current = true;
      }
    }, [capturando, API_URL, fetchAuth]);

    // ── 4. Auto-captura REMOVIDA (2026-04 v4.1) ──
    // Motoboy reclamou que invadia. Agora SÓ captura no clique do botão.

    // ── 5. Refazer foto ─────────────────────────────────────────────────
    const refazer = useCallback(async () => {
      setFotoCapturada(null);
      setPreviewResult(null);
      setMetricas(null);
      setCapturando(false);

      // Reabre câmera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        analiseAtivaRef.current = true;
      } catch (err) {
        setErroCamera(err.message);
      }
    }, []);

    // ── 6. Aprovar foto e retornar pro pai ──────────────────────────────
    const aprovar = useCallback(() => {
      if (fotoCapturada && onCapturada) {
        onCapturada(fotoCapturada);
      }
    }, [fotoCapturada, onCapturada]);

    // ── 7. Fallback: input file tradicional ─────────────────────────────
    const fallbackInputRef = useRef(null);

    const handleFallbackFile = useCallback(async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const canvas = await imagemParaCanvas(file, 1200);
        const base64 = canvasParaBase64(canvas, 0.75);
        setFotoCapturada(base64);
        setPreviewLoading(true);
        const resultado = await preValidarComGemini(API_URL, fetchAuth, base64);
        setPreviewResult(resultado);
        setPreviewLoading(false);
      } catch (err) {
        alert('Erro ao processar a imagem: ' + err.message);
      }
    }, [API_URL, fetchAuth]);

    // ════════════════════════════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════════════════════════════

    // Estilos básicos (tema roxo do Tutts)
    const styles = {
      overlay: {
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 9999,
        display: 'flex', flexDirection: 'column', color: 'white',
      },
      header: {
        padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,255,255,0.1)',
      },
      videoContainer: {
        flex: 1, position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      },
      video: {
        width: '100%', height: '100%', objectFit: 'cover',
      },
      indicadores: {
        position: 'absolute', top: 16, left: 16, right: 16,
        display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none',
      },
      indicador: (ok) => ({
        background: ok ? 'rgba(34,197,94,0.85)' : 'rgba(239,68,68,0.85)',
        padding: '8px 12px', borderRadius: 12, fontSize: 13, fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: 8, backdropFilter: 'blur(4px)',
      }),
      dicaCentral: {
        position: 'absolute', bottom: 100, left: 16, right: 16,
        background: 'rgba(0,0,0,0.7)', padding: '14px 18px', borderRadius: 16,
        textAlign: 'center', fontSize: 16, fontWeight: 600,
        backdropFilter: 'blur(8px)', pointerEvents: 'none',
      },
      footer: {
        padding: 16, display: 'flex', gap: 10, justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
      },
      btnCapturar: {
        width: 72, height: 72, borderRadius: '50%',
        background: 'white', border: '4px solid #7c3aed',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      },
      btnSecundario: {
        padding: '12px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.15)',
        color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14,
      },
      btnAprovar: {
        padding: '14px 28px', borderRadius: 12, background: '#16a34a',
        color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 16,
      },
      btnRefazer: {
        padding: '14px 28px', borderRadius: 12, background: '#ef4444',
        color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 16,
      },
      btnTrocarCnpj: {
        padding: '14px 28px', borderRadius: 12, background: '#7c3aed',
        color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 16,
      },
      preview: {
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: 16, overflow: 'auto',
      },
      previewImg: {
        maxWidth: '100%', maxHeight: '50vh', borderRadius: 12, border: '2px solid #7c3aed',
      },
      cardResultado: {
        marginTop: 16, padding: 16, borderRadius: 12, width: '100%', maxWidth: 480,
        background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)',
      },
    };

    // Modo: Erro de câmera (mostra fallback de input file)
    if (!cameraDisponivel) {
      return h('div', { style: styles.overlay },
        h('div', { style: styles.header },
          h('span', { style: { fontWeight: 700, fontSize: 18 } }, '📷 Foto da Nota Fiscal'),
          h('button', { onClick: onCancelar, style: styles.btnSecundario }, '✕ Fechar'),
        ),
        h('div', { style: { ...styles.preview, justifyContent: 'center' } },
          h('div', { style: { textAlign: 'center', marginBottom: 24 } },
            h('div', { style: { fontSize: 48, marginBottom: 12 } }, '📵'),
            h('div', { style: { fontSize: 18, fontWeight: 600, marginBottom: 8 } }, 'Câmera indisponível'),
            h('div', { style: { fontSize: 14, opacity: 0.8 } },
              erroCamera === 'NotAllowedError' || (erroCamera || '').includes('Permission')
                ? 'Permissão da câmera negada. Use o botão abaixo pra anexar a foto.'
                : 'Use o botão abaixo pra anexar a foto da galeria ou tirar com câmera.'
            ),
          ),
          h('input', {
            type: 'file',
            accept: 'image/*',
            capture: 'environment',
            ref: fallbackInputRef,
            onChange: handleFallbackFile,
            style: { display: 'none' },
          }),
          !fotoCapturada && h('button', {
            onClick: () => fallbackInputRef.current && fallbackInputRef.current.click(),
            style: { ...styles.btnAprovar, padding: '16px 32px' },
          }, '📎 Selecionar Foto da NF'),

          fotoCapturada && renderResultadoPreview(),
        ),
      );
    }

    // Modo: Foto já capturada — mostra resultado da Fase 2
    if (fotoCapturada) {
      // 2026-04 v4.1: novo footer baseado no resultado da IA.
      // Se IA aprovou (previewResult.ok === true): mostra "Usar Esta Foto"
      // Se IA reprovou: mostra "Tirar Outra" + "Digitar CNPJ" (sem "usar mesmo assim")
      // Se ainda carregando ou erro técnico: mostra só "Tirar Outra"
      const aprovado = previewResult && previewResult.ok === true;
      const reprovado = previewResult && previewResult.ok === false && !previewResult.erro;
      const erroTecnico = previewResult && previewResult.erro;

      return h('div', { style: styles.overlay },
        h('div', { style: styles.header },
          h('span', { style: { fontWeight: 700, fontSize: 18 } }, '📷 Resultado da Análise'),
          h('button', { onClick: onCancelar, style: styles.btnSecundario }, '✕ Fechar'),
        ),
        h('div', { style: styles.preview },
          h('img', { src: fotoCapturada, style: styles.previewImg }),
          renderResultadoPreview(),
        ),
        h('div', { style: styles.footer },
          // Sempre tem "Tirar Outra" (a não ser durante loading)
          !previewLoading && h('button', { onClick: refazer, style: styles.btnRefazer }, '↻ Tirar Outra'),

          // Se aprovou: mostra "Usar Esta Foto" verde
          aprovado && h('button', { onClick: aprovar, style: styles.btnAprovar }, '✓ Usar Esta Foto'),

          // Se reprovou: mostra "Digitar CNPJ" como alternativa
          reprovado && onTrocarParaCnpj && h('button', {
            onClick: onTrocarParaCnpj,
            style: styles.btnTrocarCnpj,
          }, '⌨ Digitar CNPJ'),

          // Erro técnico (Gemini fora, timeout): permite usar mesmo assim com aviso
          erroTecnico && h('button', { onClick: aprovar, style: { ...styles.btnAprovar, background: '#f59e0b' } }, '⚠ Usar Mesmo Assim'),
        ),
      );
    }

    // Modo: Câmera ao vivo (Fase 3 ativa)
    return h('div', { style: styles.overlay },
      h('div', { style: styles.header },
        h('span', { style: { fontWeight: 700, fontSize: 18 } }, '📷 Foto da Nota Fiscal'),
        h('button', { onClick: onCancelar, style: styles.btnSecundario }, '✕ Cancelar'),
      ),
      h('div', { style: styles.videoContainer },
        h('video', {
          ref: videoRef,
          style: styles.video,
          playsInline: true,
          muted: true,
          autoPlay: true,
        }),
        cameraIniciando && h('div', { style: styles.dicaCentral }, '⏳ Iniciando câmera...'),
        !cameraIniciando && metricas && h('div', { style: styles.indicadores },
          h('div', { style: styles.indicador(metricas.nitidez >= LIMITES.NITIDEZ_MIN) },
            metricas.nitidez >= LIMITES.NITIDEZ_MIN ? '✓' : '✗',
            ' Foco'
          ),
          h('div', { style: styles.indicador(metricas.brilho >= LIMITES.BRILHO_MIN && metricas.brilho <= LIMITES.BRILHO_MAX) },
            (metricas.brilho >= LIMITES.BRILHO_MIN && metricas.brilho <= LIMITES.BRILHO_MAX) ? '✓' : '✗',
            ' Iluminação'
          ),
          h('div', { style: styles.indicador(metricas.contraste >= LIMITES.CONTRASTE_MIN) },
            metricas.contraste >= LIMITES.CONTRASTE_MIN ? '✓' : '✗',
            ' Contraste'
          ),
        ),
        !cameraIniciando && metricas && metricas.dica && h('div', { style: styles.dicaCentral },
          metricas.dica
        ),
        !cameraIniciando && metricas && metricas.ok && h('div', { style: { ...styles.dicaCentral, background: 'rgba(34,197,94,0.85)' } },
          '👍 Foto pronta — clique no botão abaixo'
        ),
      ),
      h('div', { style: styles.footer },
        h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 } },
          h('button', {
            onClick: capturar,
            disabled: capturando || cameraIniciando,
            style: {
              ...styles.btnCapturar,
              opacity: (capturando || cameraIniciando) ? 0.4 : 1,
              cursor: (capturando || cameraIniciando) ? 'not-allowed' : 'pointer',
            },
            'aria-label': 'Tirar foto da NF',
          }, h('div', { style: { width: 56, height: 56, borderRadius: '50%', background: '#7c3aed' } })),
          h('div', { style: { fontSize: 12, fontWeight: 600, opacity: 0.9, marginTop: 4 } },
            capturando ? 'Capturando...' : 'TIRAR FOTO'
          ),
        ),
      ),
    );

    // Helper interno pra renderizar o card de resultado da Fase 2
    function renderResultadoPreview() {
      if (previewLoading) {
        return h('div', { style: styles.cardResultado },
          h('div', { style: { textAlign: 'center', padding: 12 } },
            h('div', { style: { fontSize: 18 } }, '⏳ Analisando com IA...'),
            h('div', { style: { fontSize: 12, opacity: 0.7, marginTop: 4 } }, 'Pode levar alguns segundos'),
          )
        );
      }
      if (!previewResult) return null;

      // Caso especial: erro técnico
      if (previewResult.erro && !previewResult.cnpj_lido) {
        return h('div', { style: styles.cardResultado },
          h('div', { style: { fontSize: 16, fontWeight: 600, marginBottom: 8 } }, '⚠️ Não consegui validar agora'),
          h('div', { style: { fontSize: 14, opacity: 0.8 } },
            'Você pode usar essa foto mesmo assim — a validação completa será feita no envio.'
          ),
        );
      }

      const cor = previewResult.ok ? '#16a34a' : (previewResult.qualidade === 'media' ? '#f59e0b' : '#ef4444');
      const icone = previewResult.ok ? '✅' : (previewResult.qualidade === 'media' ? '⚠️' : '❌');
      const titulo = previewResult.ok
        ? 'Foto aprovada!'
        : 'Não consegui ler bem essa NF';

      return h('div', { style: { ...styles.cardResultado, borderLeft: `4px solid ${cor}` } },
        h('div', { style: { fontSize: 18, fontWeight: 700, marginBottom: 8 } }, `${icone} ${titulo}`),
        previewResult.ok && previewResult.cnpj_lido && h('div', { style: { fontSize: 14, marginBottom: 6 } },
          h('strong', null, '✓ CNPJ identificado: '),
          previewResult.cnpj_lido,
        ),
        previewResult.dica && h('div', { style: { fontSize: 14, marginTop: 8, padding: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 8 } },
          h('strong', null, '💡 '),
          previewResult.dica,
        ),
        // Quando reprovado, instrui motoboy sobre as opções abaixo
        !previewResult.ok && h('div', {
          style: { fontSize: 13, marginTop: 10, padding: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 8, lineHeight: 1.4 }
        },
          '👇 Você pode ',
          h('strong', null, 'tirar outra foto'),
          ' ou, se a NF estiver ruim, ',
          h('strong', null, 'digitar o CNPJ'),
          ' direto.'
        ),
        previewResult.problemas && previewResult.problemas.length > 0 && h('div', { style: { fontSize: 11, marginTop: 8, opacity: 0.6 } },
          'Detectado: ', previewResult.problemas.join(', ')
        ),
      );
    }
  }

  // Expõe o componente pra o modulo-agente.js usar
  window.FotoNfCoach = FotoNfCoach;
  console.log('✅ FotoNfCoach carregado — camera coaching v1.1 (rigoroso, sem auto-captura)');
})();
