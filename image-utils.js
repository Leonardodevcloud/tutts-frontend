/**
 * Arquivo: image-utils.js
 * 
 * 🛡️ COMPRESSÃO SEGURA DE IMAGEM PRA MOBILE
 *
 * ── PROBLEMA QUE RESOLVE ───────────────────────────────────────────────
 * 
 * Motoboys com celular fraco (Android baixo-fim, 2-3GB RAM) reportavam
 * que o app fechava sozinho ao enviar foto. Sintomas:
 *   - App PWA fecha sem aviso (não trava, não dá erro)
 *   - Sem logs no backend (foto nunca chegou a sair)
 *   - Sempre com fotos, nunca com texto
 *   - Mais comum em aparelhos antigos
 *
 * Causa: Chrome móvel limita aba/PWA a ~256MB de RAM. Padrão antigo:
 *
 *     readAsDataURL(file)  → string base64 do arquivo INTEIRO  (~10MB)
 *     img.src = base64     → navegador decodifica de novo      (~10MB)
 *     img.onload + canvas  → matriz pixels descompactada        (~50MB)
 *     toDataURL            → outra string base64                (~5MB)
 *     Pico de RAM:                                              ~75-80MB
 *
 * Em aparelho fraco com Chrome móvel, isso estoura o limite e o SO mata
 * a aba. Usuário "perde" o app.
 *
 * ── SOLUÇÃO ────────────────────────────────────────────────────────────
 *
 * Esta função usa `createImageBitmap(file)` que:
 *   1. NÃO carrega o arquivo inteiro como base64 antes — lê direto do Blob
 *   2. Decoda em worker thread (fora da main thread → não trava UI)
 *   3. Permite fechar o bitmap explicitamente após uso (libera RAM)
 *
 * Pico de RAM com createImageBitmap: ~25-30MB (3x menos que o velho).
 *
 * Plus: retry com downscale progressivo. Se uma tentativa der OOM, tenta
 * de novo com tamanho menor antes de desistir.
 *
 * ── DETECÇÃO DE APARELHO ───────────────────────────────────────────────
 *
 * Aparelhos com < 4GB de RAM (deviceMemory) recebem limites mais
 * agressivos por default (max 800px, qualidade 0.6). Aparelhos OK
 * usam 1280px / 0.75. Caller pode override.
 *
 * ── COMO USAR ──────────────────────────────────────────────────────────
 *
 *   const b64 = await window.imageUtils.compressImageSafe(file);
 *   // ou com opts:
 *   const b64 = await window.imageUtils.compressImageSafe(file, { maxWidth: 1024, quality: 0.7 });
 *
 * Retorna: string data:image/jpeg;base64,...
 * Lança erro com mensagem amigável se NADA funcionou (sem caminho feliz)
 */

(function() {
  'use strict';

  // ─── Detecção de aparelho fraco ───────────────────────────────────────
  // navigator.deviceMemory: 0.25, 0.5, 1, 2, 4, 8 (GB). undefined em iOS/desktop antigo.
  // Conservador: se undefined, presumimos OK (não é o problema do iPhone).
  function aparelhoFraco() {
    var dm = navigator.deviceMemory;
    if (typeof dm !== 'number') return false;
    return dm < 4;
  }

  // Limites default escolhidos com folga pra mobile:
  //   FRACO:  800px largura, qualidade 0.6  → ~80-150 KB típico
  //   NORMAL: 1280px largura, qualidade 0.75 → ~150-400 KB típico
  // Comprovantes/fachadas/notas legíveis muito antes desses limites.
  function defaultsParaAparelho() {
    if (aparelhoFraco()) {
      return { maxWidth: 800, quality: 0.6 };
    }
    return { maxWidth: 1280, quality: 0.75 };
  }

  // Sequência de retry — começa no limite escolhido e vai descendo.
  // Cobre o caso de aparelho que não conseguiu nem com o default.
  function montarSequencia(opts) {
    var mw = opts.maxWidth;
    var q  = opts.quality;
    return [
      { mw: mw,                  q: q              },
      { mw: Math.round(mw*0.85), q: Math.max(0.55, q - 0.05) },
      { mw: Math.round(mw*0.7),  q: Math.max(0.5,  q - 0.10) },
      { mw: Math.round(mw*0.55), q: Math.max(0.45, q - 0.15) },
    ];
  }

  // ─── Encode de canvas pra data URL via toBlob (mais leve em mobile) ───
  // toBlob não bloqueia a main thread como toDataURL faz. FileReader
  // converte o blob pra base64 incremental.
  function encodeCanvas(canvas, q) {
    return new Promise(function(resolve, reject) {
      if (canvas.toBlob) {
        canvas.toBlob(function(blob) {
          if (!blob) { reject(new Error('toBlob retornou null')); return; }
          var fr = new FileReader();
          fr.onload  = function() { resolve(fr.result); };
          fr.onerror = function() { reject(new Error('FileReader falhou')); };
          fr.readAsDataURL(blob);
        }, 'image/jpeg', q);
      } else {
        // Fallback pra navegadores muito antigos
        try { resolve(canvas.toDataURL('image/jpeg', q)); }
        catch (e) { reject(e); }
      }
    });
  }

  // Desenha source (ImageBitmap ou HTMLImageElement) no canvas com max width
  async function drawAndEncode(source, maxW, q) {
    var w = source.width || maxW;
    var h = source.height || maxW;
    if (!w || !h) throw new Error('Dimensões inválidas');

    // Mantém aspect ratio, redimensiona pelo maior lado
    if (w > h) {
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
    } else {
      if (h > maxW) { w = Math.round(w * maxW / h); h = maxW; }
    }

    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D indisponível');
    ctx.drawImage(source, 0, 0, w, h);
    var result = await encodeCanvas(canvas, q);
    // Libera canvas explicitamente
    try { canvas.width = 0; canvas.height = 0; } catch(_) {}
    return result;
  }

  // ─── Caminho 1: createImageBitmap (PRIMÁRIO) ──────────────────────────
  // Forma moderna e leve. Decoda em worker thread, suporta quase todos
  // os formatos que o navegador conhece (incluindo HEIC em iOS recentes).
  async function viaImageBitmap(file, sequencia) {
    if (typeof createImageBitmap !== 'function') {
      throw new Error('createImageBitmap nao suportado');
    }
    var bitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch (err) {
      throw new Error('createImageBitmap falhou: ' + (err && err.message ? err.message : 'desconhecido'));
    }
    try {
      for (var i = 0; i < sequencia.length; i++) {
        try {
          return await drawAndEncode(bitmap, sequencia[i].mw, sequencia[i].q);
        } catch (drawErr) {
          // OOM no canvas? tenta tamanho menor
          continue;
        }
      }
      throw new Error('Memória insuficiente pra processar a foto. Tente uma foto menor.');
    } finally {
      try { bitmap.close && bitmap.close(); } catch(_) {}
    }
  }

  // ─── Caminho 2: Image() + objectURL (FALLBACK) ────────────────────────
  // Pra navegadores que não suportam createImageBitmap. Usa objectURL
  // (não base64) pra evitar carregar o arquivo todo na RAM como string.
  function viaImageElement(file, sequencia) {
    return new Promise(function(resolve, reject) {
      var objectUrl = URL.createObjectURL(file);
      var cleanup = function() { try { URL.revokeObjectURL(objectUrl); } catch(_) {} };
      var img = new Image();
      img.decoding = 'async';
      img.onload = async function() {
        for (var i = 0; i < sequencia.length; i++) {
          try {
            var result = await drawAndEncode(img, sequencia[i].mw, sequencia[i].q);
            img.src = '';
            cleanup();
            resolve(result);
            return;
          } catch (drawErr) {
            continue;
          }
        }
        img.src = '';
        cleanup();
        reject(new Error('Memória insuficiente. Tente uma foto menor.'));
      };
      img.onerror = function() {
        cleanup();
        // Mais provável: HEIC do iPhone que o navegador não decoda
        reject(new Error('Formato da foto não suportado. Tire pela câmera do app ou converta pra JPG.'));
      };
      img.src = objectUrl;
    });
  }

  // ─── Função principal ─────────────────────────────────────────────────
  /**
   * Comprime imagem de forma memory-safe pra mobile.
   * 
   * @param {File|Blob} file - arquivo a comprimir
   * @param {Object} [opts] - opcional
   * @param {number} [opts.maxWidth] - largura/altura máxima (default: detecta)
   * @param {number} [opts.quality] - qualidade JPEG 0-1 (default: detecta)
   * @returns {Promise<string>} data URL base64 JPEG
   */
  async function compressImageSafe(file, opts) {
    if (!file) throw new Error('Nenhum arquivo passado');
    opts = opts || {};

    var defaults = defaultsParaAparelho();
    var efetivo = {
      maxWidth: opts.maxWidth || defaults.maxWidth,
      quality:  opts.quality  || defaults.quality,
    };
    var sequencia = montarSequencia(efetivo);

    // ── Telemetria: marca início pra detectar crash via reload ──
    // Se o app fechar durante o processamento (OOM kill), ao reabrir
    // detectamos a marca recente e podemos reportar.
    try {
      localStorage.setItem('imgUtils.lastStartedAt', String(Date.now()));
      localStorage.setItem('imgUtils.lastFileSize', String(file.size || 0));
      localStorage.setItem('imgUtils.lastFileType', String(file.type || 'unknown'));
    } catch(_) {}

    // Pipeline: ImageBitmap primeiro (mais robusto), Image como fallback
    var resultado;
    try {
      resultado = await viaImageBitmap(file, sequencia);
    } catch (e1) {
      try {
        resultado = await viaImageElement(file, sequencia);
      } catch (e2) {
        // Limpa marca antes de propagar
        try { localStorage.removeItem('imgUtils.lastStartedAt'); } catch(_) {}
        // Joga o segundo erro (geralmente mais informativo)
        throw e2;
      }
    }

    // Sucesso: limpa marca de início (não foi crash)
    try { localStorage.removeItem('imgUtils.lastStartedAt'); } catch(_) {}
    return resultado;
  }

  // ─── Detecção de crash anterior ───────────────────────────────────────
  // Chamada uma vez no boot do app pra ver se a última sessão fechou
  // durante processamento de foto. Se sim, reporta pro backend.
  function detectarCrashAnterior() {
    try {
      var startedAt = localStorage.getItem('imgUtils.lastStartedAt');
      if (!startedAt) return null;

      var ts = parseInt(startedAt, 10);
      if (!ts) { localStorage.removeItem('imgUtils.lastStartedAt'); return null; }

      // Se a marca tem mais de 1h, descartamos (não foi crash recente)
      var idadeMs = Date.now() - ts;
      if (idadeMs > 3600 * 1000) {
        localStorage.removeItem('imgUtils.lastStartedAt');
        return null;
      }

      var fileSize = localStorage.getItem('imgUtils.lastFileSize');
      var fileType = localStorage.getItem('imgUtils.lastFileType');

      // Limpa pra não reportar de novo
      localStorage.removeItem('imgUtils.lastStartedAt');
      localStorage.removeItem('imgUtils.lastFileSize');
      localStorage.removeItem('imgUtils.lastFileType');

      return {
        when: new Date(ts).toISOString(),
        idadeMs: idadeMs,
        fileSize: parseInt(fileSize, 10) || 0,
        fileType: fileType || 'unknown',
        deviceMemory: navigator.deviceMemory || null,
        userAgent: navigator.userAgent || '',
        platform: navigator.platform || '',
      };
    } catch(_) {
      return null;
    }
  }

  // ─── Diagnóstico (debug) ──────────────────────────────────────────────
  function diagnostico() {
    return {
      createImageBitmapSupported: typeof createImageBitmap === 'function',
      deviceMemory: navigator.deviceMemory || null,
      aparelhoFraco: aparelhoFraco(),
      defaultsParaAparelho: defaultsParaAparelho(),
      hardwareConcurrency: navigator.hardwareConcurrency || null,
      userAgent: navigator.userAgent || '',
    };
  }

  // ─── Expõe globalmente ────────────────────────────────────────────────
  window.imageUtils = {
    compressImageSafe: compressImageSafe,
    detectarCrashAnterior: detectarCrashAnterior,
    diagnostico: diagnostico,
    // Exportados pra teste/uso direto
    aparelhoFraco: aparelhoFraco,
    defaultsParaAparelho: defaultsParaAparelho,
  };

  // Log silencioso de boot (visível só no DevTools)
  try {
    console.log('[image-utils] pronto. Diagnóstico:', diagnostico());
  } catch(_) {}
})();
