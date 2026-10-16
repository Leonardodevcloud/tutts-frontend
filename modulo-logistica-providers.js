/* UI_UNIFICADO_V1: emojis -> sprite de icones; cores na paleta unica (CORES_TOKENS_V1). */
/* DEEMOJI_V1 */
/* HUB_ABAS_V1: aba Provedores no padrão clean (cabeçalho, pílulas, credenciais em cards). */
// ============================================================
// MÓDULO LOGÍSTICA — Painel de Provedores (Hub) v1
// ------------------------------------------------------------
// Configura os providers do hub logístico (Uber, 99, futuros).
// Equivalente ao TabConfig do modulo-uber, porém MULTI-PROVIDER.
//
// Backend consumido (todos em /api/logistics):
//   GET  /providers                       — lista (sem segredos)
//   GET  /providers/:code                 — detalhe (segredos mascarados)
//   POST /providers/:code/test-connection — healthCheck do adapter
//   PUT  /providers/:code                 — salva config/ativo/sandbox
//
// Padrão: Vanilla JS + React via CDN (sem JSX). Exposto como
// window.ModuloLogisticaProviders — usado como aba do modulo-uber
// e reaproveitável como aba Config do futuro modulo-logistica.js.
// ============================================================

(function () {
  const e = React.createElement;
  const { useState, useEffect, useRef, useCallback } = React;

  // ────────────────────────────────────────────────────────────
  // Schema de campos por provider. Provider sem schema cai no
  // modo genérico (renderiza as chaves que o backend devolver).
  // ────────────────────────────────────────────────────────────
  const SCHEMA = {
    noventanove: {
      icon: e("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, e("use", { href: "#i-bike" })),
      grupos: [
        { titulo: 'Credenciais 99Entrega (OAuth)', campos: [
          { key: 'client_id',     label: 'Client ID',     secret: false, hint: 'client_id da 99Entrega' },
          { key: 'client_secret', label: 'Client Secret', secret: true,  hint: 'client_secret da 99Entrega' },
        ]},
        { titulo: 'Padrões do pacote', campos: [
          { key: 'package_type',   label: 'Tipo do pacote',  type: 'select',
            options: ['groceries', 'food', 'documents', 'apparel', 'medication', 'electronics', 'others'],
            hint: 'enum fixo da 99 — autopecas nao existe; use "others"' },
          { key: 'package_weight', label: 'Peso do pacote',  type: 'select',
            options: ['1kg', '5kg', '10kg', '20kg', '30kg'],
            hint: 'enum fixo da 99 — ate 25kg: use "30kg"' },
        ]},
        { titulo: 'Contato', campos: [
          { key: 'telefone_suporte', label: 'Telefone de suporte', secret: false,
            hint: 'fallback quando a OS não tem telefone' },
        ]},
        { titulo: 'Códigos de verificação', campos: [
          { key: 'need_pickup_code',  label: 'Exigir código na coleta',  type: 'boolean',
            hint: 'courier informa um código pra retirar o pacote' },
          { key: 'need_dropoff_code', label: 'Exigir código na entrega', type: 'boolean',
            hint: 'destinatário informa um código pra receber' },
          { key: 'verificacao_devolucao_habilitada', label: 'Exigir código na devolução', type: 'boolean',
            hint: 'na devolução (falha na entrega) o courier informa um código; se desligado, usa foto' },
        ]},
        { titulo: 'Avançado', campos: [
          { key: 'cancel_reason_id', label: 'Cancel reason ID padrão', secret: false,
            hint: 'enum 410013…410021 — default 410013' },
        ]},
        { titulo: 'Webhook (HMAC-SHA256)', campos: [
          // webhook_secret é coluna top-level — não vai dentro de config
          { key: 'webhook_secret', label: 'Webhook Secret (HMAC)', secret: true, topLevel: true,
            hint: 'se vazio, usa o client_secret pra validar a assinatura' },
        ]},
      ],
    },
    uber: {
      icon: e("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, e("use", { href: "#i-bike" })),
      grupos: [
        { titulo: 'Credenciais Uber Direct', campos: [
          { key: 'client_id',     label: 'Client ID',     secret: false },
          { key: 'client_secret', label: 'Client Secret', secret: true },
          { key: 'customer_id',   label: 'Customer ID',   secret: false },
          { key: 'webhook_secret', label: 'Webhook Secret (HMAC)', secret: true, topLevel: true },
        ]},
        { titulo: 'Contato', campos: [
          { key: 'telefone_suporte', label: 'Telefone de suporte (fallback)',
            hint: 'Usado quando o ponto de coleta/entrega não tem telefone cadastrado. Formato: 5571999999999' },
        ]},
        { titulo: 'Verificação de coleta e entrega', campos: [
          // 2026-07 [uber-painel-verificacao-v1] O toggle 'Habilitar codigo de
          // coleta' foi REMOVIDO daqui de proposito. Ele era um toggle morto e
          // perigoso: na Uber o codigo de coleta e NATIVO (5 ultimos do workflow
          // UUID) e so funciona se NAO enviarmos pickup_verification. Ligar o
          // toggle fazia o OPOSTO do que o nome prometia — desligava o codigo.
          // O backend (uber.parser.js) ja ignora a chave e loga aviso.
          { key: '_info_codigo_coleta', type: 'info', label: 'Código de coleta',
            texto: 'Automático — não requer configuração.',
            hint: 'A Uber usa os 5 últimos caracteres do ID Uber da entrega (ex.: 6DBEB). O código aparece no card do kanban, no portal do cliente e é enviado por WhatsApp à loja — igual à 99.' },
          { key: 'verificacao_entrega_habilitada', label: 'Habilitar verificação de entrega', type: 'boolean',
            hint: 'Exige confirmação do destinatário no momento da entrega.' },
          { key: 'verificacao_entrega_tipo', label: 'Tipo de verificação de entrega',
            type: 'select', options: ['assinatura', 'pincode'],
            hint: 'assinatura = assinatura digital no app do motoboy (padrão). pincode = 4 dígitos GERADOS PELA UBER, enviados ao destinatário por WhatsApp. Só vale se a verificação de entrega acima estiver ligada.' },
        ]},
        { titulo: 'Comprovante de entrega', campos: [
          { key: 'proof_of_delivery_habilitado', label: 'Coletar comprovante de entrega (foto/assinatura)', type: 'boolean',
            hint: 'Após entrega concluída, busca na Uber Direct a foto e assinatura do recebedor. Só retorna algo se houver verificação ativa na entrega — com tudo desligado, a Uber não coleta comprovante nenhum.' },
          { key: 'manifest_total_value_centavos', label: 'Valor declarado da mercadoria (centavos)',
            hint: 'Valor em centavos. Ex: 10000 = R$ 100,00. Padrão: 10000.' },
        ]},
      ],
    },
  };

  function iconDe(code) {
    return (SCHEMA[code] && SCHEMA[code].icon) || '';
  }

  // ──────────────────────────────────────────────────────────
  // ProviderLogo — logo oficial redondo do provedor (SVG inline).
  // Mesmos assets do modulo-logistica.js. Provider sem logo cai
  // no emoji do schema (iconDe).
  // ──────────────────────────────────────────────────────────
  const PROVIDER_SVGS = {
    uber:
      '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">' +
      '<circle cx="30" cy="30" r="30" fill="black"/>' +
      '<path d="M14.3206 35.4962C16.3593 35.4962 17.9356 33.9227 17.9356 31.5943V22.5322H20.1422V37.2163H17.9566V35.8527C16.9688 36.8805 15.6028 37.4678 14.0682 37.4678C10.9151 37.4678 8.49786 35.1814 8.49786 31.7216V22.5346H10.7045V31.5943C10.7045 33.9647 12.2598 35.4962 14.3199 35.4962" fill="white"/>' +
      '<path d="M21.7828 22.5324H23.9056V27.8815C24.4007 27.3754 24.9925 26.9735 25.6459 26.6997C26.2993 26.4258 27.0012 26.2855 27.7099 26.287C30.863 26.287 33.343 28.7834 33.343 31.888C33.343 34.9717 30.863 37.4677 27.7099 37.4677C26.9978 37.4696 26.2925 37.3296 25.6353 37.0559C24.9781 36.7821 24.3823 36.3802 23.8828 35.8736V37.2155H21.7797L21.7828 22.5324ZM27.563 35.601C29.5811 35.601 31.2415 33.9436 31.2415 31.888C31.2415 29.8112 29.5811 28.175 27.563 28.175C25.524 28.175 23.8635 29.8112 23.8635 31.888C23.8635 33.9436 25.503 35.601 27.563 35.601Z" fill="white"/>' +
      '<path d="M39.6917 26.3083C42.7813 26.3083 45.0517 28.6786 45.0517 31.8673V32.5596H36.3297C36.6241 34.3006 38.0743 35.6013 39.881 35.6013C41.1222 35.6013 42.1724 35.0975 42.9709 34.0278L44.5055 35.1605C43.4333 36.5871 41.8359 37.4469 39.881 37.4469C36.6652 37.4469 34.1848 35.0556 34.1848 31.8673C34.1848 28.8466 36.56 26.3083 39.692 26.3083H39.6917ZM36.3707 30.8815H42.9078C42.5506 29.245 41.2263 28.1543 39.65 28.1543C38.0736 28.1543 36.7493 29.245 36.3707 30.8815Z" fill="white"/>' +
      '<path d="M50.7474 28.4061C49.36 28.4061 48.3511 29.4759 48.3511 31.133V37.2164H46.228V26.5181H48.3311V27.8408C48.8566 26.9806 49.7185 26.4352 50.8956 26.4352H51.6311V28.4072L50.7474 28.4061Z" fill="white"/>' +
      '</svg>',
    noventanove:
      '<svg viewBox="0 0 209 209" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M0 46.4444C0 20.7939 20.7939 0 46.4444 0H162.556C188.206 0 209 20.7939 209 46.4444V162.556C209 188.206 188.206 209 162.556 209H46.4444C20.7939 209 0 188.206 0 162.556V46.4444Z" fill="#111827"/>' +
      '<path fill-rule="evenodd" clip-rule="evenodd" d="M68.3442 55.1528C79.373 55.1528 89.1552 60.5957 95.2622 68.9939C99.1792 74.3808 101.576 80.9841 101.855 88.1472V89.3804C101.855 96.36 99.8283 102.865 96.3157 108.275L67.5618 153.086C67.2567 153.561 66.7381 153.847 66.1817 153.847H43.3702C42.2719 153.847 41.613 152.602 42.2148 151.663L60.7855 122.723C45.9202 119.221 34.8334 105.627 34.8334 89.3804L34.8643 88.1472C35.1118 81.0028 37.498 74.4152 41.3972 69.0364C47.502 60.6143 57.2972 55.1528 68.3442 55.1528ZM68.3442 100.691C72.3576 100.691 75.909 98.7126 78.1455 95.6683L79.081 94.2104C80.0497 92.4185 80.6038 90.3607 80.6029 88.1472C80.5912 81.2422 75.1079 75.6479 68.3442 75.6479C61.5805 75.6479 56.0977 81.2422 56.0846 88.1692C56.0846 95.0851 61.5735 100.691 68.3442 100.691Z" fill="#f3f4f6"/>' +
      '<path fill-rule="evenodd" clip-rule="evenodd" d="M167.573 68.9939C161.467 60.5957 151.685 55.1528 140.656 55.1528C129.609 55.1528 119.813 60.6143 113.709 69.0364C109.81 74.4152 107.423 81.0028 107.175 88.1472L107.145 89.3804C107.145 105.627 118.232 119.221 133.097 122.723L114.526 151.663C113.924 152.602 114.583 153.847 115.681 153.847H138.493C139.049 153.847 139.568 153.561 139.873 153.086L168.627 108.275C172.14 102.865 174.167 96.36 174.167 89.3804V88.1472C173.887 80.9841 171.49 74.3808 167.573 68.9939ZM140.656 100.691C144.669 100.691 148.221 98.7126 150.457 95.6683L151.392 94.2104C152.361 92.4185 152.915 90.3607 152.914 88.1472C152.903 81.2422 147.419 75.6479 140.656 75.6479C133.892 75.6479 128.409 81.2422 128.396 88.1692C128.396 95.0852 133.885 100.691 140.656 100.691Z" fill="#f3f4f6"/>' +
      '</svg>',
  };

  // Logo redondo do provider. Sem SVG → cai no emoji do schema.
  function ProviderLogo(code, size) {
    size = size || 32;
    const c = (code === '99') ? 'noventanove' : code;
    const svg = PROVIDER_SVGS[c];
    if (svg) {
      return e('span', {
        style: {
          width: size, height: size, borderRadius: '50%',
          overflow: 'hidden', display: 'inline-block',
          flexShrink: 0, lineHeight: 0, verticalAlign: 'middle',
        },
        dangerouslySetInnerHTML: { __html: svg },
      });
    }
    // HUB_ABAS_V1: provider sem logo nem ícone → círculo cinza com a inicial
    if (!iconDe(code)) return e('span', { 'aria-hidden': 'true', style: { width: size, height: size, borderRadius: '50%', background: '#f3f4f6', color: '#374151', fontSize: size * 0.42, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } }, String(code || '?').charAt(0).toUpperCase());
    return e('span', { style: { fontSize: size * 0.75 } }, iconDe(code));
  }

  // ────────────────────────────────────────────────────────────
  // HUB_ABAS_V1: peças do padrão clean (pílula suave, botões, campos)
  // ────────────────────────────────────────────────────────────
  const TOM = {
    verde: ['#f0fdf4', '#166534', '#16a34a'], ambar: ['#fffbeb', '#92400e', '#d97706'],
    vermelho: ['#fef2f2', '#991b1b', '#dc2626'], azul: ['#eff6ff', '#1e40af', '#2563eb'],
    cinza: ['#f3f4f6', '#374151', '#9ca3af'],
  };
  const Pilula = (tom, texto, key) => {
    const t = TOM[tom] || TOM.cinza;
    return e('span', { key, className: 'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap', style: { background: t[0], color: t[1] } },
      e('span', { 'aria-hidden': 'true', style: { width: 6, height: 6, borderRadius: 99, background: t[2] } }), texto);
  };
  const Ico = (nome, sz, extra) => e('svg', { className: 'ico', style: Object.assign({ width: sz || 16, height: sz || 16 }, extra || {}), 'aria-hidden': 'true' }, e('use', { href: '#i-' + nome }));
  const CLS = {
    input: 'w-full h-[38px] px-3 border border-gray-200 rounded-[10px] bg-white text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100',
    label: 'block text-xs font-semibold text-gray-700 mb-1',
    hint: 'text-[11.5px] text-gray-500 mt-1 leading-snug',
    btnPri: 'h-10 px-4 rounded-[10px] bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800 inline-flex items-center gap-1.5 disabled:opacity-50',
    btnSec: 'h-10 px-4 rounded-[10px] border border-gray-200 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 inline-flex items-center gap-1.5 disabled:opacity-50',
  };
  const Spinner = () => e('div', { className: 'flex items-center justify-center py-10' },
    e('div', { className: 'animate-spin w-8 h-8 border-[3px] border-purple-700 border-t-transparent rounded-full', role: 'status', 'aria-label': 'Carregando' }));

  // Heurística pra provider sem schema: detecta o que é segredo.
  function ehChaveSecreta(k) {
    return /(secret|token|password|api_?key)$/i.test(k);
  }

  // Monta um schema genérico a partir das chaves de config do backend.
  function schemaGenerico(config) {
    const campos = Object.keys(config || {})
      .filter(k => !k.endsWith('_setado'))
      .map(k => ({ key: k, label: k, secret: ehChaveSecreta(k) }));
    return { icon: e("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, e("use", { href: "#i-package" })), grupos: [{ titulo: 'Configuração', campos }] };
  }

  // ────────────────────────────────────────────────────────────
  // COMPONENTE PRINCIPAL
  // ────────────────────────────────────────────────────────────
  function ModuloLogisticaProviders(props) {
    const apiUrl = props.API_URL || (typeof window !== 'undefined' && window.API_URL) || '';
    const fetchAuthExterno = props.fetchAuth || (typeof window !== 'undefined' && window.fetchAuth) || fetch;
    const showToast = props.showToast || function () {};

    // Refs estáveis — evita re-disparar o useEffect a cada render (loop infinito).
    const _fetchRef = useRef(fetchAuthExterno);
    const _apiRef = useRef(apiUrl);
    useEffect(() => { if (props.fetchAuth) _fetchRef.current = props.fetchAuth; }, [props.fetchAuth]);
    useEffect(() => { if (props.API_URL) _apiRef.current = props.API_URL; }, [props.API_URL]);

    const [providers, setProviders] = useState([]);
    const [loadingList, setLoadingList] = useState(true);
    const [expandido, setExpandido] = useState(null);   // provider_code | null

    const apiBase = () => `${_apiRef.current}/logistics`;
    const webhookUrlDe = (code) =>
      `${String(_apiRef.current).replace(/\/api$/, '')}/api/logistics/webhook/${code}`;

    // ─── Carregar lista de providers ───
    const carregarLista = useCallback(async () => {
      setLoadingList(true);
      try {
        const res = await _fetchRef.current(`${_apiRef.current}/logistics/providers`);
        if (res.status === 404) {
          showToast('Hub logístico ainda não está deployado no backend', 'warning');
          setProviders([]);
          return;
        }
        const d = await res.json();
        if (d && d.success) setProviders(d.providers || []);
        else setProviders([]);
      } catch (err) {
        console.error('[logistica/providers] erro carregar lista:', err);
        showToast('Erro ao carregar provedores', 'error');
      } finally {
        setLoadingList(false);
      }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { carregarLista(); }, [carregarLista]);

    // ─── Render ─── HUB_ABAS_V1: cabeçalho de página + lista em cards no padrão clean
    const nAtivos = providers.filter(p => p.ativo).length;
    return e('div', { className: 'max-w-4xl mx-auto px-4 py-5 md:px-6 md:py-6 space-y-4' },
      e('div', { className: 'flex items-end justify-between flex-wrap gap-3' },
        e('div', null,
          e('h1', { className: 'text-2xl font-bold text-gray-900', style: { fontFamily: 'Sora, Inter, sans-serif', letterSpacing: '-0.01em' } }, 'Provedores'),
          e('p', { className: 'text-[13px] text-gray-500 mt-1' },
            loadingList ? 'Credenciais, modo sandbox e ativação de cada parceiro do hub.'
              : `${providers.length} provedor${providers.length !== 1 ? 'es' : ''} · ${nAtivos} ativo${nAtivos !== 1 ? 's' : ''} · credenciais, modo sandbox e ativação de cada parceiro do hub`)
        ),
        e('button', { type: 'button', onClick: carregarLista, title: 'Atualizar', 'aria-label': 'Atualizar provedores', className: 'w-10 h-10 rounded-[10px] border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 grid place-items-center' }, Ico('refresh'))
      ),

      loadingList
        ? e('div', { className: 'bg-white rounded-[14px] border border-gray-200' }, Spinner())
        : providers.length === 0
          ? e('div', { className: 'bg-white rounded-[14px] border border-gray-200 py-14 px-6 text-center' },
              e('div', { className: 'text-[14px] font-semibold text-gray-700' }, 'Nenhum provedor cadastrado no hub'),
              e('div', { className: 'text-[13px] text-gray-500 mt-1' }, 'Os provedores aparecem aqui quando o backend do hub logístico os registra.'),
              e('button', { type: 'button', onClick: carregarLista, className: CLS.btnSec + ' mt-4' }, Ico('refresh'), 'Tentar de novo'))
          : e('div', { className: 'space-y-3' },
              providers.map(p => e(ProviderCard, {
                key: p.provider_code,
                provider: p,
                expandido: expandido === p.provider_code,
                onToggle: () => setExpandido(c => c === p.provider_code ? null : p.provider_code),
                apiBase, webhookUrlDe,
                fetchAuth: _fetchRef.current,
                showToast,
                onSalvou: carregarLista,
              }))
            )
    );
  }

  // ────────────────────────────────────────────────────────────
  // CARD DE UM PROVIDER (header + form ao expandir)
  // ────────────────────────────────────────────────────────────
  function ProviderCard({ provider, expandido, onToggle, apiBase, webhookUrlDe, fetchAuth, showToast, onSalvou }) {
    const code = provider.provider_code;

    const [detalhe, setDetalhe] = useState(null);   // resposta do GET /:code
    const [carregandoDet, setCarregandoDet] = useState(false);
    const [erroDet, setErroDet] = useState(null);    // mensagem de erro na carga
    const [form, setForm] = useState(null);          // estado editável
    const [salvando, setSalvando] = useState(false);
    const [testando, setTestando] = useState(false);
    const [testResult, setTestResult] = useState(null);

    // Carrega o detalhe na 1ª expansão (e re-carrega após salvar, quando
    // detalhe é zerado). Em caso de falha, registra erroDet — o gate de render
    // mostra um card de erro com botão "tentar de novo" em vez de spinner eterno.
    const carregarDetalhe = useCallback(async () => {
      setCarregandoDet(true);
      setErroDet(null);
      try {
        const res = await fetchAuth(`${apiBase()}/providers/${code}`);
        let d = null;
        try { d = await res.json(); } catch (_) { d = null; }

        if (res.ok && d && d.success && d.provider) {
          setDetalhe(d.provider);
          setForm({
            ativo: !!d.provider.ativo,
            sandbox_mode: !!d.provider.sandbox_mode,
            prioridade: d.provider.prioridade != null ? d.provider.prioridade : 100,
            config: { ...(d.provider.config || {}) },
          });
        } else {
          const msg = (d && d.error)
            ? d.error
            : `Falha ao carregar (HTTP ${res.status})`;
          setErroDet(msg);
          showToast('Erro ao carregar detalhe do provider', 'error');
        }
      } catch (err) {
        console.error('[logistica/providers] erro carregar detalhe:', err);
        setErroDet('Erro de rede ao carregar o provider.');
        showToast('Erro de rede ao carregar provider', 'error');
      } finally {
        setCarregandoDet(false);
      }
    }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

    // Dispara a carga na expansão e quando detalhe é zerado pós-salvar.
    useEffect(() => {
      if (!expandido || detalhe) return;
      carregarDetalhe();
    }, [expandido, detalhe, carregarDetalhe]);

    const schema = SCHEMA[code] || (detalhe ? schemaGenerico(detalhe.config) : { grupos: [] });

    const updateForm = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const updateConfig = (k, v) => setForm(f => ({ ...f, config: { ...f.config, [k]: v } }));

    // Monta o body do PUT a partir do schema + form.
    function montarPayload() {
      const body = {
        ativo: !!form.ativo,
        sandbox_mode: !!form.sandbox_mode,
        prioridade: parseInt(form.prioridade, 10) || 0,
      };
      const config = {};
      schema.grupos.forEach(g => g.campos.forEach(campo => {
        const val = form.config[campo.key];
        if (campo.topLevel) {
          // segredo top-level (ex: uber/99 webhook_secret) — só envia se digitou
          if (val && String(val).trim()) body[campo.key] = String(val).trim();
        } else if (campo.type === 'boolean') {
          // boolean real — o parser do backend testa `=== true`, não pode virar string
          config[campo.key] = (val === true || val === 'true');
        } else {
          // backend preserva segredo vazio; campo comum vai como está
          config[campo.key] = val == null ? '' : val;
        }
      }));
      body.config = config;
      return body;
    }

    const salvar = async () => {
      if (!form) return;
      setSalvando(true);
      try {
        const res = await fetchAuth(`${apiBase()}/providers/${code}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(montarPayload()),
        });
        const d = await res.json();
        if (res.ok && d && d.success) {
          if (d.aviso) showToast(d.aviso, 'warning');
          else showToast(`${provider.display_name}: configuração salva`, 'success');
          // recarrega o detalhe (segredos voltam mascarados) + a lista
          setDetalhe(null);
          if (onSalvou) onSalvou();
        } else {
          showToast((d && d.error) || 'Erro ao salvar', 'error');
        }
      } catch (err) {
        showToast('Erro de rede ao salvar', 'error');
      } finally {
        setSalvando(false);
      }
    };

    const testarConexao = async () => {
      setTestando(true);
      setTestResult(null);
      try {
        const res = await fetchAuth(`${apiBase()}/providers/${code}/test-connection`, { method: 'POST' });
        const d = await res.json();
        setTestResult({ ok: !!(d && d.ok), msg: (d && d.msg) || (res.ok ? 'OK' : 'Falha'), latencyMs: d && d.latencyMs });
      } catch (err) {
        setTestResult({ ok: false, msg: 'Erro de rede' });
      } finally {
        setTestando(false);
      }
    };

    // ─── Header do card ─── HUB_ABAS_V1: pílulas Ativo/Inativo e Sandbox/Produção
    return e('div', {
      className: 'bg-white border rounded-[14px] overflow-hidden ' + (expandido ? 'border-purple-200' : 'border-gray-200')
    },
      // Header (clicável)
      e('button', {
        type: 'button',
        className: 'w-full text-left flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 focus:outline-none focus-visible:bg-gray-50',
        onClick: onToggle, 'aria-expanded': !!expandido,
      },
        e('span', { className: 'inline-flex items-center' }, ProviderLogo(code, 36)),
        e('div', { className: 'flex-1 min-w-0' },
          e('div', { className: 'font-semibold text-gray-900 text-[15px]' }, provider.display_name),
          e('div', { className: 'text-xs text-gray-500 mt-0.5' },
            `${code} · prioridade ${provider.prioridade != null ? provider.prioridade : '—'}`)
        ),
        e('div', { className: 'flex items-center gap-1.5 flex-wrap justify-end' },
          provider.ativo ? Pilula('verde', 'Ativo', 'a') : Pilula('cinza', 'Inativo', 'a'),
          provider.sandbox_mode ? Pilula('ambar', 'Sandbox', 's') : Pilula('azul', 'Produção', 's'),
          !provider.has_adapter_class && Pilula('vermelho', 'Sem adapter', 'x')
        ),
        Ico('arrowdown', 16, { color: '#9ca3af', flexShrink: 0, transform: expandido ? 'rotate(180deg)' : 'none', transition: 'transform .15s' })
      ),

      // Corpo expandido
      expandido && e('div', { className: 'border-t border-gray-100 p-4 md:p-5 bg-gray-50' },
        carregandoDet
          ? Spinner()
          : erroDet
            ? e('div', { className: 'text-center py-8' },
                e('div', { className: 'text-[14px] font-semibold text-gray-700' }, 'Não foi possível carregar este provedor'),
                e('p', { className: 'text-[13px] text-gray-500 mt-1 mb-4' }, erroDet),
                e('button', { type: 'button', onClick: carregarDetalhe, className: CLS.btnSec }, Ico('refresh'), 'Tentar de novo'))
            : (!form || !detalhe)
              ? Spinner()
              : e(ProviderForm, {
                  code, provider, detalhe, schema, form,
                  updateForm, updateConfig,
                  webhookUrl: webhookUrlDe(code),
                  salvar, salvando,
                  testarConexao, testando, testResult,
                })
      )
    );
  }

  // ────────────────────────────────────────────────────────────
  // FORM DE CONFIGURAÇÃO DE UM PROVIDER
  // ────────────────────────────────────────────────────────────
  function ProviderForm(p) {
    const { provider, detalhe, schema, form, updateForm, updateConfig,
            webhookUrl, salvar, salvando, testarConexao, testando, testResult } = p;

    // HUB_ABAS_V1: formulário de credenciais em cards brancos; labels visíveis 12px; inputs 38px.
    // Toggle estilo switch (roxo ligado / cinza desligado)
    const Toggle = (label, sub, checked, onChange) =>
      e('div', { className: 'flex items-center justify-between gap-4 py-2.5' },
        e('div', { className: 'min-w-0' },
          e('div', { className: 'text-[13.5px] font-semibold text-gray-900' }, label),
          sub && e('div', { className: 'text-[12px] text-gray-500 mt-0.5 leading-snug' }, sub)
        ),
        e('label', { className: 'inline-flex items-center cursor-pointer flex-shrink-0' },
          e('input', { type: 'checkbox', checked: !!checked, onChange: ev => onChange(ev.target.checked), className: 'sr-only peer', 'aria-label': label }),
          e('div', { className: "w-11 h-6 bg-gray-300 peer-focus-visible:ring-2 peer-focus-visible:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-700 relative" })
        )
      );

    const idDe = (k) => `prov-${provider.provider_code}-${k}`;

    // Campo comum
    const Field = (campo) =>
      e('div', { key: campo.key },
        e('label', { className: CLS.label, htmlFor: idDe(campo.key) }, campo.label),
        e('input', {
          id: idDe(campo.key),
          type: 'text',
          value: form.config[campo.key] || '',
          onChange: ev => updateConfig(campo.key, ev.target.value),
          placeholder: campo.hint || '',
          className: CLS.input
        })
      );

    // Campo select — enum fechado (ex: package_type/package_weight da 99).
    const SelectField = (campo) =>
      e('div', { key: campo.key },
        e('label', { className: CLS.label, htmlFor: idDe(campo.key) }, campo.label),
        e('select', {
          id: idDe(campo.key),
          value: form.config[campo.key] || '',
          onChange: ev => updateConfig(campo.key, ev.target.value),
          className: CLS.input
        },
          e('option', { value: '' }, '— selecione —'),
          (campo.options || []).map(opt => e('option', { key: opt, value: opt }, opt))
        ),
        campo.hint && e('p', { className: CLS.hint }, campo.hint)
      );

    // Campo de segredo — backend nunca devolve o valor; só a flag _setado.
    // topLevel lê a flag de provider.{key}_setado; config lê de config.{key}_setado.
    const SecretField = (campo) => {
      const setado = campo.topLevel
        ? !!(detalhe && detalhe[campo.key + '_setado'])
        : !!(form.config && form.config[campo.key + '_setado']);
      return e('div', { key: campo.key },
        e('label', { className: CLS.label, htmlFor: idDe(campo.key) }, campo.label),
        e('input', {
          id: idDe(campo.key),
          type: 'password',
          value: form.config[campo.key] || '',
          onChange: ev => updateConfig(campo.key, ev.target.value),
          // HUB_ABAS_V1: placeholder precisa ser texto (antes ia um elemento e aparecia "[object Object]")
          placeholder: setado ? 'Configurado · cole um novo valor só para alterar' : (campo.hint || 'Cole o valor aqui'),
          autoComplete: 'new-password',
          className: CLS.input
        }),
        setado && e('p', { className: 'text-[11.5px] text-green-800 mt-1 inline-flex items-center gap-1' },
          Ico('check', 13, { color: '#16a34a' }), 'Já existe valor salvo. Deixe em branco para preservar.')
      );
    };

    // [uber-painel-verificacao-v1] Campo somente-leitura. Nao escreve em
    // form.config — serve pra explicar comportamento AUTOMATICO que o operador
    // nao configura (ex.: codigo de coleta nativo da Uber). Sem esse tipo, a
    // unica alternativa seria manter um toggle que mente sobre o que faz.
    const InfoField = (campo) =>
      e('div', { key: campo.key },
        e('div', { className: CLS.label }, campo.label),
        e('div', { className: 'w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-[10px] text-[13px] text-gray-700' },
          campo.texto || ''),
        campo.hint && e('p', { className: CLS.hint }, campo.hint)
      );

    // Campo boolean — renderizado como toggle (ex: códigos de verificação da 99).
    const BooleanField = (campo) => {
      const val = form.config[campo.key] === true || form.config[campo.key] === 'true';
      return e('div', { key: campo.key, className: 'border-t border-gray-100 first:border-t-0' },
        Toggle(campo.label, campo.hint, val, v => updateConfig(campo.key, v))
      );
    };

    const Grupo = (titulo, filhos, key, sub) =>
      e('section', { key, className: 'bg-white rounded-[14px] border border-gray-200 p-4' },
        e('h3', { className: 'text-[15px] font-semibold text-gray-900' }, titulo),
        sub && e('p', { className: 'text-[12px] text-gray-500 mt-0.5' }, sub),
        e('div', { className: 'mt-3' }, filhos));

    return e('div', { className: 'space-y-3' },
      // Status
      Grupo('Status', [
        e('div', { key: 't', className: 'divide-y divide-gray-100' },
          Toggle('Ativo', 'registra o adapter no hub', form.ativo, v => updateForm('ativo', v)),
          Toggle('Sandbox', 'sem corridas/entregas reais', form.sandbox_mode, v => updateForm('sandbox_mode', v))
        ),
        // Aviso quando marcado ativo mas adapter não instanciou
        provider.ativo && provider.instanciado === false && e('div', {
          key: 'w', className: 'mt-2 text-[12px] bg-amber-50 border border-amber-200 text-amber-800 rounded-[10px] px-3 py-2 inline-flex items-center gap-1.5'
        }, Ico('alert', 14, { color: '#d97706' }), 'Marcado como ativo, mas o adapter não está instanciado — confira se a config está completa.'),
        // Prioridade
        e('div', { key: 'p', className: 'mt-3 pt-3 border-t border-gray-100' },
          e('label', { className: CLS.label, htmlFor: idDe('prioridade') }, 'Prioridade'),
          e('div', { className: 'flex items-center gap-3 flex-wrap' },
            e('input', {
              id: idDe('prioridade'),
              type: 'number',
              value: form.prioridade,
              onChange: ev => updateForm('prioridade', parseInt(ev.target.value, 10) || 0),
              className: CLS.input + ' max-w-[120px]'
            }),
            e('span', { className: 'text-[12px] text-gray-500' }, 'menor = preferido nas estratégias multi-provider'))
        ),
      ], 'status'),

      // Grupos de campos do schema
      schema.grupos.map((grupo, gi) => {
        const soBool = grupo.campos.every(c => c.type === 'boolean');
        return Grupo(grupo.titulo,
          e('div', { className: soBool ? '' : 'grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3' },
            grupo.campos.map(campo =>
              campo.type === 'info' ? InfoField(campo)
                : campo.type === 'boolean' ? (soBool ? BooleanField(campo) : e('div', { key: campo.key, className: 'sm:col-span-2' }, BooleanField(campo)))
                : campo.type === 'select' ? SelectField(campo)
                : campo.secret ? SecretField(campo)
                : Field(campo))),
          'g' + gi);
      }),

      // URL do webhook
      Grupo('Webhook', [
        e('p', { key: 'l', className: 'text-[12px] text-gray-500 mb-1.5' }, 'URL para cadastrar no painel do provedor:'),
        e('div', { key: 'u', className: 'flex items-center gap-2' },
          e('code', { className: 'flex-1 min-w-0 block bg-gray-50 border border-gray-200 rounded-[10px] px-3 py-2 text-[12px] text-gray-800 break-all font-mono' }, webhookUrl),
          e('button', {
            type: 'button', title: 'Copiar URL', 'aria-label': 'Copiar URL do webhook',
            onClick: () => { try { navigator.clipboard.writeText(webhookUrl); } catch (_) {} },
            className: 'w-10 h-10 rounded-[10px] border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 grid place-items-center flex-shrink-0'
          }, Ico('copy')))
      ], 'wh'),

      // Ações
      e('div', { className: 'flex items-center gap-2 flex-wrap pt-1' },
        e('button', {
          type: 'button', onClick: testarConexao, disabled: testando,
          className: CLS.btnSec
        }, Ico('power'), testando ? 'Testando…' : 'Testar conexão'),

        // HUB_ABAS_V1: resultado em pílula (antes o ícone virava "[object Object]" no texto)
        testResult && e('span', { role: 'status' },
          Pilula(testResult.ok ? 'verde' : 'vermelho',
            `${testResult.ok ? 'Conectado' : 'Falhou'} · ${testResult.msg}${testResult.latencyMs != null ? ` (${testResult.latencyMs} ms)` : ''}`)),

        e('div', { className: 'flex-1' }),

        e('button', {
          type: 'button', onClick: salvar, disabled: salvando,
          className: CLS.btnPri
        }, Ico('save'), salvando ? 'Salvando…' : 'Salvar')
      )
    );
  }

  // ────────────────────────────────────────────────────────────
  // EXPORT GLOBAL (padrão dos outros módulos)
  // ────────────────────────────────────────────────────────────
  if (typeof window !== 'undefined') {
    window.ModuloLogisticaProviders = ModuloLogisticaProviders;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ModuloLogisticaProviders };
  }

  console.log('✅ ModuloLogisticaProviders v1 carregado');
})();
