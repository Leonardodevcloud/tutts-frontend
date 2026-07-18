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
  const POLLING_TIMEOUT  = 120000;

  // GPS_UNICO_V1 — precisao do GPS (metros do raio que o aparelho reporta).
  //
  // Isto existe porque a regra do backend agora e SO distancia (<=100 m). Um GPS
  // com +-96 m de erro — e a gente ja viu +-96 no print de producao — faz a
  // validacao virar cara ou coroa: o aparelho nao sabe onde ele esta com precisao
  // suficiente pra responder a pergunta que estamos fazendo.
  //
  // Melhor travar o envio e dizer o que fazer do que deixar enviar e barrar
  // depois, que e onde o suporte toca.
  //
  //   <= BOM      verde, envia
  //   <= LIMITE   amarelo, avisa mas deixa enviar
  //    > LIMITE   trava, com instrucao
  //
  // Como o GPS roda em watchPosition, isso se resolve sozinho: ele anda ate a
  // porta, a precisao melhora e o botao destrava na cara dele. Sem toque nenhum.
  //
  // Os numeros sao chute educado (dentro de loja, coberto, o tipico e 30-60 m).
  // Se travar gente honesta, e uma linha: sobe o GPS_ACC_LIMITE.
  const GPS_ACC_BOM    = 30;
  const GPS_ACC_LIMITE = 60;
  // AGENTE_BCE_V1 (const): MAX_FOTO_SIZE saiu junto com o upload de foto.

  // ── Helpers ────────────────────────────────────────────────────────────────
  function fmtDT(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function BadgeStatus({ status }) {
    // ADMIN_BCE_V1 (badge): 'barrado', 'falhou' e 'bloqueado_cliente' entraram no
    // mapa. Os tres ja existiam no banco (e 'falhou' aparece na tela desde 2026-04),
    // mas caiam no fallback cinza que so imprime a string crua do status.
    const map = {
      pendente:     { bg: 'bg-yellow-100',  text: 'text-yellow-800',  label: 'Pendente'     },
      processando:  { bg: 'bg-blue-100',    text: 'text-blue-800',    label: 'Processando'  },
      sucesso:      { bg: 'bg-green-100',   text: 'text-green-800',   label: 'Sucesso'      },
      erro:         { bg: 'bg-red-100',     text: 'text-red-800',     label: 'Erro'         },
      falhou:       { bg: 'bg-orange-100',  text: 'text-orange-800',  label: 'Falhou'       },
      // Reprovada na validacao B/C/E — nunca virou job do Playwright.
      barrado:      { bg: 'bg-red-100',     text: 'text-red-800',     label: '🛑 Barrado'   },
      bloqueado_cliente: { bg: 'bg-gray-200', text: 'text-gray-700',  label: 'Cliente bloqueado' },
    };
    const s = map[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status };
    return h('span', {
      className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`
    }, s.label);
  }

  // AGENTE_BCE_V1 (compress) — compressImage() foi removida.
  //
  // Ela existia so pra encolher a foto da fachada antes do upload. Sem foto, sem
  // caller. Nao e "dead code inofensivo": sao 130 linhas de canvas/HEIC/OOM que a
  // proxima pessoa a ler o arquivo vai achar que ainda importam.
  //
  // A logica NAO se perdeu: ela ja vivia em window.imageUtils.compressImageSafe
  // (image-utils.js, compartilhado), que este arquivo so embrulhava. O modulo
  // Coleta continua usando o compartilhado.

  // ── ABA: Formulário do motoboy ──────────────────────────────────────────────
  function TabFormulario({ API_URL, fetchAuth, showToast }) {
    // GPS_UNICO_V1: localizacao_raw sai do form. Ela nunca foi digitada — era o
    // GPS copiado por um clique. Agora e montada no submit, do gps ao vivo.
    const [form, setForm]           = useState({ os_numero: '', ponto: '' });
    const [loading, setLoading]     = useState(false);
    const [solicitacaoId, setSolId] = useState(null);
    const [fase, setFase]           = useState('idle');
    const [detalheErro, setDetalhe] = useState('');
    const pollingRef                = useRef(null);
    const timeoutRef                = useRef(null);
    // AGENTE_BCE_V1 (states) — a foto saiu. Com ela foram os dois refs de input
    // (camera/galeria) e os dois states de imagem. A validacao agora e B/C/E:
    // GPS, Receita e endereco digitado. Nenhuma delas olha imagem.

    // GPS states
    const [gps, setGps]             = useState(null);       // { lat, lng }
    const [gpsLoading, setGpsLoad]  = useState(false);
    const [gpsErro, setGpsErro]     = useState('');
    // BARRADO_CNPJ_V1: o state `checks` saiu. Com a regra nova (so o B decide) o
    // backend manda UMA conferencia — e checklist de um item nao e checklist: o
    // item "❌ Você está no endereço desse CNPJ" e a frase "Você não está no
    // endereço desse CNPJ" diziam a mesma coisa, uma embaixo da outra.
    // O `checks` continua vindo na resposta e continua sendo gravado no
    // validacao_nf da barrada — o painel admin ve. A tela do motoboy nao precisa.
    const [barradoInfo, setBarradoInfo] = useState(null); // { indisponivel, cnpj, razao_social }
    const [validacaoReceita, setValidacaoReceita] = useState(null); // { nome, situacao, ativa, mensagem }
    // 2026-04 v5: única forma de identificar cliente é CNPJ digitado.
    // Foto da NF foi removida porque motos não conseguiam capturar legível.
    const [cnpjManual, setCnpjManual] = useState('');
    const [valoresOS, setValoresOS] = useState(null); // { antes, depois }
    const [bloqueioInfo, setBloqueioInfo] = useState(null); // 2026-07: { loja, numero }

    // Progresso real do RPA — atualizados pelo polling (campos etapa_atual / progresso do banco).
    const [progresso, setProgresso] = useState(5);
    const [etapa, setEtapa]         = useState('iniciando');

    // GPS_UNICO_V1: pontoCoords morreu — ele era o GPS congelado, e agora so existe
    // o gps ao vivo. Sobram os dois do endereco reverso, que a caixa do GPS mostra.
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
          // GPS_FRESCO_V1_TS — a coordenada passa a carregar a IDADE dela.
          //
          // Sem isto não existe como saber se o `gps` do state é de agora ou de
          // vinte minutos atrás. E essa diferença é tudo: o watchPosition PARA de
          // disparar quando o navegador vai pro background — celular no bolso,
          // tela apagada, Android com otimização de bateria. O último callback
          // fica congelado onde ele estava quando abriu a tela.
          //
          // A trava de precisão não pega isso, e é importante entender por quê:
          // uma leitura de 20 minutos atrás pode ter accuracy=12. Ela ERA precisa.
          // O gate olha o raio de erro, passa, o botão fica verde, e a coordenada
          // velha viaja como se fosse fresca.
          //
          // A trava mede a precisão da leitura. Ninguém media a idade dela.
          //
          // pos.timestamp é o do aparelho, no instante da fixação — é o que a
          // Geolocation API entrega e é o que interessa aqui.
          setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, ts: pos.timestamp || Date.now() });
          setGpsLoad(false);
          setGpsErro('');
        },
        (err) => {
          const msgs = {
            1: '⚠️ Permissão de localização negada.\n\nSe aparecer "Este site não pode pedir permissões", feche apps com bolha flutuante (WhatsApp, Messenger, filtro de tela, etc) e tente novamente.',
            2: 'Localização indisponível. Verifique se o GPS está ativado.',
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

    // AGENTE_BCE_V1 (handleFoto) — removida junto com o campo de foto.

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

          // Atualizar progresso visível (vem dos UPDATE que o playwright-agent.js faz via onProgresso).
          // Usamos Math.max para evitar regressão caso uma resposta atrase.
          if (typeof data.progresso === 'number') {
            setProgresso(prev => Math.max(prev, data.progresso));
          }
          if (data.etapa_atual) {
            setEtapa(data.etapa_atual);
          }

          if (data.status === 'sucesso') {
            if (data.valores_antes || data.valores_depois) {
              setValoresOS({ antes: data.valores_antes, depois: data.valores_depois });
            }
            pararPolling(); setFase('sucesso'); setLoading(false);
          } else if (data.status === 'erro') {
            const erro = data.detalhe_erro || 'Erro desconhecido.';
            pararPolling();
            if (erro.includes('ENDERECO_JA_CORRIGIDO') || erro.includes('já foi corrigido anteriormente')) {
              setFase('ja_corrigido');
            } else {
              setDetalhe(erro); setFase('erro');
            }
            setLoading(false);
          } else if (data.status === 'bloqueado_cliente') {
            // 2026-07: cliente bloqueado para ajuste — mostra tela de suporte
            pararPolling();
            setBloqueioInfo({ loja: data.bloqueio_loja || '', numero: data.numero_suporte || '557189260372' });
            setFase('bloqueado_cliente');
            setLoading(false);
          }
        } catch {}
      }, POLLING_INTERVAL);
    }, [fetchAuth, API_URL, pararPolling]);

    const handleChange = (e) => {
      const { name, value } = e.target;
      setForm(f => ({ ...f, [name]: value }));
    };

    // GPS_UNICO_V1 — enviarLocalizacao() foi removida. Junto com ela, o botao
    // "Enviar minha localização atual" e o passo inteiro.
    //
    // O BUG QUE ISSO FECHA (o motivo real, nao a economia de um toque):
    //
    // O GPS ja roda em watchPosition desde que a pagina abre — ao vivo, continuo.
    // O botao so COPIAVA esse valor pro form:
    //
    //     const coordStr = `${gps.lat}, ${gps.lng}`;
    //     setForm(f => ({ ...f, localizacao_raw: coordStr }));
    //
    // Só que o payload mandava DOIS numeros diferentes:
    //
    //     localizacao_raw: form.localizacao_raw   <- congelado no clique do botao
    //     motoboy_lat:     gps.lat                <- AO VIVO, no submit
    //
    // A validacao media o motoboy_lat/lng. O RPA gravava o ponto a partir do
    // localizacao_raw (normalizeLocation -> UPDATE latitude/longitude). Ou seja:
    // o sistema validava um numero e escrevia o outro.
    //
    // Dava pra passar por cima de tudo CAMINHANDO: aperta o botao onde voce quer o
    // ponto, anda ate a porta do cliente, digita o CNPJ e envia. A validacao olha o
    // GPS ao vivo (esta na loja, passa) e grava o ponto congelado la atras. Nenhuma
    // regua de metros pega isso, porque os metros conferidos nao sao os escritos.
    //
    // Agora ha UMA fonte: o gps do watchPosition, lido no submit, usado pros dois
    // campos. Nao e regra nova — e o buraco deixando de existir por construcao.
    //
    // O endereco reverso (a unica outra coisa que o botao fazia) agora e buscado
    // sozinho pelo useEffect abaixo e mostrado na caixa do GPS.

    // GPS_UNICO_V1: endereco reverso automatico, com debounce.
    //
    // O watchPosition dispara a cada metro que ele anda; sem debounce isso seria uma
    // request de geocoding por passo. 1200ms e o tempo de ele parar de andar.
    // A coordenada e arredondada em 5 casas (~1 m) pra micro-tremida de GPS parado
    // nao refazer a busca.
    const geoReqRef = useRef(0);
    useEffect(() => {
      if (!gps) return;
      const chave = `${gps.lat.toFixed(5)},${gps.lng.toFixed(5)}`;
      const req = ++geoReqRef.current;
      const t = setTimeout(async () => {
        setGeoLoading(true);
        try {
          const res = await fetchAuth(`${API_URL}/api/geocode/reverse?lat=${gps.lat}&lng=${gps.lng}`);
          const data = await res.json();
          // Descarta resposta de posicao velha: ele pode ter andado enquanto a
          // request ia. Sem isso, o endereco mostrado pisca entre dois lugares.
          if (req !== geoReqRef.current) return;
          setEnderecoGeo(res.ok && data.endereco ? data.endereco : '');
        } catch {
          if (req === geoReqRef.current) setEnderecoGeo('');
        } finally {
          if (req === geoReqRef.current) setGeoLoading(false);
        }
      }, 1200);
      return () => clearTimeout(t);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gps && gps.lat.toFixed(5), gps && gps.lng.toFixed(5)]);

    // 2026-04 v3: helpers pra CNPJ digitado manualmente
    function formatarCNPJ(v) {
      // 12.345.678/0001-90
      const d = String(v || '').replace(/\D/g, '').slice(0, 14);
      return d
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }

    function validarCNPJ(cnpj) {
      const c = String(cnpj || '').replace(/\D/g, '');
      if (c.length !== 14) return false;
      if (/^(\d)\1+$/.test(c)) return false;
      const calc = (base, pesos) => {
        let s = 0;
        for (let i = 0; i < pesos.length; i++) s += parseInt(base[i], 10) * pesos[i];
        const r = s % 11;
        return r < 2 ? 0 : 11 - r;
      };
      const p1 = [5,4,3,2,9,8,7,6,5,4,3,2];
      const p2 = [6,5,4,3,2,9,8,7,6,5,4,3,2];
      return calc(c, p1) === parseInt(c[12], 10) && calc(c, p2) === parseInt(c[13], 10);
    }

    const handleSubmit = async () => {
      // GPS_UNICO_V1: localizacao_raw saiu dos obrigatorios — nao existe mais campo
      // pra ele preencher. A coordenada e o GPS ao vivo, lido aqui embaixo.
      if (!form.os_numero.trim() || !form.ponto) {
        showToast('Preencha todos os campos obrigatórios.', 'error');
        return;
      }
      if (!gps) {
        // GPS_FRESCO_V1_SUBMIT
        showToast('GPS obrigatório! Ative a localização e toque em "Atualizar GPS".', 'error');
        return;
      }

      // ══════════════════════════════════════════════════════════════════════
      // GPS_FRESCO_V1_SUBMIT — lê a posição AGORA, não a que sobrou do watch.
      //
      // O bug que isto conserta:
      //
      //   O motoboy abre a tela de ajuste ainda na moto, a 2km da loja. O
      //   watchPosition pega a posição dali. Ele guarda o celular no bolso — e
      //   o navegador, em background, PARA de chamar o callback. Ele chega na
      //   loja, tira o celular, digita o CNPJ, toca em Enviar.
      //
      //   O `gps` do state ainda é de onde ele abriu a tela.
      //
      //   O backend mede 2km até o CNPJ e responde "Você não está no endereço
      //   desse CNPJ". Ele ESTÁ. Quem não está é a coordenada.
      //
      // O comentário do GPS_ACC_BOM assume que "o watchPosition resolve sozinho:
      // ele anda até a porta e a precisão melhora na cara dele". Isso é verdade
      // ENQUANTO a aba está visível. Não é o caso de quem anda com o celular no
      // bolso, que é o caso do motoboy.
      //
      // Estratégia, e ela é de propósito conservadora:
      //
      //   - watch fresco (< 15s)  -> usa. O watchPosition está vivo, é a melhor
      //                              leitura que existe, e não custa nada.
      //   - watch velho ou sem ts -> força getCurrentPosition({maximumAge: 0}).
      //                              maximumAge:0 é o ponto todo: proíbe o
      //                              navegador de devolver cache.
      //
      // Só paga o custo da leitura nova no caso quebrado. Quem está com a tela
      // aberta e o GPS rodando não sente diferença nenhuma.
      //
      // Se a leitura nova falhar, ELE NÃO ENVIA. Mandar a coordenada velha
      // calado é o que produziu o problema: ele leva a culpa por um dado que a
      // gente sabia estar podre. Melhor dizer "não consegui" — isso ele resolve
      // andando pra fora da cobertura. "Você não está no endereço" ele não
      // resolve, porque ele já está.
      // ══════════════════════════════════════════════════════════════════════
      const GPS_IDADE_MAX_MS = 15000;
      let gpsEnvio = gps;
      const idade = gps.ts ? (Date.now() - gps.ts) : Infinity;

      if (idade > GPS_IDADE_MAX_MS) {
        setDetalhe('Confirmando sua localização...');
        try {
          const fresco = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              resolve,
              reject,
              { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            );
          });
          gpsEnvio = {
            lat: fresco.coords.latitude,
            lng: fresco.coords.longitude,
            accuracy: fresco.coords.accuracy,
            ts: fresco.timestamp || Date.now(),
          };
          // Atualiza a tela também: o mapa e a caixa de precisão passam a mostrar
          // o mesmo ponto que foi enviado. Sem isto ele veria uma coordenada e o
          // admin veria outra — e a primeira coisa que o suporte faria era
          // desconfiar do motoboy.
          setGps(gpsEnvio);
        } catch (errGps) {
          setDetalhe('');
          const motivo = errGps && errGps.code === 1
            ? 'Permissão de localização negada.'
            : errGps && errGps.code === 3
              ? 'O GPS demorou demais pra responder.'
              : 'Não foi possível ler o GPS agora.';
          showToast(`${motivo} Sua localização estava desatualizada e não dá pra enviar assim. Saia de baixo da cobertura e tente de novo.`, 'error');
          return;
        }
      }
      // FRONT_ACCURACY_V1 — a trava dura saiu daqui. Ela era esta:
      //
      //     if (gps.accuracy && gps.accuracy > GPS_ACC_LIMITE) {
      //       showToast('Sua localização está imprecisa...'); return;
      //     }
      //
      // Bloquear no celular foi ideia ruim, por dois motivos:
      //
      //   1. NAO DEIXA RASTRO. O motoboy toca em Enviar, nao acontece nada, ele
      //      toca de novo, desiste e liga pro suporte — e o painel do admin fica
      //      limpo. Bloqueio que ninguem consegue contar nao existe pra quem
      //      precisa decidir se o numero esta certo.
      //   2. Ajustar os 60m exigia deploy da Vercel.
      //
      // Agora a accuracy vai no payload e QUEM DECIDE E O BACKEND
      // (GPS_ACC_BACKEND_V1, no cruzar-validacoes.js) — no mesmo lugar onde mora o
      // DIST_LIBERA_METROS, e no mesmo caminho que grava a tentativa com
      // fase_falha='gps_impreciso'.
      //
      // O aviso visual continua: a caixa do GPS fica vermelha e diz o que fazer
      // ANTES dele tocar em Enviar. A diferenca e que agora e conselho, nao porta
      // trancada — e se ele enviar assim mesmo, vira linha no banco.
      // 2026-04 v5: única forma de identificar é CNPJ digitado (foto da NF removida).
      const cnpjLimpo = String(cnpjManual).replace(/\D/g, '');
      if (cnpjLimpo.length === 0) {
        // CNPJ_DESTINATARIO_V1: "cliente" era ambiguo — a autopecas TAMBEM e
        // cliente (da Tutts). Aqui e sempre quem RECEBE.
        showToast('Digite o CNPJ de quem recebe a entrega!', 'error');
        return;
      }
      if (!validarCNPJ(cnpjLimpo)) {
        showToast('CNPJ inválido. Confira os dígitos.', 'error');
        return;
      }
      // AGENTE_BCE_V1 (submit): a trava de foto obrigatoria saiu. OS + ponto +
      // endereco + GPS + CNPJ continuam obrigatorios — sao esses que a validacao le.

      setLoading(true);
      setFase('validando');
      setDetalhe('');
      setValidacaoReceita(null);
      // BARRADO_CNPJ_V1: limpa so o barradoInfo.
      setBarradoInfo(null);

      try {
        const res = await fetchAuth(`${API_URL}/agent/corrigir-endereco`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            os_numero:       form.os_numero.trim(),
            ponto:           parseInt(form.ponto, 10),
            // GPS_UNICO_V1 — UMA fonte. localizacao_raw e motoboy_lat/lng saem do
            // MESMO gps, lido no MESMO instante.
            //
            // Antes o localizacao_raw vinha congelado do clique no botao e o
            // motoboy_lat vinha ao vivo daqui: o backend validava um e o RPA
            // gravava o outro. O formato "lat, lng" continua igual porque o
            // normalizeLocation() do agente ja sabe ler isso — nada muda do outro
            // lado.
            // GPS_FRESCO_V1_PAYLOAD — `gpsEnvio`, não `gps`.
            //
            // gpsEnvio é o gps do watch quando ele está fresco, ou a leitura nova
            // forçada quando ele estava velho. Se este payload continuasse lendo
            // `gps`, a leitura nova lá em cima seria só enfeite: eu buscaria a
            // posição certa e mandaria a errada.
            localizacao_raw: `${gpsEnvio.lat}, ${gpsEnvio.lng}`,
            motoboy_lat:     gpsEnvio.lat,
            motoboy_lng:     gpsEnvio.lng,
            // FRONT_ACCURACY_V1: o raio de erro que o aparelho reporta, do MESMO
            // instante das coordenadas acima. O backend usa pra saber se a
            // distancia pode decidir, e grava em toda tentativa (coluna
            // gps_accuracy) — inclusive nas que passam. E o dado que responde se a
            // massa barrada e GPS ruim ou motoboy longe.
            //
            // Celular velho que nao reporta accuracy manda undefined, e o backend
            // libera na distancia pura: nao se pune quem nao tem o que informar.
            // GPS_FRESCO_V1_ACC: do mesmo instante das coordenadas acima — que
            // agora é o instante do ENVIO, não o de quando a tela abriu.
            motoboy_accuracy: gpsEnvio.accuracy,
            // AGENTE_BCE_V1 (payload): so cnpj_manual. foto_nf saiu em 2026-04 e
            // foto_fachada saiu agora — o backend ignora e nao grava nenhuma das
            // duas. Mandar base64 de 5MB pra ser descartado no servidor e queimar
            // o plano de dados do motoboy por nada.
            cnpj_manual:     cnpjLimpo,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          const msg = data.erros ? data.erros.join(' ') : (data.erro || 'Erro ao enviar.');
          if (res.status === 409) {
            setFase('os_duplicada');
            setDetalhe(msg);
            setLoading(false);
            return;
          }
          // AGENTE_BCE_V1 (nf) — o handler de nf_rejeitada saiu.
          //
          // Ele ja era letra morta: desde que o fluxo passou a ser CNPJ digitado, o
          // backend fixa nf_rejeitada: false. Mas ele apontava pra fase
          // 'foto_rejeitada', que agora NAO EXISTE mais — se um dia caisse ali, o
          // motoboy veria a tela em branco. Melhor tirar do que deixar armado.
          // AGENTE_BCE_V1 (handler) — barramento tem tela propria.
          //
          // Antes os dois casos caiam em 'foto_rejeitada' — o ecra de "Foto
          // Invalida", com icone de camera. O motoboy com CNPJ errado tirava a foto
          // de novo, era barrado de novo, e ligava pro suporte. O backend ja mandava
          // os dados, o front e que jogava fora.
          //
          // data.foto_rejeitada nao existe mais: o backend nao olha foto.
          if (data.validacao_rejeitada) {
            // CNPJ_INEXISTENTE_V1: guarda tambem o codigo_bloqueio. O fallback pro
            // `indisponivel` cobre o backend antigo (deploy em ordem diferente).
            setBarradoInfo({
              indisponivel: !!data.indisponivel,
              codigo: data.codigo_bloqueio || (data.indisponivel ? 'indisponivel' : 'presenca'),
              cnpj: data.cnpj || null,
              razao_social: data.razao_social || null,
            });
            setFase('barrado');
            setDetalhe(data.motivo_rejeicao || 'Não foi possível validar este endereço.');
            setLoading(false);
            return;
          }
          setFase('erro'); setDetalhe(msg); setLoading(false);
          return;
        }

        // 2026-04: salva dados da Receita Federal pra mostrar pro motoboy
        if (data.cruzamento || data.receita) {
          setValidacaoReceita({
            mensagem: data.cruzamento?.mensagem || null,
            receita: data.receita || null,
            score_max: data.cruzamento?.score_max || 0,
            salvo_no_banco: data.cruzamento?.salvo_no_banco || false,
          });
        }

        // Verificar resultado da validação de localização
        const valLoc = data.validacao_localizacao;
        if (valLoc && valLoc.alerta) {
          // Localização não validada — mostrar aviso e prosseguir
          setFase('aviso_localizacao');
          setDetalhe(JSON.stringify(valLoc));
          setSolId(data.id);
          setLoading(false);
          return;
        }

        // Validado OK ou sem validação — direto pro polling
        setSolId(data.id);
        // Reset do progresso: nova corrida começa do zero visualmente.
        setProgresso(5);
        setEtapa('iniciando');
        setFase('polling');
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
      // BARRADO_CNPJ_V1 (reset): so o barradoInfo — o state checks saiu.
      setBarradoInfo(null);
      setCnpjManual('');
      setValidacaoReceita(null);
      setPontoCoords(null);
      setEnderecoGeo('');
      capturarGPS();
    };

    // ── Render: feedback ──────────────────────────────────────────────────

    // Fase: validando localização
    if (fase === 'validando') return h('div', {
      className: 'fixed inset-0 z-50 flex flex-col items-center justify-center px-6',
      style: { background: 'linear-gradient(135deg, #0f0e1a 0%, #1a1035 50%, #0f0e1a 100%)' }
    },
      h('style', {}, '@keyframes agentScan{0%{top:10%}50%{top:80%}100%{top:10%}}@keyframes agentPulse{0%,100%{opacity:0.3}50%{opacity:1}}'),
      h('div', { style: { position: 'relative', width: '80px', height: '80px', marginBottom: '24px' } },
        h('div', { style: { position: 'absolute', inset: 0, border: '2px solid #7C3AED', borderRadius: '50%', opacity: 0.2 } }),
        h('div', { style: { position: 'absolute', inset: '10px', border: '2px solid #7C3AED', borderRadius: '50%', opacity: 0.4 } }),
        h('div', { style: { position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#7C3AED', animation: 'spin 1.5s linear infinite' } }),
        h('div', { style: { position: 'absolute', width: '100%', height: '2px', background: 'linear-gradient(90deg, transparent, #7C3AED, transparent)', opacity: 0.6, animation: 'agentScan 2s linear infinite' } }),
        h('div', { style: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '24px' } }, '📍')
      ),
      h('p', { style: { fontSize: '15px', fontWeight: 600, color: '#e2e0f0', textAlign: 'center', maxWidth: '300px', lineHeight: 1.5 } },
        // GPS_UNICO_V1: o texto falava da "foto enviada" — que nao existe desde o
        // AGENTE_BCE_V1. Ficou dois deploys em producao descrevendo um fluxo morto.
        'Estamos conferindo o CNPJ na Receita Federal e comparando com a sua localização.'
      ),
      h('div', { style: { display: 'flex', gap: '6px', marginTop: '20px' } },
        h('div', { style: { width: '8px', height: '8px', borderRadius: '50%', background: '#7C3AED', animation: 'agentPulse 1s 0s infinite' } }),
        h('div', { style: { width: '8px', height: '8px', borderRadius: '50%', background: '#7C3AED', animation: 'agentPulse 1s 0.2s infinite' } }),
        h('div', { style: { width: '8px', height: '8px', borderRadius: '50%', background: '#7C3AED', animation: 'agentPulse 1s 0.4s infinite' } })
      )
    );

    // Fase: OS/ponto já solicitado
    if (fase === 'os_duplicada') return h('div', { className: 'flex flex-col items-center justify-center py-10 px-6 text-center' },
      h('div', { className: 'w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mb-6' },
        h('span', { className: 'text-4xl' }, '⚠️')
      ),
      h('h2', { className: 'text-xl font-bold text-orange-700 mb-4' }, 'Solicitação já existente'),
      h('div', { className: 'bg-orange-50 border border-orange-300 rounded-xl p-5 mb-6 max-w-md' },
        h('p', { className: 'text-sm text-orange-800 leading-relaxed' }, detalheErro)
      ),
      h('button', {
        onClick: resetar,
        className: 'px-8 py-3 rounded-xl font-semibold text-white',
        style: { background: 'linear-gradient(135deg, #550776, #7c3aed)' },
      }, '↩ Voltar')
    );

    // Fase: endereço já corrigido anteriormente
    if (fase === 'ja_corrigido') return h('div', { className: 'flex flex-col items-center justify-center py-10 px-6 text-center' },
      h('div', { className: 'w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mb-6' },
        h('span', { className: 'text-4xl' }, '🔒')
      ),
      h('h2', { className: 'text-xl font-bold text-orange-700 mb-4' }, 'Endereço já alterado'),
      h('div', { className: 'bg-orange-50 border border-orange-300 rounded-xl p-5 mb-6 max-w-md' },
        h('p', { className: 'text-sm text-orange-800 leading-relaxed font-semibold' },
          'Esse endereço já havia sido alterado anteriormente no sistema.'
        ),
        h('p', { className: 'text-sm text-orange-800 leading-relaxed mt-3' },
          'Por favor, refaça a solicitação diretamente com o suporte Tutts.'
        )
      ),
      h('button', {
        onClick: resetar,
        className: 'px-8 py-3 rounded-xl font-semibold text-white',
        style: { background: 'linear-gradient(135deg, #550776, #7c3aed)' },
      }, '↩ Voltar')
    );

    // Fase: foto rejeitada pela IA
    // CNPJ_INEXISTENTE_V1 (tela) — barramento, 3 variantes.
    //
    // Antes eram 2, decididas por um booleano (indisponivel). Faltava a terceira:
    // CNPJ que nao existe na Receita caia na cara AMBAR, lendo "não é erro seu,
    // tente de novo em um minuto" — mentira que ele repetiria pra sempre, porque o
    // CNPJ ia continuar nao existindo. Agora quem manda e o codigo_bloqueio.
    //
    // O front NAO fareja o texto do motivo pra decidir cara: motivo e copy, muda
    // quando alguem melhora a frase, e a tela mudaria junto sem ninguem perceber.
    // Contrato e o codigo.
    //
    // As classes do Tailwind ficam ESCRITAS INTEIRAS em cada variante. Nada de
    // `bg-${cor}-100`: o CDN varre o codigo procurando nome de classe literal —
    // string montada em runtime nao gera CSS e a tela sai sem cor nenhuma.
    //
    // O que continua fora daqui: distancia, score e o endereco da Receita. O
    // endereco e o gabarito da validacao; entregar na tela de erro e ensinar a
    // fraudar. O painel admin ve tudo.
    if (fase === 'barrado') {
      const info = barradoInfo || {};
      const codigo = info.codigo || (info.indisponivel ? 'indisponivel' : 'presenca');

      const VARIANTES = {
        presenca: {
          icone: '🛑',
          bolha: 'bg-red-100',
          titulo: 'Você não está no endereço desse CNPJ',
          corTitulo: 'text-red-700',
          borda: 'border-red-200',
          caixa: 'bg-red-50 border border-red-200',
          corTexto: 'text-red-800',
          instrucao: 'Se for esse mesmo o CNPJ, vá até a porta do estabelecimento e envie sua localização de novo.',
          botao: '✏️  Corrigir o CNPJ',
        },
        cnpj_nao_encontrado: {
          icone: '🔎',
          bolha: 'bg-red-100',
          titulo: 'Não achamos esse CNPJ',
          corTitulo: 'text-red-700',
          borda: 'border-red-200',
          caixa: 'bg-red-50 border border-red-200',
          corTexto: 'text-red-800',
          instrucao: 'Esse CNPJ não consta na Receita Federal. Confira os dígitos na nota fiscal — é fácil trocar um número.',
          botao: '✏️  Corrigir o CNPJ',
        },
        // FRONT_ACCURACY_V1 — 4a variante: o backend nao consegue decidir porque o
        // APARELHO nao sabe onde ele esta.
        //
        // Nao e vermelha: ele nao errou nada, e nao adianta ele "conferir o CNPJ".
        // Nao e a ambar do 'indisponivel' tambem — aquela e sobre a NOSSA infra
        // ("não é erro seu, tente de novo"), e repetir do mesmo lugar nao resolveria
        // isto aqui. Esta tem acao propria e ela FUNCIONA: andar. O watchPosition
        // atualiza sozinho, entao a precisao melhora enquanto ele caminha ate a
        // porta.
        //
        // O motivo vem do backend com o numero real (±96m) — mais convincente que
        // qualquer texto nosso: e o aparelho DELE admitindo o erro.
        gps_impreciso: {
          icone: '🛰️',
          bolha: 'bg-sky-100',
          titulo: 'Não conseguimos te localizar direito',
          corTitulo: 'text-sky-700',
          borda: 'border-sky-200',
          caixa: 'bg-sky-50 border border-sky-200',
          corTexto: 'text-sky-800',
          instrucao: null, // o backend manda a frase com a precisao medida
          botao: '↻  Tentar de novo',
        },
        indisponivel: {
          icone: '🔌',
          bolha: 'bg-amber-100',
          titulo: 'Não deu pra checar agora',
          corTitulo: 'text-amber-700',
          borda: 'border-amber-200',
          caixa: 'bg-amber-50 border border-amber-200',
          corTexto: 'text-amber-800',
          instrucao: null, // usa o texto que o backend mandou
          botao: '↻  Tentar de novo',
        },
      };
      const v = VARIANTES[codigo] || VARIANTES.presenca;

      const cnpjFmt = info.cnpj
        ? String(info.cnpj).replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
        : null;

      return h('div', { className: 'flex flex-col items-center py-8 px-5 text-center' },
        h('div', { className: `w-20 h-20 rounded-full flex items-center justify-center mb-5 ${v.bolha}` },
          h('span', { className: 'text-4xl' }, v.icone)),

        h('h2', { className: `text-xl font-bold mb-1 leading-tight ${v.corTitulo}` }, v.titulo),
        h('p', { className: 'text-xs text-gray-500 mb-5' },
          `OS ${form.os_numero} · Ponto ${form.ponto}`),

        // O CNPJ que ele digitou — o herói da tela. Na variante cnpj_nao_encontrado
        // ele é literalmente a resposta: o número está ali, errado, pra ele ver.
        cnpjFmt && h('div', {
          className: `w-full max-w-md bg-white border-2 rounded-xl p-4 mb-4 ${v.borda}`,
        },
          h('p', { className: 'text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-1' }, 'CNPJ que você digitou'),
          h('p', { className: 'text-lg font-bold text-gray-900 font-mono tracking-tight' }, cnpjFmt),
          info.razao_social && h('p', { className: 'text-[13px] text-gray-600 mt-1 leading-snug' }, info.razao_social),
        ),

        h('div', { className: `w-full max-w-md rounded-xl p-4 mb-5 text-left ${v.caixa}` },
          h('p', { className: `text-sm leading-relaxed ${v.corTexto}` }, v.instrucao || detalheErro),
        ),

        h('button', {
          onClick: function() { setFase('idle'); setBarradoInfo(null); },
          className: 'w-full max-w-md py-3 rounded-xl font-semibold text-white mb-3',
          style: { background: 'linear-gradient(135deg, #550776, #7c3aed)' },
        }, v.botao),

        h('a', {
          href: `https://wa.me/557189260372?text=${encodeURIComponent(
            `Olá suporte! A correção da OS ${form.os_numero} (ponto ${form.ponto}) foi barrada. Como proceder?`
          )}`,
          target: '_blank', rel: 'noopener noreferrer',
          className: 'w-full max-w-md py-3 rounded-xl font-semibold text-white inline-flex items-center justify-center gap-2',
          style: { background: 'linear-gradient(135deg, #16a34a, #22c55e)' },
        }, '💬  Falar com o suporte'),
      );
    }

    // Fase: cliente bloqueado para ajuste — 2026-07
    if (fase === 'bloqueado_cliente') {
      const hh = new Date().getHours();
      const saud = hh < 12 ? 'Bom dia' : (hh < 18 ? 'Boa tarde' : 'Boa noite');
      const loja = (bloqueioInfo && bloqueioInfo.loja) || '';
      const numero = String((bloqueioInfo && bloqueioInfo.numero) || '557189260372').replace(/\D/g, '');
      const texto = `${saud} suporte! Estou com a OS ${form.os_numero} da loja ${loja} para realizar correção do ponto ${form.ponto}, como proceder?`;
      const waLink = `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
      return h('div', { className: 'flex flex-col items-center justify-center py-10 px-6 text-center' },
        h('div', { className: 'w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6' },
          h('span', { className: 'text-4xl' }, '🚫')
        ),
        h('h2', { className: 'text-xl font-bold text-red-700 mb-4' }, 'Ajuste não permitido'),
        h('div', { className: 'bg-red-50 border border-red-300 rounded-xl p-5 mb-6 max-w-md' },
          h('p', { className: 'text-sm text-red-800 leading-relaxed font-semibold' }, 'As corridas desse cliente não sofrem ajustes na localização.'),
          h('p', { className: 'text-sm text-red-800 leading-relaxed mt-3' }, 'Você deve seguir sempre o endereço que está na nota.'),
          h('p', { className: 'text-sm text-red-800 leading-relaxed mt-3' }, 'Por favor, entre em contato com o suporte.')
        ),
        h('a', {
          href: waLink, target: '_blank', rel: 'noopener noreferrer',
          className: 'px-8 py-3 rounded-xl font-semibold text-white mb-3 inline-flex items-center gap-2',
          style: { background: 'linear-gradient(135deg, #16a34a, #22c55e)' },
        }, '💬 Falar com o suporte'),
        h('button', { onClick: resetar, className: 'px-8 py-2 rounded-xl font-semibold text-gray-500' }, '↩ Voltar')
      );
    }

    // Fase: aviso de localização não validada
    if (fase === 'aviso_localizacao') return h('div', {
      className: 'flex flex-col items-center justify-center py-10 px-6 text-center'
    },
      h('div', { className: 'w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mb-6' },
        h('span', { className: 'text-4xl' }, '⚠️')
      ),
      h('h2', { className: 'text-xl font-bold text-yellow-700 mb-4' }, 'Atenção'),
      h('div', { className: 'bg-yellow-50 border border-yellow-300 rounded-xl p-5 mb-6 max-w-md' },
        h('p', { className: 'text-sm text-yellow-800 leading-relaxed' },
          'A foto enviada e a localização não condizem com nenhum estabelecimento comercial identificado na região.'
        ),
        h('p', { className: 'text-sm text-yellow-800 leading-relaxed mt-3 font-semibold' },
          'Iremos avançar com seu ajuste. Mas posteriormente o suporte irá validar, e em caso de inconsistências, o endereço voltará ao original.'
        )
      ),
      h('button', {
        onClick: function() {
          setProgresso(5);
          setEtapa('iniciando');
          setFase('polling');
          setLoading(true);
          iniciarPolling(solicitacaoId);
        },
        className: 'px-8 py-3 rounded-xl font-semibold text-white',
        style: { background: 'linear-gradient(135deg, #550776, #7c3aed)' },
      }, '✅ Entendi, prosseguir')
    );

    if (fase === 'sucesso') return h('div', { className: 'flex flex-col items-center justify-center py-10 px-6 text-center' },
      // Animação de entrada: check cresce com spring e conteúdo desce com fade.
      // Mantida sutil pra não atrasar o motoboy — ele quer ver os valores rápido.
      h('style', null, `
        @keyframes successPop { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); } }
        @keyframes successSlide { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `),
      h('div', {
        className: 'w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6',
        style: { animation: 'successPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }
      },
        h('span', { className: 'text-4xl' }, '✅')
      ),
      h('div', { style: { animation: 'successSlide 0.4s ease-out 0.2s both', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' } },
      h('h2', { className: 'text-2xl font-bold text-green-700 mb-2' }, 'Endereço corrigido com sucesso!'),
      h('p', { className: 'text-gray-500 mb-4' }, `OS ${form.os_numero || ''} — Ponto ${form.ponto || ''}`),

      // 2026-04: Banner de confirmação Receita Federal
      validacaoReceita && validacaoReceita.mensagem && h('div', {
        className: 'w-full max-w-sm mb-4 rounded-xl p-4 ' +
          (validacaoReceita.receita?.ativa
            ? 'bg-blue-50 border-2 border-blue-300'
            : 'bg-yellow-50 border-2 border-yellow-300')
      },
        h('p', {
          className: 'text-sm font-bold mb-1 ' +
            (validacaoReceita.receita?.ativa ? 'text-blue-900' : 'text-yellow-900')
        }, validacaoReceita.mensagem),
        validacaoReceita.receita && h('div', { className: 'text-xs text-gray-700 space-y-0.5' },
          validacaoReceita.receita.razao_social && h('div', null,
            h('span', { className: 'font-semibold' }, 'Razão social: '),
            validacaoReceita.receita.razao_social
          ),
          validacaoReceita.receita.nome_fantasia && h('div', null,
            h('span', { className: 'font-semibold' }, 'Nome fantasia: '),
            validacaoReceita.receita.nome_fantasia
          ),
          validacaoReceita.receita.endereco && h('div', null,
            h('span', { className: 'font-semibold' }, 'Endereço Receita: '),
            validacaoReceita.receita.endereco
          ),
          h('div', { className: 'flex items-center gap-2 mt-1' },
            h('span', {
              className: 'inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ' +
                (validacaoReceita.receita.ativa ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800')
            }, validacaoReceita.receita.situacao),
            validacaoReceita.salvo_no_banco && h('span', {
              className: 'inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-200 text-purple-800'
            }, '💾 Salvo na base')
          )
        )
      ),

      // Antes x Depois
      valoresOS && (valoresOS.antes || valoresOS.depois) && h('div', { className: 'w-full max-w-sm mb-6' },
        valoresOS.antes && h('div', { className: 'bg-orange-50 border border-orange-200 rounded-xl p-4 mb-3' },
          h('p', { className: 'text-xs font-bold text-orange-600 mb-2' }, '📊 ANTES'),
          h('div', { className: 'flex justify-around' },
            valoresOS.antes.km && h('div', { className: 'text-center' },
              h('p', { className: 'text-lg font-bold text-orange-700' }, `${valoresOS.antes.km} km`),
              h('p', { className: 'text-[10px] text-orange-500' }, 'Distância')
            ),
            valoresOS.antes.valor_profissional && h('div', { className: 'text-center' },
              h('p', { className: 'text-lg font-bold text-orange-700' }, `R$ ${valoresOS.antes.valor_profissional}`),
              h('p', { className: 'text-[10px] text-orange-500' }, 'Valor profissional')
            )
          )
        ),
        valoresOS.depois && h('div', { className: 'bg-green-50 border border-green-200 rounded-xl p-4' },
          h('p', { className: 'text-xs font-bold text-green-600 mb-2' }, '📊 DEPOIS'),
          h('div', { className: 'flex justify-around' },
            valoresOS.depois.km && h('div', { className: 'text-center' },
              h('p', { className: 'text-lg font-bold text-green-700' }, `${valoresOS.depois.km} km`),
              h('p', { className: 'text-[10px] text-green-500' }, 'Distância')
            ),
            valoresOS.depois.valor_profissional && h('div', { className: 'text-center' },
              h('p', { className: 'text-lg font-bold text-green-700' }, `R$ ${valoresOS.depois.valor_profissional}`),
              h('p', { className: 'text-[10px] text-green-500' }, 'Valor profissional')
            )
          )
        )
      ),
      h('button', {
        onClick: resetar,
        className: 'px-8 py-3 rounded-xl font-semibold text-white',
        style: { background: 'linear-gradient(135deg, #550776, #7c3aed)' },
      }, '+ Nova Correção')
      ) // fecha wrapper successSlide
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
    if (fase === 'polling') {
      // Mapa de etapa → frase pro motoboy. Mantém sincronizado com os marcos do
      // playwright-agent.js (reportar) e com o marco 'iniciando' do agent-worker.
      const LABELS = {
        iniciando:    'Preparando conexão…',
        login:        'Entrando no sistema…',
        localizando:  'Encontrando sua corrida…',
        codificando:  'Codificando o novo endereço…',
        confirmando:  'Confirmando a localização…',
        recalculando: 'Recalculando o frete…',
        finalizando:  'Pronto!',
      };
      const labelAtual = LABELS[etapa] || LABELS.iniciando;
      const pctRound = Math.round(progresso);

      return h('div', {
        className: 'fixed inset-0 z-50 flex flex-col items-center justify-center px-6 overflow-hidden',
        style: { background: 'linear-gradient(135deg, #550776 0%, #7c3aed 50%, #550776 100%)', backgroundSize: '200% 200%', animation: 'gradientShift 4s ease infinite', overflowX: 'hidden', overflowY: 'auto', width: '100vw', maxWidth: '100%' }
      },
        h('style', null, `
          @keyframes gradientShift { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
          @keyframes pinDrop { 0% { transform: translateY(-55px); opacity: 0; } 15% { opacity: 1; } 40% { transform: translateY(0); } 50% { transform: translateY(-10px); } 60% { transform: translateY(0); } 70% { transform: translateY(-4px); } 80%, 100% { transform: translateY(0); } }
          @keyframes pinRing { 0% { transform: scale(0.6); opacity: 0.8; } 100% { transform: scale(2.2); opacity: 0; } }
          @keyframes dotPulse { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1.2); } }
          @keyframes labelFade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        `),
        // ── Mapa estilizado + pin caindo ─────────────────────────────
        h('div', { style: { position: 'relative', width: '200px', height: '200px', marginBottom: '28px' } },
          h('svg', { width: '200', height: '200', viewBox: '0 0 200 200' },
            // Fundo do mapa
            h('rect', { x: '10', y: '20', width: '180', height: '160', rx: '12', fill: 'rgba(255,255,255,0.08)' }),
            // Ruas horizontais
            h('line', { x1: '10', y1: '80',  x2: '190', y2: '80',  stroke: '#fff', strokeWidth: '2', opacity: '0.25' }),
            h('line', { x1: '10', y1: '130', x2: '190', y2: '130', stroke: '#fff', strokeWidth: '2', opacity: '0.25' }),
            // Ruas verticais
            h('line', { x1: '70',  y1: '20', x2: '70',  y2: '180', stroke: '#fff', strokeWidth: '2', opacity: '0.25' }),
            h('line', { x1: '130', y1: '20', x2: '130', y2: '180', stroke: '#fff', strokeWidth: '2', opacity: '0.25' }),
            // Quarteirões
            h('rect', { x: '20',  y: '30',  width: '40', height: '40', rx: '3', fill: '#fff', opacity: '0.08' }),
            h('rect', { x: '80',  y: '30',  width: '40', height: '40', rx: '3', fill: '#fff', opacity: '0.08' }),
            h('rect', { x: '140', y: '30',  width: '40', height: '40', rx: '3', fill: '#fff', opacity: '0.08' }),
            h('rect', { x: '20',  y: '90',  width: '40', height: '30', rx: '3', fill: '#fff', opacity: '0.08' }),
            h('rect', { x: '140', y: '90',  width: '40', height: '30', rx: '3', fill: '#fff', opacity: '0.08' }),
            h('rect', { x: '20',  y: '140', width: '40', height: '30', rx: '3', fill: '#fff', opacity: '0.08' }),
            h('rect', { x: '140', y: '140', width: '40', height: '30', rx: '3', fill: '#fff', opacity: '0.08' }),
            // Ondas de pulso (sai de baixo do pin)
            h('circle', { cx: '100', cy: '110', r: '16', fill: 'none', stroke: '#fbbf24', strokeWidth: '2.5', opacity: '0', style: { transformOrigin: '100px 110px', animation: 'pinRing 2.2s infinite' } }),
            h('circle', { cx: '100', cy: '110', r: '16', fill: 'none', stroke: '#fbbf24', strokeWidth: '2.5', opacity: '0', style: { transformOrigin: '100px 110px', animation: 'pinRing 2.2s 1.1s infinite' } }),
            // Pin caindo e quicando
            h('g', { style: { animation: 'pinDrop 3s ease-out infinite', transformOrigin: '100px 110px' } },
              h('path', { d: 'M 100 75 C 84 75 84 96 100 120 C 116 96 116 75 100 75 Z', fill: '#fbbf24' }),
              h('circle', { cx: '100', cy: '92', r: '6', fill: '#550776' })
            )
          )
        ),
        // ── Título dinâmico (muda conforme etapa) ────────────────────
        // key={etapa} força re-mount a cada mudança, acionando a animação de entrada.
        h('h2', {
          key: etapa,
          className: 'text-xl font-bold text-white mb-2 text-center px-4',
          style: { textShadow: '0 2px 8px rgba(0,0,0,0.3)', animation: 'labelFade 0.4s ease-out', minHeight: '28px' }
        }, labelAtual),
        // ── Subtexto fixo ────────────────────────────────────────────
        h('p', { className: 'text-xs text-purple-200 text-center mb-6 max-w-xs' },
          'Em instantes você conseguirá finalizar a corrida.'
        ),
        // ── Barra de progresso REAL com % ────────────────────────────
        h('div', { className: 'w-72 max-w-full' },
          h('div', { className: 'flex justify-between items-center mb-2' },
            h('span', { className: 'text-[11px] font-semibold text-purple-100 uppercase tracking-wide' }, 'Progresso'),
            h('span', { className: 'text-sm font-bold text-white', style: { fontVariantNumeric: 'tabular-nums' } }, `${pctRound}%`)
          ),
          h('div', { className: 'w-full h-2.5 rounded-full overflow-hidden', style: { background: 'rgba(255,255,255,0.15)' } },
            h('div', {
              style: {
                height: '100%',
                width: `${pctRound}%`,
                borderRadius: '9999px',
                background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
                // Transição suaviza o salto entre polls (a cada 5s o progresso pode pular).
                transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }
            })
          )
        ),
        // ── 3 bolinhas pulsando ──────────────────────────────────────
        h('div', { className: 'flex gap-2 mt-7' },
          h('div', { className: 'w-2 h-2 rounded-full bg-white', style: { animation: 'dotPulse 1.4s ease-in-out infinite' } }),
          h('div', { className: 'w-2 h-2 rounded-full bg-white', style: { animation: 'dotPulse 1.4s ease-in-out 0.2s infinite' } }),
          h('div', { className: 'w-2 h-2 rounded-full bg-white', style: { animation: 'dotPulse 1.4s ease-in-out 0.4s infinite' } })
        ),
        // ── OS + Ponto ───────────────────────────────────────────────
        h('div', { className: 'mt-8 px-4 py-2 rounded-full text-xs font-semibold text-purple-200', style: { background: 'rgba(255,255,255,0.1)' } },
          `OS ${form.os_numero || '—'} • Ponto ${form.ponto || '—'}`
        )
      );
    }

    // ── Render: formulário ────────────────────────────────────────────────
    const disabled = loading;
    // GPS_UNICO_V1: precisao do GPS em 3 faixas. Como o watchPosition atualiza
    // sozinho, isso muda de cor na cara dele enquanto anda.
    const gpsAcc      = gps && typeof gps.accuracy === 'number' ? Math.round(gps.accuracy) : null;
    const gpsRuim     = gpsAcc !== null && gpsAcc > GPS_ACC_LIMITE;
    const gpsMedio    = gpsAcc !== null && gpsAcc > GPS_ACC_BOM && !gpsRuim;
    // FRONT_ACCURACY_V1: gpsRuim saiu da condicao. Ele ainda pinta a caixa de
    // vermelho e mostra a instrucao — mas nao tranca mais o botao. Sem GPS
    // NENHUM continua travando: sem coordenada nao ha o que enviar.
    const podeEnviar  = !!gps && !disabled;

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
              /* AGENTE_BCE_V1 (aviso) */
              'É importante informar o número da OS de forma correta, a indicação de qual ponto ajustar e o CNPJ que aparece na nota. Envie a localização de dentro do estabelecimento.'
            ),
            h('p', { className: 'text-sm text-red-700 font-semibold mt-1' },
              'Caso não siga os padrões, terá a corrida invalidada pelo sistema.'
            )
          )
        )
      ),

      // Card do formulário
      h('div', { className: 'bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-5' },

        // ── GPS ───────────────────────────────────────────────────────────
        // GPS_UNICO_V1 — esta caixa deixou de ser enfeite e virou O campo.
        //
        // Ela mostra as tres coisas que decidem a correcao, ao vivo:
        //   1. a coordenada que VAI SER ENVIADA (nao tem outra)
        //   2. a precisao, em cor — porque a regra do backend e distancia, e um
        //      GPS de +-96 m nao consegue responder uma pergunta de 100 m
        //   3. o endereco da rua, buscado sozinho — pra ele CONFERIR que o
        //      aparelho concorda com onde ele esta, antes de enviar
        //
        // O terceiro item e o que o botao "Enviar minha localização" fazia de util.
        // Continua existindo; o passo manual e que sumiu.
        h('div', {
          className: `p-3 rounded-xl border ${
            !gps ? (gpsErro ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200')
              : gpsRuim ? 'bg-red-50 border-red-200'
              : gpsMedio ? 'bg-amber-50 border-amber-200'
              : 'bg-green-50 border-green-200'}`,
        },
          h('div', { className: 'flex items-start justify-between gap-2' },
            h('div', { className: 'flex items-start gap-2 min-w-0' },
              h('span', { className: 'mt-0.5' }, gps ? (gpsRuim ? '📡' : '📍') : gpsLoading ? '⏳' : '⚠️'),
              h('div', { className: 'min-w-0' },
                h('p', {
                  className: `text-sm font-semibold ${
                    !gps ? (gpsErro ? 'text-red-700' : 'text-blue-700')
                      : gpsRuim ? 'text-red-700' : gpsMedio ? 'text-amber-700' : 'text-green-700'}`,
                },
                  gpsLoading && !gps ? 'Obtendo localização...' :
                  gps ? ('GPS ao vivo' + (gpsAcc !== null ? ` (±${gpsAcc}m)` : '')) :
                  'GPS não disponível'
                ),
                gps && h('p', {
                  className: `text-xs font-mono ${gpsRuim ? 'text-red-600' : gpsMedio ? 'text-amber-700' : 'text-green-600'}`,
                }, `${gps.lat.toFixed(6)}, ${gps.lng.toFixed(6)}`),
                // O endereco da rua: é assim que ele confere que o aparelho não
                // está mentindo, sem a gente mostrar nada da Receita.
                gps && enderecoGeo && h('p', { className: 'text-xs text-gray-600 mt-0.5 truncate' }, `📍 ${enderecoGeo}`),
                gps && !enderecoGeo && geoLoading && h('p', { className: 'text-xs text-gray-400 mt-0.5' }, 'buscando endereço...'),
                gpsErro && h('p', { className: 'text-xs text-red-600' }, gpsErro)
              )
            ),
            h('button', {
              onClick: capturarGPS,
              disabled: gpsLoading,
              className: 'text-xs px-3 py-1.5 rounded-lg font-semibold text-white transition hover:opacity-80 flex-shrink-0',
              style: { background: gps && !gpsRuim ? '#16a34a' : '#2563eb' },
            }, gpsLoading ? '...' : '🔄 Atualizar')
          ),
          // A instrucao só aparece quando ele PODE fazer algo com ela.
          //
          // FRONT_ACCURACY_V1: o texto mudou de tom junto com a trava. Antes ele era
          // a explicacao de uma porta trancada ("precisão baixa demais"); agora e um
          // conselho antes do envio — ele PODE enviar assim, e se enviar, o backend
          // devolve a tela 🛰️ e a tentativa fica gravada com fase gps_impreciso.
          gpsRuim && h('p', { className: 'text-xs text-red-700 mt-2 leading-relaxed border-t border-red-200 pt-2' },
            'Seu GPS está muito impreciso. Se enviar assim, não vamos conseguir confirmar que você está na loja. Chegue perto da porta ou saia de baixo da cobertura — isso melhora sozinho.'),
          gpsMedio && h('p', { className: 'text-xs text-amber-700 mt-2 leading-relaxed border-t border-amber-200 pt-2' },
            'Dá pra enviar, mas se der erro de localização, chegue mais perto da porta.')
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

        // GPS_UNICO_V1 — o bloco "Localização do ponto *" saiu inteiro: o label, a
        // instrucao "clique no botao abaixo", o botao verde e o card "Localização
        // enviada" com o Reenviar.
        //
        // Nao era um campo — era uma copia manual de um valor que a gente ja tinha.
        // E era a copia que abria o buraco (ver o comentario em enviarLocalizacao):
        // congelava um numero, e a validacao media outro.
        //
        // A coordenada agora aparece na caixa do GPS, la em cima, com o endereco da
        // rua do lado. Nao ha o que ele "enviar": ele ESTA no lugar, o aparelho sabe
        // disso, e o envio da correcao leva o valor daquele instante.
        //
        // O aviso de ir ate o local continua — mudou de lugar, nao de existencia:
        // esta no bloco vermelho do topo ("Envie a localização de dentro do
        // estabelecimento").

        // ── Identificação de quem RECEBE: CNPJ digitado ──────────
        // 2026-04 v5: foto da NF removida — motos não conseguiam tirar
        // legível mesmo com camera coaching. Agora é só CNPJ digitado.
        //
        // CNPJ_DESTINATARIO_V1 — a causa raiz de 58% das barradas estava AQUI, no
        // texto. Os dois rotulos antigos eram:
        //
        //     "🧾 CNPJ do cliente *"
        //     "Digite o CNPJ que aparece na NF — vamos consultar a Receita Federal"
        //
        // Numa nota fiscal, o CNPJ QUE APARECE e o do EMITENTE: topo, negrito,
        // cabecalho. O do destinatario fica embaixo, num quadro menor. Pedimos
        // literalmente o que ele digitou — o do despachante. E "cliente" e ambiguo:
        // a autopecas tambem e cliente (da Tutts).
        //
        // Como isso aparecia no banco: o CNPJ 42580092/0011-48 apareceu em 55
        // correcoes de OS diferentes, com media de 13,9 km; o 42580092/0069-64 em
        // outras 22. Mesma raiz — filiais da mesma empresa. Cliente de verdade
        // aparece em uma ou duas OS e some (o endereco fica corrigido). Quem repete
        // em dezenas e quem despacha. Teve caso de 2.548 km: matriz em SC, motoboy
        // em PE. Nao era fraude nem geocoder — era gente obedecendo a instrucao.
        //
        // Nenhuma regua de metros conserta isso: a 100m ou a 500m, o CNPJ do
        // despachante nunca vai bater com a loja onde ele esta. E se batesse seria
        // pior — validaria a coisa errada.
        //
        // O DESENHO nao e enfeite: "destinatario" e palavra de escritorio. O cara
        // esta com a nota na mao, no sol, com o cliente esperando. Ele nao le
        // paragrafo — ele COMPARA o que esta na tela com o que esta no papel. Um
        // quadro vermelho em cima e um verde embaixo resolvem em 1 segundo o que
        // duas linhas de texto nao resolvem em 10.
        //
        // SVG inline: sem Tabler, sem Lucide, sem Font Awesome — so Tailwind e SVG,
        // igual ao resto do sistema.
        h('div', null,
          h('label', { className: 'block text-sm font-semibold text-gray-700 mb-0.5' }, '🧾 CNPJ de quem RECEBE *'),
          h('p', { className: 'text-xs text-gray-500 mb-3' },
            'Na nota, procure o quadro ',
            h('strong', null, 'DESTINATÁRIO'),
            ' — não é o CNPJ do topo'),

          // Onde olhar na nota.
          h('div', { className: 'border border-gray-200 rounded-xl p-3 mb-3 bg-gray-50' },
            h('svg', {
              viewBox: '0 0 300 190',
              className: 'w-full',
              xmlns: 'http://www.w3.org/2000/svg',
              role: 'img',
              'aria-label': 'Desenho de uma nota fiscal: o CNPJ do emitente fica no topo e nao serve; o do destinatario fica no quadro de baixo e e esse que voce deve digitar.',
            },
              h('rect', { x: 4, y: 4, width: 292, height: 182, rx: 6, fill: '#fff', stroke: '#e5e7eb' }),

              // EMITENTE — o errado
              h('rect', { x: 14, y: 14, width: 272, height: 46, rx: 4, fill: '#fef2f2', stroke: '#fecaca' }),
              h('text', { x: 24, y: 30, fontSize: 8, fill: '#b91c1c', fontWeight: 'bold', fontFamily: 'sans-serif' }, 'EMITENTE — quem despachou'),
              h('rect', { x: 24, y: 36, width: 120, height: 6, rx: 2, fill: '#fca5a5' }),
              h('text', { x: 24, y: 54, fontSize: 9, fill: '#dc2626', fontFamily: 'monospace', fontWeight: 'bold' }, 'CNPJ 00.000.000/0000-00'),
              h('g', { transform: 'translate(258, 30)' },
                h('circle', { r: 11, fill: '#fee2e2', stroke: '#dc2626', strokeWidth: 1.5 }),
                h('path', { d: 'M -4 -4 L 4 4 M 4 -4 L -4 4', stroke: '#dc2626', strokeWidth: 2, strokeLinecap: 'round' }),
              ),

              // itens (só forma, pra nota parecer nota)
              h('rect', { x: 14, y: 66, width: 272, height: 30, rx: 4, fill: '#fafafa', stroke: '#f3f4f6' }),
              h('rect', { x: 24, y: 74, width: 180, height: 4, rx: 2, fill: '#e5e7eb' }),
              h('rect', { x: 24, y: 84, width: 140, height: 4, rx: 2, fill: '#e5e7eb' }),

              // DESTINATÁRIO — o certo
              h('rect', { x: 14, y: 102, width: 272, height: 70, rx: 4, fill: '#f0fdf4', stroke: '#22c55e', strokeWidth: 2 }),
              h('text', { x: 24, y: 118, fontSize: 8, fill: '#15803d', fontWeight: 'bold', fontFamily: 'sans-serif' }, 'DESTINATÁRIO — quem recebe'),
              h('rect', { x: 24, y: 124, width: 110, height: 6, rx: 2, fill: '#86efac' }),
              h('text', { x: 24, y: 144, fontSize: 10, fill: '#15803d', fontFamily: 'monospace', fontWeight: 'bold' }, 'CNPJ 00.000.000/0000-00'),
              h('text', { x: 24, y: 160, fontSize: 7.5, fill: '#4b5563', fontFamily: 'sans-serif' }, 'RUA DA LOJA, 123 — CIDADE/UF'),
              h('g', { transform: 'translate(258, 130)' },
                h('circle', { r: 12, fill: '#dcfce7', stroke: '#16a34a', strokeWidth: 2 }),
                h('path', { d: 'M -5 0 L -1.5 4 L 5 -4', stroke: '#16a34a', strokeWidth: 2.5, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }),
              ),
            ),
            h('p', { className: 'text-[10px] text-center text-gray-500 mt-1' },
              'É o de baixo. O de cima é da empresa que te entregou a carga.'),
          ),
          h('input', {
            type: 'text',
            inputMode: 'numeric',
            value: cnpjManual,
            onChange: (e) => setCnpjManual(formatarCNPJ(e.target.value)),
            placeholder: '00.000.000/0000-00',
            maxLength: 18,
            disabled,
            className: 'w-full px-4 py-3 rounded-xl border-2 text-base font-mono tracking-wider transition ' +
              (cnpjManual && !validarCNPJ(cnpjManual)
                ? 'border-red-300 bg-red-50 text-red-700'
                : (cnpjManual && validarCNPJ(cnpjManual)
                    ? 'border-green-300 bg-green-50 text-green-700'
                    : 'border-blue-300 bg-blue-50 text-blue-700')) +
              (disabled ? ' cursor-not-allowed opacity-60' : ''),
          }),
          cnpjManual && !validarCNPJ(cnpjManual) && h('p', { className: 'text-xs text-red-500 mt-1.5' }, '⚠️ CNPJ inválido — confira os dígitos'),
          cnpjManual && validarCNPJ(cnpjManual) && h('p', { className: 'text-xs text-green-600 mt-1.5' }, '✓ CNPJ válido — vamos consultar a Receita Federal')
        ),

        // AGENTE_BCE_V1 (markup) — o bloco da foto da fachada saiu inteiro:
        // label, os dois inputs (camera com capture + galeria como fallback do
        // Android antigo), o preview e os dois botoes. Nada disso alimentava a
        // validacao nova. O ultimo campo do formulario agora e o CNPJ.

        // Botão enviar
        h('button', {
          // GPS_UNICO_V1: o botao respeita a trava de precisao. Ele destrava
          // sozinho quando o GPS melhora (watchPosition) — sem toque nenhum.
          onClick: handleSubmit,
          disabled: !podeEnviar,
          className: `w-full py-4 rounded-xl font-bold text-white text-lg transition flex items-center justify-center gap-3
            ${!podeEnviar ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90 active:scale-[0.98]'}`,
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
      const corrLat = parseFloat(r.latitude);
      const corrLng = parseFloat(r.longitude);
      const temCorrigido = !isNaN(corrLat) && !isNaN(corrLng) && corrLat !== 0 && corrLng !== 0;

      // Coordenadas do endereço antigo — 3 fontes em ordem de prioridade:
      // 1) endereco_antigo_lat/lng (geocodificado pelo backend via Google)
      // 2) motoboy_lat/lng (GPS do motoboy no momento da solicitação)
      // 3) Geocoding Nominatim do texto endereco_antigo (fallback frontend)
      let antigoLat = parseFloat(r.endereco_antigo_lat) || parseFloat(r.motoboy_lat);
      let antigoLng = parseFloat(r.endereco_antigo_lng) || parseFloat(r.motoboy_lng);
      let temAntigo = !isNaN(antigoLat) && !isNaN(antigoLng) && antigoLat !== 0 && antigoLng !== 0;

      console.log('[Mapa Debug]', {
        endereco_antigo_lat: r.endereco_antigo_lat, endereco_antigo_lng: r.endereco_antigo_lng,
        motoboy_lat: r.motoboy_lat, motoboy_lng: r.motoboy_lng,
        latitude: r.latitude, longitude: r.longitude,
        temAntigo, temCorrigido, endereco_antigo: r.endereco_antigo
      });

      if (!temCorrigido && !temAntigo && !r.endereco_antigo) {
        setMapError('Sem coordenadas disponiveis.');
        return;
      }

      const iniciar = async () => {
        let ponto1 = null;

        // Fallback 3: geocodificar texto do endereço antigo via Nominatim
        if (!temAntigo && r.endereco_antigo) {
          try {
            setStatusMsg('Geocodificando endereço antigo...');
            const geoUrl = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=' + encodeURIComponent(r.endereco_antigo);
            const geoResp = await fetch(geoUrl);
            const geoData = await geoResp.json();
            if (geoData && geoData[0]) {
              antigoLat = parseFloat(geoData[0].lat);
              antigoLng = parseFloat(geoData[0].lon);
              temAntigo = true;
              console.log('[Mapa] Endereço antigo geocodificado via Nominatim:', antigoLat, antigoLng);
            }
          } catch (err) { console.warn('[Mapa] Falha geocoding Nominatim:', err); }
        }

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

        if (temAntigo) {
          L.marker([antigoLat, antigoLng], { icon: mkIcon('#dc2626', '\u2715') })
            .addTo(map).bindPopup('<div style="text-align:center"><strong style="color:#dc2626">End. Errado (GPS)</strong><br><span style="font-size:11px">' + (r.endereco_antigo || antigoLat.toFixed(6) + ', ' + antigoLng.toFixed(6)) + '</span></div>');
          bounds.extend([antigoLat, antigoLng]);
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
          if (temAntigo) {
            setStatusMsg('Tracando rota ate endereco errado...');
            const rota = await buscarRota(ponto1.lat, ponto1.lng, antigoLat, antigoLng);
            if (rota) {
              L.polyline(rota, { color: '#dc2626', weight: 5, opacity: 0.7, dashArray: '12, 8' }).addTo(map).bindPopup('<strong style="color:#dc2626">Rota ate endereco ERRADO</strong>');
            } else {
              L.polyline([[ponto1.lat, ponto1.lng], [antigoLat, antigoLng]], { color: '#dc2626', weight: 3, opacity: 0.5, dashArray: '8, 6' }).addTo(map);
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
          if (temAntigo && temCorrigido) {
            L.polyline([[antigoLat, antigoLng], [corrLat, corrLng]], { color: '#9333ea', weight: 3, dashArray: '6, 6', opacity: 0.6 }).addTo(map);
            const dist = map.distance([antigoLat, antigoLng], [corrLat, corrLng]);
            const distStr = dist >= 1000 ? (dist / 1000).toFixed(2) + ' km' : Math.round(dist) + ' m';
            L.popup({ closeButton: false, autoClose: false, closeOnClick: false })
              .setLatLng([(antigoLat + corrLat) / 2, (antigoLng + corrLng) / 2])
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
    const [filtros, setFiltros]    = useState({ os_numero: '', motoboy: '', de: '', ate: '', grupo: 'aprovados' });
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
        if (filtrosAtivos.grupo)     params.set('grupo',     filtrosAtivos.grupo);
        if (filtrosAtivos.os_numero) params.set('os_numero', filtrosAtivos.os_numero);
        if (filtrosAtivos.motoboy)   params.set('motoboy',   filtrosAtivos.motoboy);
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

    // 2026-04: abrir foto da NF (mesmo modal, endpoint diferente)
    const abrirFotoNf = async (id) => {
      try {
        const res = await fetchAuth(`${API_URL}/agent/foto-nf/${id}`);
        if (res.status === 404) {
          const data = await res.json().catch(() => ({}));
          showToast(data.erro || 'Esta solicitação não tem foto da NF salva.', 'info');
          return;
        }
        if (!res.ok) {
          showToast('Erro ao carregar foto da NF', 'error');
          return;
        }
        const data = await res.json();
        if (data.foto) {
          setFotoModal(data.foto);
        } else {
          showToast('Foto da NF não encontrada', 'error');
        }
      } catch { showToast('Erro de conexão ao carregar foto da NF', 'error'); }
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
      if (!r.latitude && !r.longitude && !r.motoboy_lat && !r.motoboy_lng && !r.endereco_antigo_lat && !r.endereco_antigo) {
        showToast('Sem coordenadas disponíveis para este registro', 'error');
        return;
      }
      setMapaModal(r);
    };

    const trocarGrupo = (g) => {
      const novos = { ...filtros, grupo: g };
      setFiltros(novos);
      carregar(1, novos);
    };

    return h('div', { className: 'max-w-6xl mx-auto px-4 py-6' },

      // 2026-07: abas Aprovados x Barradas
      h('div', { className: 'flex gap-2 mb-4' },
        h('button', {
          onClick: () => trocarGrupo('aprovados'),
          className: `flex-1 md:flex-none px-5 py-2.5 rounded-xl text-sm font-semibold transition ${filtros.grupo === 'aprovados' ? 'text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`,
          style: filtros.grupo === 'aprovados' ? { background: 'linear-gradient(135deg, #16a34a, #22c55e)' } : {},
        }, '✅ Ajustes Aprovados'),
        h('button', {
          onClick: () => trocarGrupo('barradas'),
          className: `flex-1 md:flex-none px-5 py-2.5 rounded-xl text-sm font-semibold transition ${filtros.grupo === 'barradas' ? 'text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`,
          style: filtros.grupo === 'barradas' ? { background: 'linear-gradient(135deg, #b91c1c, #ef4444)' } : {},
        }, '🚫 Solicitações Barradas'),
        // ADMIN_BCE_V1 (subaba): a sub-aba "🔓 Falha/Liberação IA" saiu.
        // O grupo padrao ja e 'aprovados', entao nada quebra ao remover o botao.
        // O ramo `grupo === 'liberacao_ia'` do historico.routes.js (com o LEFT JOIN
        // em liberacoes_pontos) fica orfao no backend — ninguem mais chama.
      ),

      // Filtros
      h('div', { className: 'grid grid-cols-2 md:grid-cols-5 gap-3 mb-5' },
        h('input', {
          name: 'os_numero', value: filtros.os_numero, onChange: handleFiltro,
          placeholder: 'Nº OS',
          className: 'col-span-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-400',
        }),
        h('input', {
          name: 'motoboy', value: filtros.motoboy, onChange: handleFiltro,
          placeholder: 'Motoboy (nome ou código)',
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
                    }, '⚠️ Frete pendente'),
                    // ADMIN_BCE_V1 (motivo): 'barrado' entra aqui. A caixa de motivo ja
                    // fazia exatamente o que a barrada precisa (mostra erro/detalhe_erro),
                    // e o detalhe_erro da barrada guarda a frase que o motoboy leu.
                    (r.status === 'falhou' || r.status === 'erro' || r.status === 'barrado') && (r.erro || r.detalhe_erro) && h('div', {
                      className: 'mt-1 text-[10px] text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-1 max-w-[220px] break-words leading-tight',
                      title: r.erro || r.detalhe_erro,
                    },
                      h('div', { className: 'font-bold mb-0.5' }, '⚠️ Motivo:'),
                      h('div', { className: 'font-normal' }, r.erro || r.detalhe_erro),
                      r.etapa_atual ? h('div', { className: 'font-normal text-red-500 mt-0.5 italic' },
                        'Etapa: ' + r.etapa_atual) : null
                    ),
                    // ADMIN_BCE_V1 (badges) — sairam os dois badges da coluna Status:
                    //
                    // "✅ IA Validado" / "🔍 Investigar": liam r.validacao_localizacao,
                    // que era o retorno do Gemini lendo a FOTO da fachada. Sem foto, a
                    // coluna vem null em toda correcao nova — o badge simplesmente nunca
                    // mais apareceria. Quem valida agora e o cruzamento B/C/E, e ele ja
                    // tem bloco proprio na linha expandida.
                    //
                    // "🔓 Ponto liberado (P2)": era o status da sub-aba Falha/Liberacao
                    // IA, removida neste pacote.
                    //
                    // ATENCAO: a funcao de liberar ponto CONTINUA RODANDO. O
                    // deveAutoLiberar() no agent-correcao.agent.js segue liberando P2/P3
                    // quando a correcao falha, gravando em liberacoes_pontos. So a tela
                    // que mostrava isso saiu. Se a intencao era parar de liberar, e outro
                    // pacote (o "3" da conversa).
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
                  // ADMIN_BCE_V1 (coluna foto): o botao so aparece se a linha TIVER foto.
                  //
                  // Antes ele era incondicional: toda linha mostrava "📷 Ver", e as novas
                  // (sem foto) abriam o modal pra dar erro. O backend ja mandava o
                  // tem_foto_fachada, so ninguem lia.
                  //
                  // A coluna FICA (em vez de sumir) porque as correcoes ANTIGAS ainda tem
                  // foto no banco e o /agent/foto/:id continua servindo. Ela vai secando
                  // sozinha: correcao nova nasce sem foto e mostra "—".
                  h('td', { className: 'px-3 py-3' },
                    r.tem_foto_fachada
                      ? h('button', {
                          onClick: (e) => { e.stopPropagation(); abrirFoto(r.id); },
                          className: 'text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold transition',
                        }, '📷 Ver')
                      : h('span', { className: 'text-xs text-gray-300' }, '—')
                  ),
                  h('td', { className: 'px-3 py-3' },
                    h('div', { className: 'flex flex-col gap-1' },
                      (r.latitude || r.motoboy_lat || r.endereco_antigo_lat || r.endereco_antigo) && h('button', {
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
                      ),
                      // ADMIN_BCE_V1 (bloco IA) — o card "🤖 Validação IA" saiu inteiro.
                      //
                      // Ele mostrava "Nome na Foto", "Match Google", "Confiança" e
                      // "Motivo": tudo saida do Gemini lendo a FOTO da fachada. Sem foto,
                      // r.validacao_localizacao vem null em toda correcao nova — o card
                      // caia no ramo "Sem dados de validação (solicitação anterior à
                      // funcionalidade)", que mentiria: nao e correcao antiga, e a
                      // funcionalidade que acabou.
                      //
                      // O que substitui: o card "🧾 Validação NF + Receita Federal" logo
                      // abaixo, que ja mostra a Receita e o cruzamento B/C/E.
                      //
                      // O campo validacao_localizacao continua no SELECT do historico e no
                      // banco — as correcoes ANTIGAS tem o JSON do Gemini gravado ali. Nao
                      // e lido em lugar nenhum agora; se um dia quiser consultar, e SQL.
                      // 2026-04: Bloco da Validação NF + Receita Federal
                      (() => {
                        const vnf = r.validacao_nf;
                        if (!vnf) return null;
                        const dados = vnf.dados || {};
                        const receita = vnf.receita;
                        const cruz = vnf.cruzamento;
                        const receitaOk = receita && receita.ok;
                        const ativa = receitaOk && receita.ativa;
                        return h('div', { className: 'p-3 bg-indigo-50 rounded-lg col-span-2' },
                          h('div', { className: 'flex items-center justify-between mb-2' },
                            h('p', { className: 'font-semibold text-indigo-700' }, '🧾 Validação NF + Receita Federal'),
                            // ADMIN_BCE_V1 (selo nf): o selo "🚫 Sem foto da NF" saiu.
                            // Foto de NF nao existe mais desde 2026-04 (v5, CNPJ digitado):
                            // o selo aparecia em 100% das linhas novas avisando de um campo
                            // que ninguem mais preenche. Aviso que sempre aparece nao e
                            // aviso, e ruido. O botao de ver a foto fica, pro historico
                            // antigo que ainda tem imagem no banco.
                            r.tem_foto_nf && h('button', {
                              onClick: (e) => { e.stopPropagation(); abrirFotoNf(r.id); },
                              className: 'text-xs px-2 py-1 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 font-semibold'
                            }, '📷 Ver foto da NF')
                          ),
                          // Dados extraídos: IA (foto) ou CNPJ digitado pelo motoboy
                          h('div', { className: 'bg-white rounded p-2 mb-2' },
                            h('p', { className: 'text-[10px] font-bold text-gray-500 mb-1' },
                              vnf.origem === 'cnpj_manual'
                                ? '⌨️ CNPJ DIGITADO PELO MOTOBOY'
                                : '📄 EXTRAÍDO DA NF (IA)'
                            ),
                            h('div', { className: 'grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-gray-700' },
                              dados.cnpj_formatado && h('div', null, h('span', { className: 'font-semibold' }, 'CNPJ: '), dados.cnpj_formatado),
                              typeof vnf.confianca === 'number' && h('div', null, h('span', { className: 'font-semibold' }, 'Confiança IA: '), `${vnf.confianca}%`),
                              dados.razao_social && h('div', { className: 'col-span-2' }, h('span', { className: 'font-semibold' }, 'Razão social: '), dados.razao_social),
                              dados.nome_fantasia && h('div', { className: 'col-span-2' }, h('span', { className: 'font-semibold' }, 'Nome fantasia: '), dados.nome_fantasia),
                              dados.endereco_nf && h('div', { className: 'col-span-2' }, h('span', { className: 'font-semibold' }, 'Endereço NF: '), dados.endereco_nf)
                            )
                          ),
                          // Dados oficiais Receita
                          receita && h('div', {
                            className: 'rounded p-2 mb-2 ' + (ativa ? 'bg-blue-50 border border-blue-200' : (receitaOk ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'))
                          },
                            h('div', { className: 'flex items-center gap-2 mb-1' },
                              h('p', { className: 'text-[10px] font-bold ' + (ativa ? 'text-blue-700' : (receitaOk ? 'text-yellow-700' : 'text-red-700')) }, '🏛️ RECEITA FEDERAL'),
                              receitaOk && h('span', {
                                className: 'inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ' +
                                  (ativa ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800')
                              }, receita.situacao),
                              receitaOk && receita.fonte && h('span', { className: 'text-[9px] text-gray-500' }, `via ${receita.fonte}`)
                            ),
                            !receitaOk && h('p', { className: 'text-xs text-red-600' }, receita.motivo || 'Erro consultando Receita'),
                            receitaOk && h('div', { className: 'grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-gray-700' },
                              receita.razao_social && h('div', { className: 'col-span-2' }, h('span', { className: 'font-semibold' }, 'Razão social: '), receita.razao_social),
                              receita.nome_fantasia && h('div', { className: 'col-span-2' }, h('span', { className: 'font-semibold' }, 'Nome fantasia: '), receita.nome_fantasia),
                              receita.endereco && h('div', { className: 'col-span-2' }, h('span', { className: 'font-semibold' }, 'Endereço: '), receita.endereco),
                              receita.telefone && h('div', null, h('span', { className: 'font-semibold' }, '📞 '), receita.telefone),
                              receita.cep && h('div', null, h('span', { className: 'font-semibold' }, 'CEP: '), receita.cep)
                            )
                          ),
                          // Cruzamento (scores)
                          // ══════════════════════════════════════════════════════════════
                          // ADMIN_SEM_SCORE_V1_PAINEL — sai a porcentagem, fica o veredito.
                          //
                          // O painel mostrava um grid de scores ("cep receita vs gps 0%",
                          // "nome receita vs google 100%") e um "Máx: X%".
                          //
                          // Por que sai:
                          //
                          //   O número não responde a pergunta do admin. Ele quer saber
                          //   COMO a corrida foi validada — e isso o caminho_aprovacao diz
                          //   por extenso, com o dado que importa dentro:
                          //     "Presença confirmada (20m, limite 100m)"
                          //     "Presença confirmada pelo nome (100%: 'Centro Automotivo
                          //      Leonardo') — sem geocode nem CEP"
                          //
                          //   E o "Máx" era pior que inútil: ele só olhava a distância, então
                          //   uma corrida aprovada pelo nome com 100% exibia "Máx: 0%". O
                          //   score_max foi consertado no backend, mas mesmo certo ele não
                          //   acrescenta nada que o caminho não diga melhor.
                          //
                          // A CONDIÇÃO MUDOU, e isso conserta um bug: era
                          // `cruz.scores && Object.keys(cruz.scores).length > 0`. Uma corrida
                          // barrada por 'indisponivel' não tem score nenhum — e o bloco
                          // inteiro sumia, escondendo justamente o motivo da barrada. Agora o
                          // bloco aparece quando há veredito, que é quando ele serve.
                          //
                          // A DISTÂNCIA FICA. Ela é em metros, não em %, e foi ela que
                          // entregou o bug do geocode em 17/07 (6014m, 11869m, 12699m).
                          // Tirar ela seria cegar o painel de novo.
                          // ══════════════════════════════════════════════════════════════
                          cruz && (cruz.caminho_aprovacao || cruz.motivo_bloqueio || typeof cruz.distancia_metros === 'number') && h('div', { className: 'bg-white rounded p-2' },
                            h('div', { className: 'flex items-center justify-between mb-1' },
                              h('p', { className: 'text-[10px] font-bold text-gray-500' }, '🧮 VALIDAÇÃO'),
                              cruz.salvo_no_banco && h('span', {
                                className: 'inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-200 text-purple-800'
                              }, '💾 Salvo')
                            ),
                            // ADMIN_BCE_V1 (cruzamento): distancia + veredito.
                            // O grid de scores acima e generico (Object.entries), entao ja
                            // desenha os 3 sinais novos sozinho. Falta o que decide:
                            // a DISTANCIA (o corte do B e em metros, nao em %) e o motivo
                            // da barrada. Isto aqui e o painel admin — ele ve o numero que
                            // a tela do motoboy nao ve.
                            typeof cruz.distancia_metros === 'number' && h('div', {
                              className: 'flex justify-between bg-gray-50 rounded px-2 py-1 mt-1 text-[10px]',
                            },
                              h('span', { className: 'text-gray-600' }, '📍 distancia Receita↔GPS'),
                              h('span', {
                                className: 'font-bold ' + (cruz.distancia_metros <= (cruz.limite_metros || 100) ? 'text-green-600' : 'text-red-600'),
                              }, `${cruz.distancia_metros} m` + (cruz.limite_metros ? ` (limite ${cruz.limite_metros} m)` : ''))
                            ),
                            cruz.motivo_bloqueio && h('p', {
                              className: 'text-[10px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1 mt-1.5',
                            }, '🛑 ', cruz.motivo_bloqueio),
                            cruz.caminho_aprovacao && h('p', {
                              className: 'text-[10px] text-green-700 mt-1.5',
                            }, '✅ Liberado por: ', cruz.caminho_aprovacao),
                            cruz.mensagem_motoboy && h('p', { className: 'text-[10px] text-gray-600 mt-1.5 italic' }, '↳ ', cruz.mensagem_motoboy)
                          )
                        );
                      })(),
                      // Valores Antes x Depois
                      (() => {
                        const a = r.valores_antes;
                        const d = r.valores_depois;
                        if (!a && !d) return null;
                        return h('div', { className: 'p-3 bg-blue-50 rounded-lg col-span-2' },
                          h('p', { className: 'font-semibold text-blue-700 mb-2' }, '📊 Valores Antes × Depois'),
                          h('div', { className: 'grid grid-cols-2 gap-3' },
                            h('div', { className: 'bg-orange-50 border border-orange-200 rounded-lg p-2' },
                              h('p', { className: 'text-[10px] font-bold text-orange-600 mb-1' }, 'ANTES'),
                              a && a.km && h('p', { className: 'text-xs text-orange-700' }, '🛣️ ', h('strong', null, a.km), ' km'),
                              a && a.valor_profissional && h('p', { className: 'text-xs text-orange-700' }, '💰 Profissional: R$ ', h('strong', null, a.valor_profissional)),
                              a && a.valor_servico && h('p', { className: 'text-xs text-orange-700' }, '💰 Serviço: R$ ', h('strong', null, a.valor_servico)),
                              !a && h('p', { className: 'text-xs text-gray-400' }, 'Não capturado')
                            ),
                            h('div', { className: 'bg-green-50 border border-green-200 rounded-lg p-2' },
                              h('p', { className: 'text-[10px] font-bold text-green-600 mb-1' }, 'DEPOIS'),
                              d && d.km && h('p', { className: 'text-xs text-green-700' }, '🛣️ ', h('strong', null, d.km), ' km'),
                              d && d.valor_profissional && h('p', { className: 'text-xs text-green-700' }, '💰 Profissional: R$ ', h('strong', null, d.valor_profissional)),
                              d && d.valor_servico && h('p', { className: 'text-xs text-green-700' }, '💰 Serviço: R$ ', h('strong', null, d.valor_servico)),
                              !d && h('p', { className: 'text-xs text-gray-400' }, 'Não capturado')
                            )
                          )
                        );
                      })()
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
              (r.latitude || r.motoboy_lat || r.endereco_antigo_lat || r.endereco_antigo) && h('button', {
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
  // ========================================================================
  // TAB LIBERAÇÕES (admin) — 2026-04 v3
  // Lista jobs de liberacoes_pontos via GET /agent/liberar-ponto/historico
  // Visualização simples: status, OS, motoboy, hora, erro se falhou
  // ========================================================================
  function TabLiberacoes({ API_URL, fetchAuth, showToast }) {
    const [dados, setDados]     = useState([]);
    const [total, setTotal]     = useState(0);
    const [loading, setLoading] = useState(false);
    const [filtros, setFiltros] = useState({ status: '', os_numero: '', de: '', ate: '' });
    const [page, setPage]       = useState(1);
    const PER_PAGE = 30;

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

        const res  = await fetchAuth(`${API_URL}/agent/liberar-ponto/historico?${params}`);
        const data = await res.json();
        setDados(data.registros || []);
        setTotal(data.total || 0);
        setPage(pg);
      } catch {
        showToast('Erro ao carregar liberações', 'error');
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
    const limparFiltros = () => {
      const v = { status: '', os_numero: '', de: '', ate: '' };
      setFiltros(v);
      carregar(1, v);
    };

    const labelStatus = {
      sucesso: '✅ Sucesso',
      falhou: '❌ Falhou',
      processando: '⏳ Processando',
      pendente: '⏸️ Pendente',
    };
    const corStatus = {
      sucesso:     'bg-green-100 text-green-800 border-green-300',
      falhou:      'bg-red-100 text-red-800 border-red-300',
      processando: 'bg-blue-100 text-blue-800 border-blue-300',
      pendente:    'bg-yellow-100 text-yellow-800 border-yellow-300',
    };

    const fmtData = (s) => {
      if (!s) return '—';
      const d = new Date(s);
      return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    return h('div', { className: 'p-4 max-w-6xl mx-auto' },

      // Cabeçalho com contadores
      h('div', { className: 'flex justify-between items-center mb-4' },
        h('div', null,
          h('h2', { className: 'text-xl font-bold text-gray-800' }, '🔓 Liberações de OS'),
          h('p', { className: 'text-sm text-gray-500' }, `Total: ${total} registro(s)`)
        ),
        h('button', {
          onClick: () => carregar(page, filtros),
          disabled: loading,
          className: 'px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-semibold disabled:opacity-50',
        }, loading ? 'Carregando...' : '🔄 Atualizar')
      ),

      // Filtros
      h('div', { className: 'bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-4' },
        h('div', { className: 'grid grid-cols-1 md:grid-cols-5 gap-3' },
          h('div', null,
            h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1' }, 'Status'),
            h('select', {
              name: 'status',
              value: filtros.status,
              onChange: handleFiltro,
              className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm',
            },
              h('option', { value: '' }, 'Todos'),
              h('option', { value: 'pendente' }, 'Pendente'),
              h('option', { value: 'processando' }, 'Processando'),
              h('option', { value: 'sucesso' }, 'Sucesso'),
              h('option', { value: 'falhou' }, 'Falhou')
            )
          ),
          h('div', null,
            h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1' }, 'OS'),
            h('input', {
              type: 'text', name: 'os_numero', value: filtros.os_numero, onChange: handleFiltro,
              placeholder: 'Ex: 1144499',
              className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm',
            })
          ),
          h('div', null,
            h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1' }, 'De'),
            h('input', {
              type: 'date', name: 'de', value: filtros.de, onChange: handleFiltro,
              className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm',
            })
          ),
          h('div', null,
            h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1' }, 'Até'),
            h('input', {
              type: 'date', name: 'ate', value: filtros.ate, onChange: handleFiltro,
              className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm',
            })
          ),
          h('div', { className: 'flex items-end gap-2' },
            h('button', {
              onClick: aplicarFiltros,
              className: 'flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700',
            }, 'Filtrar'),
            h('button', {
              onClick: limparFiltros,
              className: 'px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300',
            }, 'Limpar')
          )
        )
      ),

      // Tabela
      h('div', { className: 'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden' },
        loading && dados.length === 0
          ? h('div', { className: 'p-10 text-center text-gray-500' }, 'Carregando...')
          : dados.length === 0
            ? h('div', { className: 'p-10 text-center text-gray-500' },
                h('p', { className: 'text-4xl mb-2' }, '📭'),
                h('p', null, 'Nenhuma liberação encontrada com esses filtros.')
              )
            : h('div', { className: 'overflow-x-auto' },
                h('table', { className: 'w-full text-sm' },
                  h('thead', { className: 'bg-gray-50 border-b border-gray-200' },
                    h('tr', null,
                      h('th', { className: 'text-left px-3 py-2 font-semibold text-gray-600' }, 'ID'),
                      h('th', { className: 'text-left px-3 py-2 font-semibold text-gray-600' }, 'OS'),
                      h('th', { className: 'text-left px-3 py-2 font-semibold text-gray-600' }, 'Motoboy'),
                      h('th', { className: 'text-left px-3 py-2 font-semibold text-gray-600' }, 'Status'),
                      h('th', { className: 'text-left px-3 py-2 font-semibold text-gray-600' }, 'Criado em'),
                      h('th', { className: 'text-left px-3 py-2 font-semibold text-gray-600' }, 'Detalhe')
                    )
                  ),
                  h('tbody', null,
                    dados.map(r => h('tr', {
                      key: r.id,
                      className: 'border-b border-gray-100 hover:bg-gray-50',
                    },
                      h('td', { className: 'px-3 py-2 font-mono text-xs text-gray-500' }, `#${r.id}`),
                      h('td', { className: 'px-3 py-2 font-bold' }, r.os_numero),
                      h('td', { className: 'px-3 py-2' },
                        h('div', null,
                          h('div', { className: 'font-medium text-gray-800' }, r.usuario_nome || '—'),
                          r.cod_profissional && h('div', { className: 'text-xs text-gray-500' }, `Cód: ${r.cod_profissional}`)
                        )
                      ),
                      h('td', { className: 'px-3 py-2' },
                        h('span', {
                          className: `inline-block px-2 py-1 rounded-lg text-xs font-semibold border ${corStatus[r.status] || 'bg-gray-100 border-gray-300'}`,
                        }, labelStatus[r.status] || r.status)
                      ),
                      h('td', { className: 'px-3 py-2 text-xs text-gray-600' }, fmtData(r.criado_em)),
                      h('td', { className: 'px-3 py-2 text-xs' },
                        r.status === 'sucesso' && r.mensagem_retorno && h('span', { className: 'text-green-600' }, '✓ ', r.mensagem_retorno),
                        r.status === 'falhou' && r.erro && h('div', { className: 'text-red-600 max-w-md break-words' }, '⚠️ ', r.erro),
                        r.status === 'processando' && h('span', { className: 'text-blue-600' },
                          r.etapa_atual ? `${r.etapa_atual} (${r.progresso || 0}%)` : 'Em andamento...'
                        )
                      )
                    ))
                  )
                )
              )
      ),

      // Paginação
      totalPaginas > 1 && h('div', { className: 'flex justify-center items-center gap-2 mt-4' },
        h('button', {
          onClick: () => carregar(page - 1, filtros),
          disabled: page <= 1 || loading,
          className: 'px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm disabled:opacity-50',
        }, '← Anterior'),
        h('span', { className: 'text-sm text-gray-600' }, `Página ${page} de ${totalPaginas}`),
        h('button', {
          onClick: () => carregar(page + 1, filtros),
          disabled: page >= totalPaginas || loading,
          className: 'px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm disabled:opacity-50',
        }, 'Próxima →')
      )
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ANALYTICS_V2 (front) — reescrito inteiro.
  //
  // O que saiu, e por que:
  //
  // - OS 4 CARDS DE FUNDO PASTEL, as 3 caixas coloridas e o bloco vermelho de
  //   Red Flags. Fundo colorido nao carrega informacao — quando tudo grita, nada
  //   e urgente. Cor agora so aparece onde ela SIGNIFICA: o ponto do KPI, a barra
  //   do grafico, o marcador de quem esta fora da curva.
  //
  // - OS 3 GRAFICOS (mes / semana / dia). Mostravam a mesma coisa em escalas
  //   diferentes, e era o que mais poluia. Agora e UM, que troca de granularidade
  //   sozinho conforme a janela (ate ~45 dias mostra dia a dia; acima, agrupa por
  //   semana no proprio front, sem outra request).
  //
  // - O CACHE GLOBAL (_analyticsData / _analyticsFetching / _analyticsError).
  //   Ele existia pra sobreviver a remount, mas guardava UMA resposta sem chave —
  //   com filtro de periodo isso passaria a servir o periodo errado calado. O
  //   componente hoje vive dentro de um display:none (nao remonta), entao o cache
  //   nao tem mais razao de existir.
  //
  // - O grafico "por semana" NAO DESENHAVA BARRA NENHUMA em producao: a altura era
  //   `height: N%` dentro de um flex item de altura automatica, e porcentagem sem
  //   altura de referencia resolve pra zero. Ficou assim quem sabe quanto tempo,
  //   porque o numero ao lado continuava aparecendo. Agora e SVG com viewBox: a
  //   altura e coordenada, nao porcentagem — nao tem como nao desenhar.
  //
  // O que entrou:
  //
  // - FILTRO DE PERIODO mandando em TUDO. Antes o card "Total" era de sempre e os
  //   graficos eram de 6 meses / 8 semanas / 7 dias: quatro janelas na mesma tela.
  //
  // - A BARRA DE COMPOSICAO, que soma 100%. Ela existe por um motivo especifico:
  //   em producao, 5777 - 4652 sucesso - 576 erro - 6 pendentes = 543 linhas que
  //   nao apareciam em lugar nenhum (o SQL so conhecia 'sucesso' e 'erro'; falhou,
  //   barrado e bloqueado_cliente eram invisiveis). Se um dia sobrar faixa cinza
  //   nessa barra, e porque tem estado sem dono — o bug aparece na tela em vez de
  //   precisar de uma subtracao pra ser descoberto.
  //
  // - ONDE AS TENTATIVAS MORREM (fase_falha) e PRECISAO DO GPS (gps_accuracy).
  //   Sao os dois graficos que respondem as perguntas que a gente vinha
  //   respondendo no chute: "o que consertar primeiro?" e "o limite de 60m esta
  //   apertado demais?".
  // ══════════════════════════════════════════════════════════════════════════

  const ANL_PERIODOS = [
    { id: '7',      label: '7 dias'  },
    { id: '30',     label: '30 dias' },
    { id: '90',     label: '90 dias' },
    { id: '180',    label: '6 meses' },
    { id: 'custom', label: 'Personalizado' },
  ];

  // Rotulos das fases. A chave crua (presenca, gps_impreciso...) aparece embaixo
  // em fonte mono: o admin precisa saber o valor real pra escrever SQL.
  // FASES_EXPLICADAS_V1 — [rotulo, explicacao, quem_errou]
  //
  // A explicacao existe porque a chave crua nao ensina nada: "localizando" e
  // "confirmando" so fazem sentido pra quem escreveu o Playwright, e este painel
  // e pra decidir o que consertar primeiro. Sem saber o que cada fase E, o
  // ranking vira uma lista de palavras ordenada por numero.
  //
  // O terceiro campo agrupa por CULPA, que e a leitura que importa:
  //   'motoboy'  ele pode consertar sozinho na proxima tentativa
  //   'nosso'    bug, infra ou regra nossa — ele nao tem o que fazer
  //   'robo'     passou na validacao e quebrou no RPA (a Mapp, a rede, o login)
  //   'regra'    a regra funcionou como devia (ex: OS ja corrigida)
  //
  // Isso muda a conclusao. 120 em 'localizando' NAO e motoboy errando: e o robo
  // nao achando a OS na Mapp — problema nosso, e o maior da lista. Sem a coluna
  // de culpa, alguem olharia esse ranking e concluiria que os motoboys erram
  // muito.
  //
  // Chave que nao estiver aqui aparece crua, sem explicacao — melhor um rotulo
  // feio que um rotulo errado.
  const ANL_FASES = {
    // ── Validação (rota) ──
    presenca:      ['Não estava no endereço',   'O GPS ficou a mais de 100m do endereço que a Receita tem pra esse CNPJ.', 'motoboy'],
    receita:       ['CNPJ / Receita',           'O CNPJ não existe na Receita, ou a consulta às duas bases falhou.', 'motoboy'],
    gps_impreciso: ['GPS impreciso',            'O aparelho não sabia onde estava com precisão suficiente pra decidir (±60m ou mais).', 'motoboy'],
    ja_corrigida:  ['OS já corrigida',          'Esse ponto já tinha sido corrigido com sucesso antes. Se repete muito, a correção anterior não resolveu.', 'regra'],
    em_andamento:  ['Já tinha uma rodando',     'Já existia uma correção em andamento pra esse ponto. Se repete muito, o polling não está dando retorno.', 'regra'],
    entrada:       ['Dados inválidos',          'Campo faltando ou CNPJ com dígito errado — nem chegou a validar. O app já barra isso, então aqui é raro.', 'motoboy'],
    erro_interno:  ['Erro interno nosso',       'Exception no servidor. Não é o motoboy: é bug. O detalhe técnico está no detalhe_erro da linha.', 'nosso'],
    // ── RPA (vem do etapa_atual — a correção passou na validação e quebrou depois) ──
    login:         ['RPA: login',               'O robô não conseguiu entrar na Mapp. Costuma ser senha, captcha ou a Mapp fora do ar.', 'robo'],
    localizando:   ['RPA: localizando a OS',    'O robô entrou mas não achou a OS ou o ponto na Mapp. Pode ser OS cancelada, número errado ou a tela mudou.', 'robo'],
    codificando:   ['RPA: codificando o endereço', 'O robô achou a OS mas não conseguiu gravar o endereço novo.', 'robo'],
    confirmando:   ['RPA: confirmando',         'Gravou e não confirmou. Vale conferir na Mapp se o endereço entrou mesmo.', 'robo'],
    recalculando:  ['RPA: recalculando o frete','O endereço entrou, mas o frete não recalculou — a correção vale, o valor não.', 'robo'],
    finalizando:   ['RPA: finalizando',         'Quebrou no último passo, com quase tudo feito. Confira na Mapp antes de refazer.', 'robo'],
    retentando:    ['RPA: retentando',          'O robô estava numa nova tentativa quando parou.', 'robo'],
    bloqueado:     ['Cliente bloqueado',        'A loja está na lista de clientes que não aceitam ajuste automático. Nada a ver com validação.', 'regra'],
    sem_fase:      ['Sem fase registrada',      'Linha anterior à coluna fase_falha existir. Vai sumir sozinho conforme as antigas saem da janela.', 'nosso'],
  };

  // Como cada culpa se apresenta. Cinza pro que e regra funcionando: nao e
  // problema, e o sistema fazendo o trabalho dele.
  const ANL_CULPA = {
    motoboy: ['Motoboy',   'bg-rose-50 text-rose-700 border-rose-200'],
    nosso:   ['Nosso bug', 'bg-purple-50 text-purple-700 border-purple-200'],
    robo:    ['Robô',      'bg-amber-50 text-amber-700 border-amber-200'],
    regra:   ['Regra',     'bg-slate-100 text-slate-600 border-slate-200'],
  };

  const ANL_GPS_FAIXAS = [
    ['0-15',   '0–15 m',   false],
    ['16-30',  '16–30 m',  false],
    ['31-60',  '31–60 m',  false],
    ['61-100', '61–100 m', true],
    ['100+',   '> 100 m',  true],
  ];

  const anlNum = (n) => Number(n || 0).toLocaleString('pt-BR');
  const anlPct = (n, t) => (!t ? 0 : Math.round((n / t) * 100));
  const anlDM  = (iso) => { const [, m, d] = String(iso).split('-'); return `${d}/${m}`; };

  function TabAnalytics({ API_URL, fetchAuth, showToast }) {
    const [dados, setDados]     = useState(null);
    const [loading, setLoading] = useState(true);
    const [periodo, setPeriodo] = useState('30');
    const [range, setRange]     = useState({ de: '', ate: '' });

    // showToast e nova referencia a cada render do pai — em dependencia de
    // useCallback isso vira loop. Ref.
    const toastRef = useRef(showToast);
    toastRef.current = showToast;

    const carregar = useCallback(async (p, r) => {
      setLoading(true);
      try {
        const qs = p === 'custom' && r.de && r.ate
          ? `de=${r.de}&ate=${r.ate}`
          : `dias=${p === 'custom' ? 30 : p}`;
        const res  = await fetchAuth(`${API_URL}/agent/analytics?${qs}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.erro || 'falhou');
        setDados(data);
      } catch (e) {
        toastRef.current('Erro ao carregar analytics', 'error');
      } finally {
        setLoading(false);
      }
    }, [fetchAuth, API_URL]);

    useEffect(() => { carregar('30', { de: '', ate: '' }); }, [carregar]);

    const trocarPeriodo = (id) => {
      setPeriodo(id);
      if (id !== 'custom') carregar(id, range);
    };

    const aplicarRange = () => {
      if (!range.de || !range.ate) { toastRef.current('Escolha as duas datas', 'error'); return; }
      carregar('custom', range);
    };

    const t   = (dados && dados.totais)   || {};
    const ant = (dados && dados.anterior) || {};
    const total = t.total || 0;

    // Delta vs periodo anterior. Sem base (periodo anterior zerado) nao inventa
    // porcentagem: mostra "—". Divisao por zero vira Infinity e "↑ Infinity%" na
    // tela.
    const delta = (ant.total > 0) ? Math.round(((total - ant.total) / ant.total) * 100) : null;

    // ── Grafico: agrupa no front quando a janela e longa ──
    const dias = (dados && dados.por_dia) || [];
    let pontos = dias;
    if (dias.length > 45) {
      const semanas = [];
      for (let i = 0; i < dias.length; i += 7) {
        const b = dias.slice(i, i + 7);
        semanas.push({
          dia:        b[0].dia,
          total:      b.reduce((s, x) => s + x.total, 0),
          corrigidas: b.reduce((s, x) => s + x.corrigidas, 0),
          barradas:   b.reduce((s, x) => s + x.barradas, 0),
          falhas:     b.reduce((s, x) => s + x.falhas, 0),
        });
      }
      pontos = semanas;
    }
    const maxY = Math.max(1, ...pontos.map(p => p.total));
    const W = 1080, H = 180, GAP = pontos.length > 60 ? 1 : 3;
    const bw = pontos.length ? Math.max(1, (W - GAP * (pontos.length - 1)) / pontos.length) : 0;
    const passo = Math.max(1, Math.ceil(pontos.length / 12));

    const KPIS = [
      { k: 'corrigidas', label: 'Corrigidas',     cor: '#10b981', nota: `${anlPct(t.corrigidas, total)}% das tentativas` },
      { k: 'barradas',   label: 'Barradas',       cor: '#f43f5e', nota: 'a regra recusou' },
      { k: 'falhas',     label: 'Falhas do robô', cor: '#f59e0b', nota: 'passou e quebrou no RPA' },
      { k: 'na_fila',    label: 'Na fila',        cor: '#cbd5e1', nota: 'rodando agora' },
    ];

    // A composicao inclui bloqueadas: sem elas a barra nao fecharia 100%, que e a
    // unica razao dela existir.
    const comp = [
      { k: 'corrigidas', cor: '#10b981' },
      { k: 'barradas',   cor: '#f43f5e' },
      { k: 'falhas',     cor: '#f59e0b' },
      { k: 'bloqueadas', cor: '#a78bfa' },
      { k: 'na_fila',    cor: '#cbd5e1' },
    ];
    const somaComp = comp.reduce((s, c) => s + (t[c.k] || 0), 0);

    const fases   = (dados && dados.por_fase) || [];
    const maxFase = Math.max(1, ...fases.map(f => f.total));
    const gpsF    = (dados && dados.gps && dados.gps.faixas) || {};
    const gpsTot  = Object.values(gpsF).reduce((s, n) => s + n, 0);
    const profs   = (dados && dados.profissionais) || [];

    return h('div', { className: 'max-w-[1180px] mx-auto px-4 sm:px-6 py-6' },

      // ── Cabeçalho + filtro ──
      h('div', { className: 'flex items-end justify-between flex-wrap gap-4 mb-5' },
        h('div', null,
          h('h1', { className: 'text-xl font-bold tracking-tight text-slate-900' }, 'Analytics'),
          h('p', { className: 'text-[13px] text-slate-500 mt-0.5' },
            'Correção de endereço · ',
            h('span', { className: 'font-medium text-slate-600' },
              dados ? `${anlDM(dados.periodo.de)} a ${anlDM(dados.periodo.ate)} · ${dados.periodo.dias} dias` : '—'
            )
          )
        ),
        h('div', { className: 'inline-flex p-0.5 rounded-xl border border-slate-200 bg-white' },
          ANL_PERIODOS.map(p => h('button', {
            key: p.id,
            onClick: () => trocarPeriodo(p.id),
            className: `text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
              periodo === p.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'}`,
          }, p.label))
        )
      ),

      periodo === 'custom' && h('div', { className: 'bg-white border border-slate-200 rounded-xl p-4 mb-5 flex items-end gap-3 flex-wrap' },
        h('div', null,
          h('label', { className: 'block text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-1.5' }, 'De'),
          h('input', {
            type: 'date', value: range.de,
            onChange: (e) => setRange(r => ({ ...r, de: e.target.value })),
            className: 'border border-slate-200 rounded-lg px-3 py-2 text-sm',
          })
        ),
        h('div', null,
          h('label', { className: 'block text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-1.5' }, 'Até'),
          h('input', {
            type: 'date', value: range.ate,
            onChange: (e) => setRange(r => ({ ...r, ate: e.target.value })),
            className: 'border border-slate-200 rounded-lg px-3 py-2 text-sm',
          })
        ),
        h('button', {
          onClick: aplicarRange,
          className: 'px-4 py-2 rounded-lg text-sm font-semibold text-white',
          style: { background: 'linear-gradient(135deg, #550776, #7c3aed)' },
        }, 'Aplicar'),
        h('p', { className: 'text-xs text-slate-400 ml-auto' }, 'O período vale pra tudo nesta tela.')
      ),

      loading && !dados && h('div', { className: 'flex items-center justify-center py-24' },
        h('div', { className: 'w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin' })
      ),

      dados && h(React.Fragment, null,
        // ── KPIs ──
        h('div', { className: `grid grid-cols-2 lg:grid-cols-5 gap-3 mb-3 transition-opacity ${loading ? 'opacity-40' : ''}` },
          h('div', { className: 'bg-white border border-slate-200 rounded-2xl p-4' },
            h('p', { className: 'text-[10px] font-bold tracking-widest text-slate-400 uppercase' }, 'Tentativas'),
            h('p', { className: 'text-[30px] font-bold mt-1.5 text-slate-900', style: { fontVariantNumeric: 'tabular-nums' } }, anlNum(total)),
            h('p', { className: 'text-[11px] mt-1' },
              delta === null
                ? h('span', { className: 'text-slate-300' }, 'sem período anterior')
                : h(React.Fragment, null,
                    h('span', { className: `font-semibold ${delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}` },
                      `${delta >= 0 ? '↑' : '↓'} ${Math.abs(delta)}%`),
                    h('span', { className: 'text-slate-400' }, ' vs. período anterior')
                  )
            )
          ),
          KPIS.map(kpi => h('div', { key: kpi.k, className: 'bg-white border border-slate-200 rounded-2xl p-4' },
            h('div', { className: 'flex items-center gap-1.5' },
              h('span', { className: 'w-1.5 h-1.5 rounded-full', style: { background: kpi.cor } }),
              h('p', { className: 'text-[10px] font-bold tracking-widest text-slate-400 uppercase' }, kpi.label)
            ),
            h('p', { className: 'text-[30px] font-bold mt-1.5 text-slate-900', style: { fontVariantNumeric: 'tabular-nums' } }, anlNum(t[kpi.k])),
            h('p', { className: 'text-[11px] text-slate-400 mt-1' }, kpi.nota)
          ))
        ),

        // ── Composição ──
        h('div', { className: 'bg-white border border-slate-200 rounded-2xl p-4 mb-6' },
          h('div', { className: 'flex items-center justify-between mb-2.5' },
            h('p', { className: 'text-[10px] font-bold tracking-widest text-slate-400 uppercase' }, 'Composição do período'),
            h('p', { className: 'text-[11px] text-slate-400' }, 'soma 100% — nenhuma tentativa fica de fora')
          ),
          h('div', { className: 'flex h-2.5 rounded-full overflow-hidden bg-slate-100 gap-[2px]' },
            comp.map(c => (t[c.k] > 0) && h('div', {
              key: c.k,
              className: 'transition-all duration-300',
              style: { width: `${(t[c.k] / (somaComp || 1)) * 100}%`, background: c.cor },
              title: `${c.k}: ${anlNum(t[c.k])}`,
            }))
          ),
          t.bloqueadas > 0 && h('p', { className: 'text-[11px] text-slate-400 mt-2' },
            h('span', { className: 'inline-block w-2 h-2 rounded-sm mr-1.5 align-middle', style: { background: '#a78bfa' } }),
            `${anlNum(t.bloqueadas)} de cliente bloqueado (não passam pela validação)`)
        ),

        // ── Série temporal ──
        h('div', { className: 'bg-white border border-slate-200 rounded-2xl p-5 mb-3' },
          h('div', { className: 'flex items-start justify-between mb-4 flex-wrap gap-2' },
            h('div', null,
              h('p', { className: 'text-[13px] font-bold text-slate-900' },
                pontos.length !== dias.length ? 'Tentativas por semana' : 'Tentativas por dia'),
              h('p', { className: 'text-[11px] text-slate-400 mt-0.5' }, 'empilhado por desfecho')
            ),
            h('div', { className: 'flex gap-3 text-[11px] text-slate-500' },
              [['#10b981', 'Corrigidas'], ['#f43f5e', 'Barradas'], ['#f59e0b', 'Falhas']].map(([c, l]) =>
                h('span', { key: l, className: 'flex items-center gap-1.5' },
                  h('span', { className: 'w-2 h-2 rounded-sm', style: { background: c } }), l)
              )
            )
          ),
          pontos.length === 0
            ? h('p', { className: 'text-sm text-slate-400 text-center py-10' }, 'Sem tentativas no período.')
            : h('svg', { viewBox: `0 0 ${W} ${H + 24}`, className: 'w-full', style: { overflow: 'visible' } },
                [0, 0.25, 0.5, 0.75, 1].map(f => h(React.Fragment, { key: f },
                  h('line', { x1: 0, y1: H - f * H, x2: W, y2: H - f * H, stroke: '#f1f5f9' }),
                  h('text', { x: W, y: H - f * H - 3, fontSize: 9, fill: '#cbd5e1', textAnchor: 'end' }, Math.round(maxY * f))
                )),
                pontos.map((p, i) => {
                  const x = i * (bw + GAP);
                  const hOk = (p.corrigidas / maxY) * H;
                  const hBa = (p.barradas / maxY) * H;
                  const hFa = (p.falhas / maxY) * H;
                  return h(React.Fragment, { key: p.dia },
                    h('rect', { x, y: H - hOk, width: bw, height: hOk, fill: '#10b981' },
                      h('title', null, `${anlDM(p.dia)} — ${p.corrigidas} corrigidas`)),
                    h('rect', { x, y: H - hOk - hBa, width: bw, height: hBa, fill: '#f43f5e' },
                      h('title', null, `${anlDM(p.dia)} — ${p.barradas} barradas`)),
                    h('rect', { x, y: H - hOk - hBa - hFa, width: bw, height: hFa, fill: '#f59e0b' },
                      h('title', null, `${anlDM(p.dia)} — ${p.falhas} falhas`)),
                    (i % passo === 0) && h('text', {
                      x: x + bw / 2, y: H + 16, fontSize: 10, fill: '#94a3b8', textAnchor: 'middle',
                    }, anlDM(p.dia))
                  );
                })
              )
        ),

        h('div', { className: 'grid lg:grid-cols-2 gap-3 mb-3' },
          // ── Onde as tentativas morrem ──
          h('div', { className: 'bg-white border border-slate-200 rounded-2xl p-5' },
            h('p', { className: 'text-[13px] font-bold text-slate-900' }, 'Onde as tentativas morrem'),
            h('p', { className: 'text-[11px] text-slate-400 mt-0.5 mb-4' }, 'decide o que consertar primeiro'),
            fases.length === 0
              ? h('p', { className: 'text-sm text-slate-400 py-6 text-center' }, 'Nenhuma tentativa perdida no período.')
              : h('div', { className: 'space-y-3' },
                  fases.map(f => {
                    // FASES_EXPLICADAS_V1: chave desconhecida vira rotulo cru, sem
                    // explicacao e sem etiqueta. Melhor um rotulo feio que um errado.
                    const meta   = ANL_FASES[f.fase];
                    const rotulo = meta ? meta[0] : f.fase;
                    const expl   = meta ? meta[1] : null;
                    const culpa  = meta ? ANL_CULPA[meta[2]] : null;
                    return h('div', { key: f.fase },
                      h('div', { className: 'flex justify-between items-baseline gap-2 mb-1' },
                        h('div', { className: 'flex items-center gap-2 min-w-0' },
                          h('span', { className: 'text-[12px] text-slate-700 font-medium' }, rotulo),
                          culpa && h('span', {
                            className: `text-[9px] font-bold uppercase tracking-wide px-1.5 py-[1px] rounded border flex-shrink-0 ${culpa[1]}`,
                          }, culpa[0])
                        ),
                        h('span', {
                          className: 'text-[12px] font-semibold text-slate-900 flex-shrink-0',
                          style: { fontVariantNumeric: 'tabular-nums' },
                        },
                          anlNum(f.total),
                          h('span', { className: 'text-slate-400 font-normal' },
                            ` ${anlPct(f.total, fases.reduce((s, x) => s + x.total, 0))}%`)
                        )
                      ),
                      h('div', { className: 'h-1.5 bg-slate-100 rounded-full overflow-hidden' },
                        h('div', {
                          className: 'h-full rounded-full transition-all duration-300',
                          style: { width: `${(f.total / maxFase) * 100}%`, background: '#7c3aed' },
                        })
                      ),
                      // A chave crua e a explicacao na MESMA linha: a chave voce precisa
                      // pra escrever SQL, a explicacao pra entender o ranking. Duas
                      // linhas separadas dobrariam a altura do bloco por nada.
                      h('p', { className: 'text-[10px] text-slate-400 mt-1 leading-relaxed' },
                        h('span', { className: 'font-mono text-slate-500' }, f.fase),
                        expl && h('span', null, ' · ', expl)
                      )
                    );
                  })
                )
          ),

          // ── Precisão do GPS ──
          h('div', { className: 'bg-white border border-slate-200 rounded-2xl p-5' },
            h('p', { className: 'text-[13px] font-bold text-slate-900' }, 'Precisão do GPS'),
            h('p', { className: 'text-[11px] text-slate-400 mt-0.5 mb-4' }, 'diz se o limite de 60m está apertado demais'),
            gpsTot === 0
              ? h('p', { className: 'text-sm text-slate-400 py-6 text-center leading-relaxed' },
                  'Nenhuma tentativa com precisão registrada.',
                  h('br'),
                  h('span', { className: 'text-xs' }, 'O app precisa mandar motoboy_accuracy (FRONT_ACCURACY_V1).'))
              : h(React.Fragment, null,
                  h('div', { className: 'space-y-2.5' },
                    ANL_GPS_FAIXAS.map(([k, label, ruim]) => {
                      const n = gpsF[k] || 0;
                      return h('div', { key: k },
                        h('div', { className: 'flex justify-between items-baseline mb-1' },
                          h('span', { className: 'text-[12px] text-slate-700' }, label,
                            ruim && h('span', { className: 'text-[10px] text-rose-500 font-medium ml-1.5' }, 'acima do limite')),
                          h('span', { className: 'text-[12px] font-semibold text-slate-900', style: { fontVariantNumeric: 'tabular-nums' } },
                            `${anlPct(n, gpsTot)}%`)
                        ),
                        h('div', { className: 'h-1.5 bg-slate-100 rounded-full overflow-hidden' },
                          h('div', {
                            className: 'h-full rounded-full transition-all duration-300',
                            style: { width: `${anlPct(n, gpsTot)}%`, background: ruim ? '#f43f5e' : '#0f172a', opacity: ruim ? 1 : 0.75 },
                          })
                        )
                      );
                    })
                  ),
                  h('div', { className: 'mt-4 pt-3 border-t border-slate-100 flex items-baseline gap-2' },
                    h('span', { className: 'text-[10px] font-bold tracking-widest text-slate-400 uppercase' }, 'Mediana'),
                    h('span', { className: 'text-lg font-bold text-slate-900', style: { fontVariantNumeric: 'tabular-nums' } },
                      dados.gps.mediana === null ? '—' : dados.gps.mediana),
                    h('span', { className: 'text-[11px] text-slate-400' }, 'metros de erro')
                  )
                )
          )
        ),

        // ── Profissionais ──
        h('div', { className: 'bg-white border border-slate-200 rounded-2xl overflow-hidden' },
          h('div', { className: 'px-5 py-4 border-b border-slate-100' },
            h('p', { className: 'text-[13px] font-bold text-slate-900' }, 'Profissionais'),
            h('p', { className: 'text-[11px] text-slate-400 mt-0.5' },
              'ordenado por volume · ',
              h('span', { className: 'text-rose-600 font-medium' }, '▲'),
              ' marca aproveitamento abaixo de 60% com 10+ tentativas')
          ),
          profs.length === 0
            ? h('p', { className: 'text-sm text-slate-400 text-center py-10' }, 'Nenhuma tentativa no período.')
            : h('div', { className: 'overflow-x-auto' },
                h('table', { className: 'w-full text-[13px]' },
                  h('thead', null,
                    h('tr', { className: 'border-b border-slate-100 bg-slate-50/60' },
                      ['Profissional', 'Tentativas', 'Corrigidas', 'Barradas', 'Falhas', 'Aproveitamento'].map((c, i) =>
                        h('th', {
                          key: c,
                          className: `px-3 py-2.5 text-[10px] font-bold tracking-widest text-slate-400 uppercase ${i === 0 ? 'text-left' : 'text-right'}`,
                        }, c)
                      )
                    )
                  ),
                  h('tbody', null,
                    profs.map((p, i) => {
                      const apr  = p.total ? p.corrigidas / p.total : 0;
                      // Fora da curva = aproveitamento ruim COM volume. Volume alto
                      // e aproveitamento bom nao e red flag, e um cara que trabalha
                      // muito — o bloco vermelho antigo acusava os dois igual.
                      const flag = apr < 0.6 && p.total >= 10;
                      return h('tr', { key: i, className: 'border-b border-slate-50 hover:bg-slate-50 transition' },
                        h('td', { className: 'px-3 py-2.5' },
                          h('div', { className: 'flex items-center gap-2' },
                            flag
                              ? h('span', { className: 'text-rose-600 text-[10px]', title: 'aproveitamento fora da curva' }, '▲')
                              : h('span', { className: 'inline-block w-[10px]' }),
                            h('div', null,
                              h('div', { className: 'font-medium text-slate-900' }, p.usuario_nome || '—'),
                              h('div', { className: 'text-[11px] text-slate-400 font-mono' }, p.cod_profissional || '—')
                            )
                          )
                        ),
                        h('td', { className: 'px-3 py-2.5 text-right font-semibold', style: { fontVariantNumeric: 'tabular-nums' } }, anlNum(p.total)),
                        h('td', { className: 'px-3 py-2.5 text-right text-slate-600', style: { fontVariantNumeric: 'tabular-nums' } }, anlNum(p.corrigidas)),
                        h('td', { className: 'px-3 py-2.5 text-right text-slate-600', style: { fontVariantNumeric: 'tabular-nums' } }, anlNum(p.barradas)),
                        h('td', { className: 'px-3 py-2.5 text-right text-slate-600', style: { fontVariantNumeric: 'tabular-nums' } }, anlNum(p.falhas)),
                        h('td', { className: 'px-3 py-2.5' },
                          h('div', { className: 'flex items-center gap-2 justify-end' },
                            h('div', { className: 'w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden' },
                              h('div', { className: 'h-full rounded-full', style: { width: `${apr * 100}%`, background: flag ? '#f43f5e' : '#0f172a' } })
                            ),
                            h('span', { className: 'text-[12px] font-semibold w-9 text-right', style: { fontVariantNumeric: 'tabular-nums' } },
                              `${Math.round(apr * 100)}%`)
                          )
                        )
                      );
                    })
                  )
                )
              )
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
      ? [
          { id: 'historico',   label: '📋 Histórico' },
          { id: 'liberacoes',  label: '🔓 Liberação de OS' },  // 2026-04 v3
          { id: 'analytics',   label: '📊 Analytics' },
          { id: 'bloqueados',  label: '🚫 Clientes Bloqueados' }, // 2026-07
        ]
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
              h('div', { style: { display: aba === 'liberacoes' ? 'block' : 'none' } },
                h(TabLiberacoes, { API_URL, fetchAuth, showToast })
              ),
              h('div', { style: { display: aba === 'analytics' ? 'block' : 'none' } },
                h(TabAnalytics, { API_URL, fetchAuth, showToast })
              ),
              h('div', { style: { display: aba === 'bloqueados' ? 'block' : 'none' } },
                h(TabClientesBloqueados, { API_URL, fetchAuth, showToast })
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

  // ── ABA: Clientes Bloqueados (admin) — 2026-07 ──────────────────────────────
  function TabClientesBloqueados({ API_URL, fetchAuth, showToast }) {
    const [lista, setLista]           = useState([]);
    const [loading, setLoading]       = useState(true);
    const [nomeLoja, setNomeLoja]     = useState('');
    const [endereco, setEndereco]     = useState('');
    const [salvando, setSalvando]     = useState(false);
    const [numeroSuporte, setNumeroSuporte] = useState('');
    const [editandoNum, setEditandoNum]     = useState(false);

    const carregar = async () => {
      setLoading(true);
      try {
        const res = await fetchAuth(`${API_URL}/agent/clientes-bloqueados`);
        const data = await res.json();
        setLista(data.clientes || []);
        const rs = await fetchAuth(`${API_URL}/agent/clientes-bloqueados-suporte`);
        const ds = await rs.json();
        setNumeroSuporte(ds.numero_suporte || '');
      } catch (e) {
        showToast('Erro ao carregar clientes bloqueados', 'error');
      }
      setLoading(false);
    };
    useEffect(() => { carregar(); }, []);

    const adicionar = async () => {
      if (!nomeLoja.trim() || !endereco.trim()) { showToast('Preencha nome e endereço', 'error'); return; }
      setSalvando(true);
      try {
        const res = await fetchAuth(`${API_URL}/agent/clientes-bloqueados`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome_loja: nomeLoja.trim(), endereco: endereco.trim() }),
        });
        const data = await res.json();
        if (!res.ok) { showToast(data.erro || 'Erro ao cadastrar', 'error'); }
        else { setNomeLoja(''); setEndereco(''); showToast('Cliente bloqueado cadastrado', 'success'); carregar(); }
      } catch (e) { showToast('Falha de conexão', 'error'); }
      setSalvando(false);
    };

    const alternar = async (c) => {
      try {
        await fetchAuth(`${API_URL}/agent/clientes-bloqueados/${c.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ativo: !c.ativo }),
        });
        carregar();
      } catch (e) { showToast('Erro ao atualizar', 'error'); }
    };

    const excluir = async (c) => {
      if (!window.confirm(`Excluir "${c.nome_loja}" da lista de bloqueados?`)) return;
      try {
        await fetchAuth(`${API_URL}/agent/clientes-bloqueados/${c.id}`, { method: 'DELETE' });
        showToast('Removido', 'success'); carregar();
      } catch (e) { showToast('Erro ao excluir', 'error'); }
    };

    const salvarNumero = async () => {
      try {
        const res = await fetchAuth(`${API_URL}/agent/clientes-bloqueados-suporte`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ numero_suporte: numeroSuporte }),
        });
        const data = await res.json();
        if (!res.ok) { showToast(data.erro || 'Número inválido', 'error'); }
        else { setNumeroSuporte(data.numero_suporte); setEditandoNum(false); showToast('Número salvo', 'success'); }
      } catch (e) { showToast('Falha de conexão', 'error'); }
    };

    return h('div', { className: 'max-w-3xl mx-auto px-4 py-6' },
      h('div', { className: 'mb-6' },
        h('h2', { className: 'text-lg font-bold text-gray-800 mb-1' }, '🚫 Clientes Bloqueados para Ajuste'),
        h('p', { className: 'text-sm text-gray-500' }, 'Corridas cujo Ponto 1 bater com um destes clientes NÃO poderão ser ajustadas pelo motoboy.')
      ),
      h('div', { className: 'bg-white border border-gray-200 rounded-xl p-4 mb-5 flex items-center gap-3 flex-wrap' },
        h('span', { className: 'text-sm font-semibold text-gray-700' }, '💬 Nº do suporte:'),
        editandoNum
          ? h(React.Fragment, null,
              h('input', { value: numeroSuporte, onChange: (e) => setNumeroSuporte(e.target.value), className: 'border rounded-lg px-3 py-1.5 text-sm flex-1', placeholder: '5571XXXXXXXX' }),
              h('button', { onClick: salvarNumero, className: 'px-3 py-1.5 rounded-lg text-white text-sm font-semibold', style: { background: '#16a34a' } }, 'Salvar')
            )
          : h(React.Fragment, null,
              h('span', { className: 'text-sm text-gray-800 font-mono flex-1' }, numeroSuporte || '—'),
              h('button', { onClick: () => setEditandoNum(true), className: 'text-sm text-purple-700 font-semibold' }, 'Editar')
            )
      ),
      h('div', { className: 'bg-white border border-gray-200 rounded-xl p-4 mb-5' },
        h('div', { className: 'grid gap-3' },
          h('input', { value: nomeLoja, onChange: (e) => setNomeLoja(e.target.value), placeholder: 'Nome da loja/cliente (ex: Abobrinha)', className: 'border rounded-lg px-3 py-2 text-sm' }),
          h('input', { value: endereco, onChange: (e) => setEndereco(e.target.value), placeholder: 'Endereço do Ponto 1', className: 'border rounded-lg px-3 py-2 text-sm' }),
          h('button', { onClick: adicionar, disabled: salvando, className: 'px-4 py-2 rounded-lg text-white text-sm font-semibold', style: { background: 'linear-gradient(135deg, #550776, #7c3aed)' } }, salvando ? 'Salvando...' : '+ Adicionar cliente')
        )
      ),
      loading
        ? h('p', { className: 'text-sm text-gray-400 text-center py-6' }, 'Carregando...')
        : (lista.length === 0
            ? h('p', { className: 'text-sm text-gray-400 text-center py-6' }, 'Nenhum cliente bloqueado cadastrado.')
            : h('div', { className: 'space-y-2' },
                lista.map((c) => h('div', {
                  key: c.id,
                  className: `bg-white border rounded-xl p-3 flex items-center gap-3 ${c.ativo ? 'border-red-200' : 'border-gray-200 opacity-60'}`,
                },
                  h('div', { className: 'flex-1 min-w-0' },
                    h('p', { className: 'text-sm font-semibold text-gray-800 truncate' }, c.nome_loja),
                    h('p', { className: 'text-xs text-gray-500 truncate' }, c.endereco)
                  ),
                  h('button', {
                    onClick: () => alternar(c),
                    className: `text-xs px-2.5 py-1 rounded-lg font-semibold ${c.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`,
                  }, c.ativo ? 'Ativo' : 'Inativo'),
                  h('button', { onClick: () => excluir(c), className: 'text-xs px-2 py-1 text-red-600 font-semibold' }, '🗑')
                ))
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
