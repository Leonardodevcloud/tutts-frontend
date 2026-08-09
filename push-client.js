// push-client.js - helper de Web Push (baixo nivel, sem auth). O React faz os
// fetches autenticados; aqui so lida com permissao + inscricao no navegador.
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
  var TuttsPush = {
    suportado: function () {
      return ('serviceWorker' in navigator) && ('PushManager' in window) && ('Notification' in window);
    },
    // iOS so aceita push se o PWA estiver instalado na tela inicial
    precisaInstalarPWA: function () { return isIOS() && !isStandalone(); },
    permissao: function () { return ('Notification' in window) ? Notification.permission : 'unsupported'; },
    assinaturaAtual: async function () {
      if (!this.suportado()) return null;
      var reg = await navigator.serviceWorker.ready;
      return reg.pushManager.getSubscription();
    },
    // pede permissao e cria a inscricao. Retorna o objeto subscription (JSON).
    assinar: async function (vapidPublicKey) {
      if (!this.suportado()) throw new Error('Este navegador nao suporta notificacoes push.');
      if (this.precisaInstalarPWA()) throw new Error('No iPhone, instale o app na Tela de Inicio primeiro (Compartilhar > Adicionar a Tela de Inicio).');
      var perm = await Notification.requestPermission();
      if (perm !== 'granted') throw new Error('Voce negou a permissao de notificacao.');
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
  window.TuttsPush = TuttsPush;
})();
