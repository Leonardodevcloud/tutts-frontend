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
      icon: '🛵',
      grupos: [
        { titulo: '🔑 Credenciais 99Entrega (OAuth)', campos: [
          { key: 'client_id',     label: 'Client ID',     secret: false, hint: 'client_id da 99Entrega' },
          { key: 'client_secret', label: 'Client Secret', secret: true,  hint: 'client_secret da 99Entrega' },
        ]},
        { titulo: '📦 Padrões do pacote', campos: [
          { key: 'package_type',   label: 'Tipo do pacote',  type: 'select',
            options: ['groceries', 'food', 'documents', 'apparel', 'medication', 'electronics', 'others'],
            hint: 'enum fixo da 99 — autopecas nao existe; use "others"' },
          { key: 'package_weight', label: 'Peso do pacote',  type: 'select',
            options: ['1kg', '5kg', '10kg', '20kg', '30kg'],
            hint: 'enum fixo da 99 — ate 25kg: use "30kg"' },
        ]},
        { titulo: '📞 Contato', campos: [
          { key: 'telefone_suporte', label: 'Telefone de suporte', secret: false,
            hint: 'fallback quando a OS não tem telefone' },
        ]},
        { titulo: '🔐 Códigos de verificação', campos: [
          { key: 'need_pickup_code',  label: 'Exigir código na coleta',  type: 'boolean',
            hint: 'courier informa um código pra retirar o pacote' },
          { key: 'need_dropoff_code', label: 'Exigir código na entrega', type: 'boolean',
            hint: 'destinatário informa um código pra receber' },
        ]},
        { titulo: '⚙️ Avançado', campos: [
          { key: 'cancel_reason_id', label: 'Cancel reason ID padrão', secret: false,
            hint: 'enum 410013…410021 — default 410013' },
        ]},
        { titulo: '🪝 Webhook (HMAC-SHA256)', campos: [
          // webhook_secret é coluna top-level — não vai dentro de config
          { key: 'webhook_secret', label: 'Webhook Secret (HMAC)', secret: true, topLevel: true,
            hint: 'se vazio, usa o client_secret pra validar a assinatura' },
        ]},
      ],
    },
    uber: {
      icon: '🛵',
      grupos: [
        { titulo: '🚗 Credenciais Uber Direct', campos: [
          { key: 'client_id',     label: 'Client ID',     secret: false },
          { key: 'client_secret', label: 'Client Secret', secret: true },
          { key: 'customer_id',   label: 'Customer ID',   secret: false },
          { key: 'webhook_secret', label: 'Webhook Secret (HMAC)', secret: true, topLevel: true },
        ]},
        { titulo: '📞 Contato', campos: [
          { key: 'telefone_suporte', label: 'Telefone de suporte (fallback)',
            hint: 'Usado quando o ponto de coleta/entrega não tem telefone cadastrado. Formato: 5571999999999' },
        ]},
        { titulo: '🔑 Verificação de coleta e entrega', campos: [
          { key: 'verificacao_coleta_habilitada',  label: 'Habilitar código de coleta',  type: 'boolean',
            hint: 'Motoboy precisa informar o código ao atendente antes de pegar o pacote. Código enviado por WhatsApp à loja.' },
          { key: 'verificacao_entrega_habilitada', label: 'Habilitar verificação de entrega', type: 'boolean',
            hint: 'Exige confirmação do destinatário no momento da entrega.' },
          { key: 'verificacao_entrega_tipo', label: 'Tipo de verificação de entrega',
            hint: 'codigo = PIN enviado ao destinatário via WhatsApp. assinatura = assinatura digital no app do motoboy (padrão).' },
        ]},
        { titulo: '📸 Comprovante de entrega', campos: [
          { key: 'proof_of_delivery_habilitado', label: 'Coletar comprovante de entrega (foto/assinatura)', type: 'boolean',
            hint: 'Após entrega concluída, busca automaticamente na Uber Direct a foto e assinatura do recebedor.' },
          { key: 'manifest_total_value_centavos', label: 'Valor declarado da mercadoria (centavos)',
            hint: 'Valor em centavos. Ex: 10000 = R$ 100,00. Padrão: 10000.' },
        ]},
      ],
    },
  };

  function iconDe(code) {
    return (SCHEMA[code] && SCHEMA[code].icon) || '📦';
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
      '<path d="M0 46.4444C0 20.7939 20.7939 0 46.4444 0H162.556C188.206 0 209 20.7939 209 46.4444V162.556C209 188.206 188.206 209 162.556 209H46.4444C20.7939 209 0 188.206 0 162.556V46.4444Z" fill="#212121"/>' +
      '<path fill-rule="evenodd" clip-rule="evenodd" d="M68.3442 55.1528C79.373 55.1528 89.1552 60.5957 95.2622 68.9939C99.1792 74.3808 101.576 80.9841 101.855 88.1472V89.3804C101.855 96.36 99.8283 102.865 96.3157 108.275L67.5618 153.086C67.2567 153.561 66.7381 153.847 66.1817 153.847H43.3702C42.2719 153.847 41.613 152.602 42.2148 151.663L60.7855 122.723C45.9202 119.221 34.8334 105.627 34.8334 89.3804L34.8643 88.1472C35.1118 81.0028 37.498 74.4152 41.3972 69.0364C47.502 60.6143 57.2972 55.1528 68.3442 55.1528ZM68.3442 100.691C72.3576 100.691 75.909 98.7126 78.1455 95.6683L79.081 94.2104C80.0497 92.4185 80.6038 90.3607 80.6029 88.1472C80.5912 81.2422 75.1079 75.6479 68.3442 75.6479C61.5805 75.6479 56.0977 81.2422 56.0846 88.1692C56.0846 95.0851 61.5735 100.691 68.3442 100.691Z" fill="#F1F1F1"/>' +
      '<path fill-rule="evenodd" clip-rule="evenodd" d="M167.573 68.9939C161.467 60.5957 151.685 55.1528 140.656 55.1528C129.609 55.1528 119.813 60.6143 113.709 69.0364C109.81 74.4152 107.423 81.0028 107.175 88.1472L107.145 89.3804C107.145 105.627 118.232 119.221 133.097 122.723L114.526 151.663C113.924 152.602 114.583 153.847 115.681 153.847H138.493C139.049 153.847 139.568 153.561 139.873 153.086L168.627 108.275C172.14 102.865 174.167 96.36 174.167 89.3804V88.1472C173.887 80.9841 171.49 74.3808 167.573 68.9939ZM140.656 100.691C144.669 100.691 148.221 98.7126 150.457 95.6683L151.392 94.2104C152.361 92.4185 152.915 90.3607 152.914 88.1472C152.903 81.2422 147.419 75.6479 140.656 75.6479C133.892 75.6479 128.409 81.2422 128.396 88.1692C128.396 95.0852 133.885 100.691 140.656 100.691Z" fill="#F1F1F1"/>' +
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
    return e('span', { style: { fontSize: size * 0.75 } }, iconDe(code));
  }

  // Heurística pra provider sem schema: detecta o que é segredo.
  function ehChaveSecreta(k) {
    return /(secret|token|password|api_?key)$/i.test(k);
  }

  // Monta um schema genérico a partir das chaves de config do backend.
  function schemaGenerico(config) {
    const campos = Object.keys(config || {})
      .filter(k => !k.endsWith('_setado'))
      .map(k => ({ key: k, label: k, secret: ehChaveSecreta(k) }));
    return { icon: '📦', grupos: [{ titulo: '🔧 Configuração', campos }] };
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

    // ─── Render ───
    return e('div', { className: 'max-w-3xl mx-auto p-4 md:p-6' },
      e('div', { className: 'mb-5' },
        e('h2', { className: 'text-2xl font-semibold text-gray-900 mb-1 flex items-center gap-2' },
          e('span', null, '🔌'),
          e('span', null, 'Provedores logísticos')
        ),
        e('p', { className: 'text-sm text-gray-500' },
          'Configure credenciais, modo sandbox e ativação de cada parceiro do hub.')
      ),

      loadingList
        ? e('div', { className: 'flex items-center justify-center py-16' },
            e('div', { className: 'animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full' }))
        : providers.length === 0
          ? e('div', { className: 'text-center py-16 text-gray-400 bg-gray-50 rounded-xl' },
              e('div', { className: 'text-3xl mb-2' }, '🗺️'),
              e('p', { className: 'text-sm' }, 'Nenhum provider cadastrado no hub.'))
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

    // ─── Header do card ───
    const pill = (texto, classe) => e('span', {
      className: `text-[11px] font-medium px-2 py-0.5 rounded-md ${classe}`
    }, texto);

    return e('div', {
      className: `bg-white border rounded-xl ${expandido ? 'border-purple-300 shadow-sm' : 'border-gray-200'}`
    },
      // Header (clicável)
      e('div', {
        className: 'flex items-center gap-3 p-3.5 cursor-pointer',
        onClick: onToggle
      },
        e('span', { className: 'inline-flex items-center' }, ProviderLogo(code, 36)),
        e('div', { className: 'flex-1 min-w-0' },
          e('div', { className: 'font-semibold text-gray-900 text-sm' }, provider.display_name),
          e('div', { className: 'text-[11px] text-gray-500' },
            `provider_code: ${code} · prioridade ${provider.prioridade}`)
        ),
        provider.ativo
          ? pill('Ativo', 'bg-green-100 text-green-700')
          : pill('Inativo', 'bg-gray-100 text-gray-600'),
        provider.sandbox_mode
          ? pill('Sandbox', 'bg-amber-100 text-amber-700')
          : pill('Produção', 'bg-blue-100 text-blue-700'),
        !provider.has_adapter_class && pill('Sem adapter', 'bg-red-100 text-red-700'),
        e('span', { className: 'text-gray-400 text-lg leading-none' }, expandido ? '▴' : '▾')
      ),

      // Corpo expandido
      expandido && e('div', { className: 'border-t border-gray-100 p-4' },
        carregandoDet
          ? e('div', { className: 'flex items-center justify-center py-8' },
              e('div', { className: 'animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full' }))
          : erroDet
            ? e('div', { className: 'text-center py-8' },
                e('div', { className: 'text-3xl mb-2' }, '⚠️'),
                e('p', { className: 'text-sm text-red-600 mb-3' }, erroDet),
                e('button', {
                  onClick: carregarDetalhe,
                  className: 'inline-flex items-center gap-1.5 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200'
                }, '🔄 Tentar de novo'))
            : (!form || !detalhe)
              ? e('div', { className: 'flex items-center justify-center py-8' },
                  e('div', { className: 'animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full' }))
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

    // Toggle estilo switch (mesmo padrão visual do modulo-uber)
    const Toggle = (label, sub, checked, onChange) =>
      e('div', { className: 'flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5' },
        e('div', null,
          e('div', { className: 'text-sm font-medium text-gray-800' }, label),
          sub && e('div', { className: 'text-[11px] text-gray-500' }, sub)
        ),
        e('label', { className: 'inline-flex items-center cursor-pointer' },
          e('input', { type: 'checkbox', checked: !!checked, onChange: ev => onChange(ev.target.checked), className: 'sr-only peer' }),
          e('div', { className: "w-11 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 relative" })
        )
      );

    // Campo comum
    const Field = (campo) =>
      e('div', { className: 'mb-3', key: campo.key },
        e('label', { className: 'block text-[11px] font-semibold text-gray-600 mb-1 uppercase' }, campo.label),
        e('input', {
          type: 'text',
          value: form.config[campo.key] || '',
          onChange: ev => updateConfig(campo.key, ev.target.value),
          placeholder: campo.hint || '',
          className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent'
        })
      );

    // Campo select — enum fechado (ex: package_type/package_weight da 99).
    const SelectField = (campo) =>
      e('div', { className: 'mb-3', key: campo.key },
        e('label', { className: 'block text-[11px] font-semibold text-gray-600 mb-1 uppercase' }, campo.label),
        e('select', {
          value: form.config[campo.key] || '',
          onChange: ev => updateConfig(campo.key, ev.target.value),
          className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent'
        },
          e('option', { value: '' }, '— selecione —'),
          (campo.options || []).map(opt => e('option', { key: opt, value: opt }, opt))
        ),
        campo.hint && e('p', { className: 'text-[11px] text-gray-400 mt-1' }, campo.hint)
      );

    // Campo de segredo — backend nunca devolve o valor; só a flag _setado.
    // topLevel lê a flag de provider.{key}_setado; config lê de config.{key}_setado.
    const SecretField = (campo) => {
      const setado = campo.topLevel
        ? !!(detalhe && detalhe[campo.key + '_setado'])
        : !!(form.config && form.config[campo.key + '_setado']);
      return e('div', { className: 'mb-3', key: campo.key },
        e('label', { className: 'block text-[11px] font-semibold text-gray-600 mb-1 uppercase' }, campo.label),
        e('input', {
          type: 'password',
          value: form.config[campo.key] || '',
          onChange: ev => updateConfig(campo.key, ev.target.value),
          placeholder: setado
            ? '✓ Configurado · cole novo valor só pra alterar'
            : (campo.hint || 'Cole o valor aqui'),
          className: `w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
            setado ? 'border-green-300 bg-green-50' : 'border-gray-300'
          }`
        }),
        setado && e('p', { className: 'text-[11px] text-green-700 mt-1' },
          '✓ Já existe valor salvo. Deixe em branco pra preservar.')
      );
    };

    // Campo boolean — renderizado como toggle (ex: códigos de verificação da 99).
    const BooleanField = (campo) => {
      const val = form.config[campo.key] === true || form.config[campo.key] === 'true';
      return e('div', { className: 'mb-2', key: campo.key },
        Toggle(campo.label, campo.hint, val, v => updateConfig(campo.key, v))
      );
    };

    return e('div', null,
      // Toggles de status
      e('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4' },
        Toggle('Ativo', 'registra o adapter no hub', form.ativo, v => updateForm('ativo', v)),
        Toggle('Sandbox', 'sem corridas/entregas reais', form.sandbox_mode, v => updateForm('sandbox_mode', v))
      ),

      // Aviso quando marcado ativo mas adapter não instanciou
      provider.ativo && provider.instanciado === false && e('div', {
        className: 'mb-4 text-[12px] bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2'
      }, '⚠️ Marcado como ativo, mas o adapter não está instanciado — confira se a config está completa.'),

      // Grupos de campos do schema
      schema.grupos.map((grupo, gi) =>
        e('div', { key: gi, className: 'mb-4' },
          e('div', { className: 'text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2' }, grupo.titulo),
          grupo.campos.map(campo =>
            campo.type === 'boolean' ? BooleanField(campo)
              : campo.type === 'select' ? SelectField(campo)
              : campo.secret ? SecretField(campo)
              : Field(campo))
        )
      ),

      // Prioridade
      e('div', { className: 'mb-4' },
        e('label', { className: 'block text-[11px] font-semibold text-gray-600 mb-1 uppercase' }, 'Prioridade'),
        e('input', {
          type: 'number',
          value: form.prioridade,
          onChange: ev => updateForm('prioridade', parseInt(ev.target.value, 10) || 0),
          className: 'w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent'
        }),
        e('span', { className: 'text-[11px] text-gray-400 ml-2' }, 'menor = preferido nas estratégias multi-provider')
      ),

      // URL do webhook
      e('div', { className: 'bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4' },
        e('p', { className: 'text-[11px] text-blue-800 mb-1 font-medium' },
          'URL do webhook pra cadastrar no painel do provedor:'),
        e('code', {
          className: 'block bg-white rounded px-2 py-1.5 text-[11px] text-blue-900 break-all font-mono'
        }, webhookUrl)
      ),

      // Ações
      e('div', { className: 'flex items-center gap-2 flex-wrap pt-2 border-t border-gray-100' },
        e('button', {
          onClick: testarConexao, disabled: testando,
          className: 'inline-flex items-center gap-1.5 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 disabled:opacity-50'
        }, testando ? 'Testando…' : '🔌 Testar conexão'),

        testResult && e('span', {
          className: `inline-flex items-center gap-1 text-[12px] px-2.5 py-1 rounded-md ${
            testResult.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`
        }, `${testResult.ok ? '✓' : '✗'} ${testResult.msg}${testResult.latencyMs != null ? ` (${testResult.latencyMs}ms)` : ''}`),

        e('div', { className: 'flex-1' }),

        e('button', {
          onClick: salvar, disabled: salvando,
          className: 'inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50'
        }, salvando ? 'Salvando…' : '💾 Salvar')
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
