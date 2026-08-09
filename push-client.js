// push-client.js v2 - Web Push helper + auto-ativacao no login.
// A ativacao acontece quando o motoboy entra (nao numa tela perdida). A cada
// login/entrada, re-registra a inscricao com o cod atual (self-heal do cod).
// Usa window.fetchAuth / window.API_URL (globais do app) e o usuario logado
// de sessionStorage.tutts_user. Nao depende do React.
(function () {
  function b64ToUint8(base64) {
    var pad = '='.repeat((4 - (base64.length % 4)) % 4);
    var b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(b64);
    var arr = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }
  function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent); }
  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  }
  function lerUser() {
    try { return JSON.parse(sessionStorage.getItem('tutts_user') || 'null'); } catch (e) { return null; }
  }

  var TuttsPush = {
    suportado: function () {
      return ('serviceWorker' in navigator) && ('PushManager' in window) && ('Notification' in window);
    },
    precisaInstalarPWA: function () { return isIOS() && !isStandalone(); },
    permissao: function () { return ('Notification' in window) ? Notification.permission : 'unsupported'; },
    assinaturaAtual: async function () {
      if (!this.suportado()) return null;
      var reg = await navigator.serviceWorker.ready;
      return reg.pushManager.getSubscription();
    },
    assinar: async function (vapidPublicKey) {
      if (!this.suportado()) throw new Error('Este navegador nao suporta notificacoes push.');
      if (this.precisaInstalarPWA()) throw new Error('No iPhone, instale o app na Tela de Inicio primeiro.');
      var perm = await Notification.requestPermission();
      if (perm !== 'granted') throw new Error('Permissao de notificacao negada.');
      var reg = await navigator.serviceWorker.ready;
      var sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: b64ToUint8(vapidPublicKey),
        });
      }
      return sub.toJSON();
    },
    cancelar: async function () {
      var sub = await this.assinaturaAtual();
      if (sub) { var ep = sub.endpoint; try { await sub.unsubscribe(); } catch (e) {} return ep; }
      return null;
    },
  };

  // ---------- backend helpers (usam globais do app) ----------
  var _vapidKey = null;
  async function getVapidKey() {
    if (_vapidKey) return _vapidKey;
    if (!window.fetchAuth || !window.API_URL) return null;
    try {
      var r = await window.fetchAuth(window.API_URL + '/push/vapid-public');
      var d = await r.json();
      _vapidKey = d && d.key ? d.key : null;
      return _vapidKey;
    } catch (e) { return null; }
  }
  async function postSubscribe(subJson, cod) {
    if (!window.fetchAuth || !window.API_URL) return false;
    try {
      var r = await window.fetchAuth(window.API_URL + '/push/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subJson, cod_profissional: cod || null }),
      });
      return r.ok;
    } catch (e) { return false; }
  }

  // ---------- banner de primeira ativacao ----------
  function removerBanner() {
    var el = document.getElementById('tutts-push-banner');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }
  function mostrarBanner(cod) {
    if (document.getElementById('tutts-push-banner')) return;
    var wrap = document.createElement('div');
    wrap.id = 'tutts-push-banner';
    wrap.setAttribute('style', [
      'position:fixed', 'left:12px', 'right:12px', 'bottom:12px', 'z-index:99999',
      'background:#4D0669', 'color:#fff', 'border-radius:14px', 'padding:14px 16px',
      'box-shadow:0 8px 30px rgba(0,0,0,.35)', 'font-family:Inter,-apple-system,sans-serif',
      'display:flex', 'gap:12px', 'align-items:center', 'max-width:520px', 'margin:0 auto',
    ].join(';'));
    var txt = document.createElement('div');
    txt.style.flex = '1';
    txt.innerHTML = '<div style="font-weight:700;font-size:14px;margin-bottom:2px">Ativar notificacoes</div>'
      + '<div style="font-size:12.5px;opacity:.9">Receba avisos de rota, ajustes, score e mensagens.</div>';
    var btnSim = document.createElement('button');
    btnSim.textContent = 'Ativar';
    btnSim.setAttribute('style', 'background:#f67602;color:#fff;border:0;border-radius:10px;padding:9px 16px;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap');
    var btnNao = document.createElement('button');
    btnNao.textContent = 'Agora nao';
    btnNao.setAttribute('style', 'background:transparent;color:#fff;border:0;font-size:12px;opacity:.75;cursor:pointer;white-space:nowrap');
    btnSim.onclick = async function () {
      btnSim.disabled = true; btnSim.textContent = 'Ativando...';
      try {
        var key = await getVapidKey();
        if (!key) { btnSim.textContent = 'Indisponivel'; return; }
        var subJson = await TuttsPush.assinar(key);
        await postSubscribe(subJson, cod);
        removerBanner();
      } catch (e) {
        btnSim.disabled = false; btnSim.textContent = 'Ativar';
        // se negou a permissao, some com o banner (nao insiste)
        if (TuttsPush.permissao() === 'denied') removerBanner();
      }
    };
    btnNao.onclick = function () {
      removerBanner();
      // nao pergunta de novo nesta sessao
      try { sessionStorage.setItem('tutts_push_adiado', '1'); } catch (e) {}
    };
    wrap.appendChild(txt); wrap.appendChild(btnSim); wrap.appendChild(btnNao);
    document.body.appendChild(wrap);
  }

  // ---------- sincronizacao (chamada no login/entrada e ao focar) ----------
  var _sincronizando = false;
  async function sincronizar() {
    if (_sincronizando) return;
    _sincronizando = true;
    try {
      if (!TuttsPush.suportado()) return;
      var user = lerUser();
      if (!user || user.role !== 'user' || !user.codProfissional) return; // so motoboy logado
      if (TuttsPush.precisaInstalarPWA()) return; // iOS sem PWA nao recebe push
      var perm = TuttsPush.permissao();
      if (perm === 'granted') {
        // ja permitido: garante inscricao e RE-REGISTRA o cod (self-heal a cada login)
        var key = await getVapidKey();
        if (!key) return;
        var subJson = await TuttsPush.assinar(key); // reusa inscricao existente, sem prompt
        await postSubscribe(subJson, user.codProfissional);
        removerBanner();
      } else if (perm === 'default') {
        // ainda nao decidiu: pede (precisa de gesto -> banner com botao)
        if (sessionStorage.getItem('tutts_push_adiado') !== '1') mostrarBanner(user.codProfissional);
      }
      // 'denied' -> nao insiste
    } catch (e) { /* silencioso */ }
    finally { _sincronizando = false; }
  }

  // dispara no carregamento: espera o app logar (tutts_user + fetchAuth) e sincroniza.
  function iniciar() {
    var tentativas = 0;
    var timer = setInterval(function () {
      tentativas++;
      var user = lerUser();
      if (user && window.fetchAuth && window.API_URL) {
        clearInterval(timer);
        sincronizar();
      } else if (tentativas > 30) {
        clearInterval(timer); // ~60s sem login: desiste (provavelmente tela de login)
      }
    }, 2000);
    // re-sincroniza ao voltar o foco (renova o cod em novos logins/sessoes)
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') sincronizar();
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else { iniciar(); }

  TuttsPush.sincronizar = sincronizar; // exposto pro app chamar apos login, se quiser
  window.TuttsPush = TuttsPush;
})();
