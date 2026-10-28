/* LOCACAO_V2: "Minha moto" — área do locatário DENTRO da Central (mesmo login e app).
   - window.ModuloMinhaMotoComponent: tela cheia do locatário (role 'locatario') ou módulo do
     motoboy Tutts com moto alugada (role 'user', id 'minha-moto', embutido).
   - window.MinhaMotoCard: card compacto para a home do motoboy (some se não houver contrato).
   - window.LocPrimeiroAcesso: modal do 1º acesso do locatário na tela de login (CPF → código → senha).
   API: ${API_URL}/locacao-minha (Bearer da Central) e ${API_URL}/locacao-publico/primeiro-acesso/*. */
(function () {
  'use strict';
  var h = React.createElement;
  var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef, useCallback = React.useCallback;
  var ROXO = '#770fa8', ROXO_ESC = '#5d0b85';
  var DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var POSICOES = [['frente', 'Frente'], ['traseira', 'Traseira'], ['lateral_esq', 'Lateral esq.'], ['lateral_dir', 'Lateral dir.'], ['painel', 'Painel/hodômetro'], ['motor_chassi', 'Motor/chassi']]; // LOCACAO_V3: Anexo IV
  var TIPOS_VIST = [['retirada', 'Retirada'], ['revisao', 'Revisão'], ['periodica', 'Periódica'], ['devolucao', 'Devolução']];
  var TONS = { verde: ['#f0fdf4', '#166534'], ambar: ['#fffbeb', '#92400e'], vermelho: ['#fef2f2', '#991b1b'], azul: ['#eff6ff', '#1e40af'], roxo: ['#f3e8fb', '#5d0b85'], cinza: ['#f3f4f6', '#374151'] };
  var TOM_PARC = { a_vencer: 'azul', vence_hoje: 'azul', atrasada: 'vermelho', paga: 'verde', cancelada: 'cinza', em_aberto: 'ambar', suspensa: 'cinza' };
  var TOM_SIT = { em_dia: 'verde', atrasada: 'ambar', em_retomada: 'vermelho', quitado: 'roxo', aguardando_assinatura: 'azul', encerrado: 'cinza', suspenso: 'azul' };
  var TOM_VIST = { aguardando: 'ambar', aprovada: 'verde', com_avaria: 'vermelho' };
  var ROT_VIST = { aguardando: 'Em análise', aprovada: 'Aprovada', com_avaria: 'Com avaria' };
  var TOM_AVISO = { aberto: 'ambar', em_atendimento: 'azul', resolvido: 'verde' };
  var TIPOS_AVISO = [['pneu', 'Pneu furado', 'target'], ['pane', 'Pane / não liga', 'zap'], ['batida', 'Batida', 'alert'], ['roubo', 'Roubo ou furto', 'shield'], ['outro', 'Outro', 'help']];

  // ───── estilo (prefixo mm-) ─────
  var CSS = [
    '.mm{font-family:Inter,system-ui,-apple-system,sans-serif;color:#111827;font-size:14px;background:#f9fafb;min-height:100vh}',
    '.mm *{box-sizing:border-box}',
    '.mm button{font:inherit;cursor:pointer;border:0;background:none;color:inherit}',
    '.mm button:disabled{cursor:not-allowed}',
    '.mm input,.mm textarea{font:inherit;color:#111827}',
    '.mm-wrap{max-width:520px;margin:0 auto;min-height:100vh;display:flex;flex-direction:column}',
    '.mm-top{background:linear-gradient(110deg,#26093a,#3a1556 55%,#5d0b85);color:#fff;padding:12px 16px;display:flex;align-items:center;gap:10px;position:sticky;top:0;z-index:20}',
    '.mm-logo{width:34px;height:34px;border-radius:9px;background:#fff;color:#5d0b85;display:grid;place-items:center;font-family:Sora,Inter,sans-serif;font-weight:800;font-size:16px;flex:none}',
    '.mm-av{width:32px;height:32px;border-radius:99px;background:#f3e8fb;color:#5d0b85;font-weight:700;font-size:12px;display:grid;place-items:center}',
    '.mm-main{padding:16px 16px 96px;display:flex;flex-direction:column;gap:12px;flex:1}',
    '.mm-card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:12px}',
    '.mm-h1{margin:0;font-family:Sora,Inter,sans-serif;font-size:21px;font-weight:700}',
    '.mm-sub{margin:0;color:#6b7280;font-size:13px;line-height:1.45}',
    '.mm-sora{font-family:Sora,Inter,sans-serif}',
    '.mm-mono{font-family:ui-monospace,Menlo,monospace}',
    '.mm-num{font-variant-numeric:tabular-nums}',
    '.mm-btn{height:48px;border-radius:12px;font-weight:700;font-size:15px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 16px;width:100%}',
    '.mm-btn.pri{background:#770fa8;color:#fff}',
    '.mm-btn.pri:disabled{background:#d8b4f0}',
    '.mm-btn.sec{background:#fff;color:#374151;border:1px solid #e5e7eb}',
    '.mm-btn.out{background:#fff;color:#5d0b85;border:1.5px solid #770fa8}',
    '.mm-lnk{color:#770fa8;font-weight:600;font-size:13px;padding:0;display:inline-flex;align-items:center;gap:4px}',
    '.mm-pill{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;padding:3px 9px;border-radius:99px;white-space:nowrap}',
    '.mm-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:11px 0;border-top:1px solid #f3f4f6;font-size:13.5px}',
    '.mm-inp{height:46px;padding:0 12px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;width:100%;min-width:0;font-size:15px}',
    'textarea.mm-inp{height:auto;padding:10px 12px;resize:vertical;line-height:1.45}',
    '.mm-inp:focus{outline:none;border-color:#770fa8;box-shadow:0 0 0 3px #f3e8fb}',
    '.mm-seg{display:grid;gap:8px}',
    '.mm-seg button{height:44px;border-radius:10px;font-weight:600;color:#374151;font-size:13.5px;border:1px solid #e5e7eb;background:#fff}',
    '.mm-seg button[aria-checked="true"]{border:1.5px solid #770fa8;color:#5d0b85;background:#faf7fd;font-weight:700}',
    '.mm-seg.perigo button[aria-checked="true"]{border-color:#dc2626;color:#991b1b;background:#fef2f2}',
    '.mm-nav{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid #e5e7eb;z-index:20}',
    '.mm-nav>div{max-width:520px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);padding:6px 4px calc(6px + env(safe-area-inset-bottom))}',
    '.mm-nav button{display:flex;flex-direction:column;align-items:center;gap:3px;font-size:11px;color:#6b7280;padding:6px 0}',
    '.mm-nav button[aria-current="page"]{color:#770fa8;font-weight:700}',
    '.mm-foto{aspect-ratio:1/1;border-radius:12px;position:relative;overflow:hidden;display:grid;place-items:center;width:100%}',
    '.mm-foto img{width:100%;height:100%;object-fit:cover;display:block}',
    '.mm-ov{position:fixed;inset:0;background:rgba(17,24,39,.45);z-index:90;display:flex;align-items:flex-end;justify-content:center}',
    '.mm-sheet{background:#fff;width:100%;max-width:520px;max-height:90vh;overflow:auto;border-radius:18px 18px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom))}',
    '@media(min-width:640px){.mm-ov{align-items:center}.mm-sheet{border-radius:18px}}',
    '.mm-spin{width:28px;height:28px;border-radius:99px;border:3px solid #e9d5f9;border-top-color:#770fa8;animation:mmsp .8s linear infinite}',
    '@keyframes mmsp{to{transform:rotate(360deg)}}',
    '@media (prefers-reduced-motion: reduce){.mm-spin{animation-duration:2s}}',
    '.mm-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}',
    '.mm :focus-visible{outline:2px solid #770fa8;outline-offset:2px}',
    '.mm-toast{position:fixed;left:50%;bottom:84px;transform:translateX(-50%);background:#111827;color:#fff;padding:10px 14px;border-radius:10px;font-size:13px;z-index:95;max-width:90vw;box-shadow:0 8px 24px rgba(0,0,0,.2)}',
    '.mm-range{width:100%;accent-color:#770fa8}'
  ].join('\n');
  function injetarCss() {
    if (typeof document === 'undefined' || document.getElementById('mm-css-v2')) return;
    var st = document.createElement('style'); st.id = 'mm-css-v2'; st.textContent = CSS; document.head.appendChild(st);
  }

  // ───── utilitários ─────
  function ico(nome, s, extra) { return h('svg', { className: 'ico', 'aria-hidden': 'true', style: Object.assign({ width: s || 18, height: s || 18, fontSize: s || 18, flex: 'none' }, extra || {}) }, h('use', { href: '#i-' + nome })); }
  function pontos(s) { return h('svg', { width: s || 22, height: s || 22, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': 'true' }, h('circle', { cx: 5, cy: 12, r: 1.8 }), h('circle', { cx: 12, cy: 12, r: 1.8 }), h('circle', { cx: 19, cy: 12, r: 1.8 })); }
  function dig(s) { return String(s || '').replace(/\D/g, ''); }
  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function fR(v) { return 'R$ ' + num(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function pd(s) { if (!s) return null; if (s instanceof Date) return s; var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s)); if (m) return new Date(+m[1], +m[2] - 1, +m[3]); var d = new Date(s); return isNaN(d) ? null : d; }
  function fD(s) { var d = pd(s); return d ? p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear() : '—'; }
  function fDC(s) { var d = pd(s); return d ? p2(d.getDate()) + '/' + p2(d.getMonth() + 1) : '—'; }
  function fDS(s) { var d = pd(s); return d ? DIAS[d.getDay()] + ', ' + fDC(d) : '—'; }
  function fHM(s) { var d = pd(s); return d ? p2(d.getHours()) + ':' + p2(d.getMinutes()) : ''; }
  function mCPF(v) { var d = dig(v).slice(0, 11); return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'); }
  function cpfOk(v) {
    var c = dig(v); if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
    for (var t = 9; t < 11; t++) { var s = 0; for (var i = 0; i < t; i++) s += +c[i] * (t + 1 - i); var r = (s * 10) % 11 % 10; if (r !== +c[t]) return false; }
    return true;
  }
  function iniciais(nome) { var p = String(nome || '').trim().split(/\s+/); return (((p[0] || '')[0] || '') + ((p.length > 1 ? p[p.length - 1][0] : '') || '')).toUpperCase(); }
  function lerFoto(file, max, q) {
    return new Promise(function (res, rej) {
      if (!file) return rej(new Error('Sem arquivo'));
      var fr = new FileReader();
      fr.onerror = function () { rej(new Error('Não deu para ler a foto. Tente de novo.')); };
      fr.onload = function () {
        if (!/^image\//.test(file.type)) return res(fr.result);
        var img = new Image();
        img.onload = function () {
          var M = max || 1280, k = Math.min(1, M / Math.max(img.naturalWidth, img.naturalHeight));
          var c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          try { res(c.toDataURL('image/jpeg', q || 0.8)); } catch (e) { res(fr.result); }
        };
        img.onerror = function () { res(fr.result); };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  function copiar(txt) {
    return new Promise(function (res) {
      try { if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(txt).then(function () { res(true); }, fb); return; } } catch (e) { /* segue */ }
      fb();
      function fb() { var ta = document.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; } document.body.removeChild(ta); res(ok); }
    });
  }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function imprimirHtml(titulo, corpo) {
    var w = window.open('', '_blank');
    if (!w) return false;
    w.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>' + esc(titulo) + '</title><style>' +
      'body{font-family:Inter,Arial,sans-serif;color:#111827;margin:32px;font-size:13px}h1{font-size:18px;margin:0 0 4px;color:#3a1556}' +
      '.sub{color:#6b7280;margin:0 0 18px}table{width:100%;border-collapse:collapse}td,th{padding:8px 6px;border-bottom:1px solid #e5e7eb;text-align:left}' +
      'th{font-size:11px;text-transform:uppercase;color:#6b7280}.r{text-align:right}.tot{font-weight:700;font-size:15px}.box{border:1px solid #e5e7eb;border-radius:10px;padding:16px;max-width:520px}' +
      '.mono{font-family:ui-monospace,Menlo,monospace}@media print{button{display:none}}</style></head><body>' + corpo +
      '<p style="margin-top:24px"><button onclick="window.print()" style="padding:10px 16px;border-radius:8px;border:0;background:#770fa8;color:#fff;font-weight:700;cursor:pointer">Imprimir / salvar PDF</button></p></body></html>');
    w.document.close();
    return true;
  }

  function criarApi(props) {
    var base = (props.API_URL || window.API_URL || '') ;
    var fa = props.fetchAuth || window.fetchAuth;
    return function (path, opts) {
      opts = opts || {};
      var init = { method: opts.method || 'GET', headers: { 'Content-Type': 'application/json' } };
      if (opts.body !== undefined && init.method !== 'GET') init.body = JSON.stringify(opts.body);
      var url = (opts.publico ? base + '/locacao-publico' : base + '/locacao-minha') + path;
      var p = (fa && !opts.publico) ? fa(url, init) : fetch(url, init);
      return p.then(function (res) {
        if (opts.raw) {
          if (!res.ok) return res.json().catch(function () { return {}; }).then(function (j) { var e = new Error(j.error || 'Erro ' + res.status); e.status = res.status; throw e; });
          return res;
        }
        return res.text().then(function (t) {
          var j = {}; try { j = t ? JSON.parse(t) : {}; } catch (e) { j = {}; }
          if (!res.ok) { var e = new Error(j.error || j.erro || 'Algo deu errado (' + res.status + '). Tente de novo.'); e.status = res.status; e.data = j; throw e; }
          return j;
        });
      }, function () { var e = new Error('Sem conexão. Confira a internet e tente de novo.'); e.status = 0; throw e; });
    };
  }

  // ───── ilustração da moto (mesma do módulo da Central) ─────
  var MotoArte = (function () {
    var CORES = [[/vermelh|vinho|bord/, '#c81e1e'], [/pret|black|grafit/, '#2b2f36'], [/branc|perol/, '#f3f4f6'], [/prat|cinz|chumbo/, '#a1a7b0'],
      [/azul/, '#1d4ed8'], [/amarel|dourad/, '#eab308'], [/verde/, '#15803d'], [/laranj/, '#f67602'], [/rox|lil/, '#770fa8'], [/marrom|bege/, '#92400e']];
    function corHex(cor) { var t = String(cor || '').toLowerCase(); for (var i = 0; i < CORES.length; i++) if (CORES[i][0].test(t)) return CORES[i][1]; return '#9ca3af'; }
    function escuro(hex) { var x = hex.replace('#', ''); function p(i) { var v = Math.round(parseInt(x.slice(i, i + 2), 16) * 0.72).toString(16); return v.length < 2 ? '0' + v : v; } return '#' + p(0) + p(2) + p(4); }
    function roda(cx, cy, r) {
      var s = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#1f2937" stroke-width="' + (r * 0.34).toFixed(1) + '"/><circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.62).toFixed(1) + '" fill="none" stroke="#9ca3af" stroke-width="1.6"/>';
      [[1, 0], [-0.5, 0.866], [-0.5, -0.866]].forEach(function (v) { s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + r * 0.6 * v[0]).toFixed(1) + '" y2="' + (cy + r * 0.6 * v[1]).toFixed(1) + '" stroke="#9ca3af" stroke-width="1.3"/>'; });
      return s + '<circle cx="' + cx + '" cy="' + cy + '" r="3" fill="#6b7280"/>';
    }
    var K = ' stroke="#111827" stroke-opacity=".22" stroke-width="1"';
    var T = {
      street: function (c, d) { return '<ellipse cx="100" cy="118" rx="78" ry="5" fill="#111827" opacity=".08"/><line x1="48" y1="92" x2="100" y2="80" stroke="#4b5563" stroke-width="6" stroke-linecap="round"/>' + roda(48, 92, 24) + roda(154, 92, 24) + '<path d="M154 92 L140 40" stroke="#6b7280" stroke-width="5" stroke-linecap="round"/><path d="M132 66 C140 60 160 62 170 72" fill="none" stroke="' + c + '" stroke-width="5" stroke-linecap="round"/><path d="M100 84 L66 84 C58 84 56 78 62 76 L104 74 Z" fill="#6b7280"/><rect x="90" y="60" width="34" height="24" rx="5" fill="#9ca3af"/><path d="M96 62 L128 46" stroke="#4b5563" stroke-width="4" stroke-linecap="round"/><path d="M36 56 L62 50 L66 64 L42 66 Z" fill="' + c + '"' + K + '/><path d="M56 52 C72 46 94 48 102 52 L100 60 L58 61 Z" fill="#0b0d10"/><path d="M88 52 C94 38 124 36 136 46 L130 60 L92 62 Z" fill="' + c + '"' + K + '/><path d="M98 48 C106 42 120 42 128 46" fill="none" stroke="#ffffff" stroke-opacity=".45" stroke-width="2.5" stroke-linecap="round"/><path d="M92 62 L128 60 L124 66 L96 67 Z" fill="' + d + '"/><line x1="126" y1="30" x2="146" y2="27" stroke="#374151" stroke-width="4" stroke-linecap="round"/><line x1="138" y1="34" x2="140" y2="28" stroke="#374151" stroke-width="3"/><ellipse cx="146" cy="44" rx="5.5" ry="7" fill="#f3f4f6" stroke="#6b7280" stroke-width="1.5"/><rect x="30" y="52" width="9" height="5" rx="2" fill="#dc2626" opacity=".85"/>'; },
      cub: function (c, d) { return '<ellipse cx="100" cy="118" rx="74" ry="5" fill="#111827" opacity=".08"/><line x1="52" y1="96" x2="92" y2="86" stroke="#4b5563" stroke-width="6" stroke-linecap="round"/>' + roda(52, 96, 20) + roda(150, 96, 20) + '<path d="M150 96 L134 38" stroke="#6b7280" stroke-width="5" stroke-linecap="round"/><path d="M132 76 C138 70 156 72 164 80" fill="none" stroke="' + c + '" stroke-width="5" stroke-linecap="round"/><rect x="80" y="76" width="26" height="16" rx="4" fill="#9ca3af"/><path d="M38 66 C40 48 70 46 94 52 L98 78 L52 82 C42 82 37 76 38 66 Z" fill="' + c + '"' + K + '/><path d="M44 52 C60 42 88 44 96 48 L94 55 L46 57 Z" fill="#0b0d10"/><path d="M96 80 C104 82 112 80 116 74 L128 46 C130 40 136 40 136 46 L126 84 C124 88 118 90 110 90 L96 90 Z" fill="' + d + '"/><path d="M118 40 C128 40 134 46 134 54 L126 86 L114 86 C120 66 120 54 112 46 Z" fill="' + c + '"' + K + '/><path d="M50 60 C62 54 80 54 90 58" fill="none" stroke="#ffffff" stroke-opacity=".45" stroke-width="2.5" stroke-linecap="round"/><rect x="120" y="26" width="24" height="9" rx="4" fill="' + c + '"' + K + '/><line x1="116" y1="29" x2="148" y2="28" stroke="#374151" stroke-width="3.5" stroke-linecap="round"/><ellipse cx="144" cy="31" rx="4.5" ry="4" fill="#f3f4f6" stroke="#6b7280" stroke-width="1.5"/><rect x="30" y="62" width="8" height="5" rx="2" fill="#dc2626" opacity=".85"/>'; },
      scooter: function (c, d) { return '<ellipse cx="100" cy="118" rx="76" ry="5" fill="#111827" opacity=".08"/>' + roda(54, 98, 18) + roda(150, 98, 18) + '<path d="M150 98 L138 44" stroke="#6b7280" stroke-width="5" stroke-linecap="round"/><path d="M134 80 C140 74 156 76 162 84" fill="none" stroke="' + c + '" stroke-width="5" stroke-linecap="round"/><rect x="56" y="86" width="40" height="10" rx="4" fill="#6b7280"/><path d="M34 72 C34 52 60 46 90 50 L100 80 L46 88 C38 88 34 82 34 72 Z" fill="' + c + '"' + K + '/><path d="M44 52 C62 42 90 44 100 50 L98 57 L46 59 Z" fill="#0b0d10"/><path d="M98 82 L126 82 L126 88 L98 90 Z" fill="' + d + '"/><path d="M112 44 C128 40 140 48 142 60 L134 86 L118 86 C124 68 122 56 112 44 Z" fill="' + c + '"' + K + '/><path d="M120 32 L140 30 L144 40 C136 44 126 44 118 42 Z" fill="#cbd5e1" stroke="#9ca3af" stroke-width="1"/><path d="M44 66 C58 58 78 58 92 62" fill="none" stroke="#ffffff" stroke-opacity=".45" stroke-width="2.5" stroke-linecap="round"/><line x1="114" y1="40" x2="146" y2="38" stroke="#374151" stroke-width="3.5" stroke-linecap="round"/><ellipse cx="141" cy="56" rx="4" ry="5" fill="#f3f4f6" stroke="#6b7280" stroke-width="1.5"/><rect x="28" y="66" width="8" height="5" rx="2" fill="#dc2626" opacity=".85"/>'; },
      trail: function (c, d) { return '<ellipse cx="100" cy="118" rx="80" ry="5" fill="#111827" opacity=".08"/><line x1="46" y1="90" x2="100" y2="74" stroke="#4b5563" stroke-width="6" stroke-linecap="round"/>' + roda(46, 90, 25) + roda(158, 88, 27) + '<path d="M158 88 L140 30" stroke="#6b7280" stroke-width="5.5" stroke-linecap="round"/><path d="M138 50 C148 42 166 44 172 52 L166 56 C160 50 150 50 144 54 Z" fill="' + c + '"' + K + '/><rect x="88" y="56" width="32" height="24" rx="5" fill="#9ca3af"/><path d="M118 72 C110 80 84 78 70 70" fill="none" stroke="#6b7280" stroke-width="5" stroke-linecap="round"/><path d="M30 44 L62 42 L64 54 L40 56 Z" fill="' + c + '"' + K + '/><path d="M50 44 C70 38 100 38 112 42 L110 49 L52 50 Z" fill="#0b0d10"/><path d="M92 44 C98 30 124 28 134 38 L128 56 L96 58 Z" fill="' + c + '"' + K + '/><path d="M108 46 L130 40 L124 62 L106 60 Z" fill="' + d + '"/><path d="M100 40 C106 34 120 33 128 37" fill="none" stroke="#ffffff" stroke-opacity=".45" stroke-width="2.5" stroke-linecap="round"/><path d="M136 26 L150 24 L152 40 L140 42 Z" fill="' + c + '"' + K + '/><line x1="122" y1="20" x2="146" y2="18" stroke="#374151" stroke-width="4" stroke-linecap="round"/><ellipse cx="148" cy="33" rx="4" ry="5.5" fill="#f3f4f6" stroke="#6b7280" stroke-width="1.5"/><rect x="24" y="42" width="8" height="5" rx="2" fill="#dc2626" opacity=".85"/>'; }
    };
    function tipoPorModelo(modelo) {
      var m = String(modelo || '').toLowerCase();
      if (/\b(biz|pop|crypton|c100|dream|web|jet|traxx)\b/.test(m)) return 'cub';
      if (/\b(pcx|elite|nmax|n-max|lead|burgman|neo|fluo|xmax|adv|citycom|scooter)\b/.test(m)) return 'scooter';
      if (/\b(bros|xre|lander|crosser|xtz|tenere|nxr|tornado|falcon|dr|klx|crf|trail)\b/.test(m)) return 'trail';
      return 'street';
    }
    function svg(tipo, cor) { var c = corHex(cor); return '<svg viewBox="0 0 200 124" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block">' + (T[tipo] || T.street)(c, escuro(c)) + '</svg>'; }
    return { svg: svg, tipoPorModelo: tipoPorModelo };
  })();
  function MotoImg(p) {
    var st = { width: p.w || '100%', height: p.h || 180, borderRadius: p.r != null ? p.r : 12, overflow: 'hidden', flex: 'none', display: 'block' };
    if (p.src) return h('img', { src: p.src, alt: 'Foto da moto', style: Object.assign({ objectFit: 'cover', background: '#e5e7eb' }, st) });
    return h('div', { role: 'img', 'aria-label': 'Ilustração da moto', style: Object.assign({ background: 'linear-gradient(180deg,#faf7fd,#f3e8fb)', padding: Math.max(3, Math.round((p.h || 180) * 0.06)), boxSizing: 'border-box' }, st),
      dangerouslySetInnerHTML: { __html: MotoArte.svg(p.tipo || MotoArte.tipoPorModelo(p.modelo), p.cor) } });
  }

  // ───── peças ─────
  function Pill(t, tom) { var T = TONS[tom] || TONS.cinza; return h('span', { className: 'mm-pill', style: { background: T[0], color: T[1] } }, t); }
  function Carregando(t) { return h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '60px 16px', color: '#6b7280' } }, h('div', { className: 'mm-spin' }), t || 'Carregando...'); }
  function Campo(p) {
    return h('label', { style: { display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 } },
      h('span', { style: { fontSize: 12.5, fontWeight: 600, color: '#374151' } }, p.label, p.opt ? h('span', { style: { color: '#9ca3af', fontWeight: 500 } }, ' · ' + (typeof p.opt === 'string' ? p.opt : 'opcional')) : null),
      p.children,
      p.erro ? h('span', { role: 'alert', style: { fontSize: 11.5, color: '#991b1b', fontWeight: 500 } }, p.erro) : p.hint ? h('span', { style: { fontSize: 11.5, color: '#6b7280' } }, p.hint) : null);
  }
  function Seg(op, val, set, nome, cols, perigo) {
    return h('div', { className: 'mm-seg' + (perigo ? ' perigo' : ''), role: 'radiogroup', 'aria-label': nome, style: { gridTemplateColumns: 'repeat(' + (cols || op.length) + ', 1fr)' } },
      op.map(function (o) { return h('button', { key: String(o[0]), type: 'button', role: 'radio', 'aria-checked': val === o[0], onClick: function () { set(o[0]); } }, o[1]); }));
  }
  function Sheet(p) {
    useEffect(function () { var fn = function (e) { if (e.key === 'Escape') p.onClose(); }; document.addEventListener('keydown', fn); return function () { document.removeEventListener('keydown', fn); }; }, []);
    return h('div', { className: 'mm-ov', role: 'dialog', 'aria-modal': 'true', 'aria-label': p.titulo, onClick: function (e) { if (e.target === e.currentTarget) p.onClose(); } },
      h('div', { className: 'mm-sheet' },
        h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: 12 } }, h('h2', { className: 'mm-sora', style: { margin: 0, fontSize: 17, flex: 1 } }, p.titulo), h('button', { type: 'button', onClick: p.onClose, 'aria-label': 'Fechar', style: { width: 36, height: 36, display: 'grid', placeItems: 'center', color: '#6b7280' } }, ico('x', 18))),
        p.children));
  }
  function Voltar(t, fn) { return h('button', { type: 'button', className: 'mm-lnk', onClick: fn, style: { fontSize: 13.5, alignSelf: 'flex-start' } }, ico('arrowleft', 16), t); }
  function TermoTexto(p) { return h('div', { style: { whiteSpace: 'pre-wrap', fontSize: 13.5, lineHeight: 1.55, color: '#374151' } }, p.texto || 'Termo indisponível no momento.'); }

  // Anel de contagem regressiva
  function Anel(p) {
    var r = 26, c = 2 * Math.PI * r, frac = Math.max(0, Math.min(1, p.frac));
    return h('div', { style: { position: 'relative', width: p.tam || 68, height: p.tam || 68, flex: 'none' } },
      h('svg', { viewBox: '0 0 64 64', width: '100%', height: '100%', 'aria-hidden': 'true' },
        h('circle', { cx: 32, cy: 32, r: r, fill: 'none', stroke: '#f3e8fb', strokeWidth: 6 }),
        h('circle', { cx: 32, cy: 32, r: r, fill: 'none', stroke: p.cor || ROXO, strokeWidth: 6, strokeLinecap: 'round', strokeDasharray: c, strokeDashoffset: c * (1 - frac), transform: 'rotate(-90 32 32)' })),
      h('div', { style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1 } },
        h('b', { className: 'mm-sora', style: { fontSize: (p.tam || 68) > 60 ? 22 : 17, color: '#111827' } }, p.valor),
        h('span', { style: { fontSize: 10, color: '#6b7280', marginTop: 2 } }, p.rotulo)));
  }

  // ───── ciência LGPD ─────
  function Ciencia(p) {
    var _t = useState(null), termo = _t[0], setTermo = _t[1];
    var _c = useState(false), ok = _c[0], setOk = _c[1];
    var _e = useState(false), env = _e[0], setEnv = _e[1];
    var _v = useState(false), ver = _v[0], setVer = _v[1];
    useEffect(function () { p.api('/termo').then(setTermo).catch(function () { setTermo({ texto: '', versao: p.versao }); }); }, []);
    var enviar = function () {
      setEnv(true);
      p.api('/ciencia', { method: 'POST', body: { versao: (termo && termo.versao) || p.versao } })
        .then(function () { p.onOk(); }).catch(function (e) { p.toast(e.message); setEnv(false); });
    };
    return h('div', { className: 'mm-main', style: { paddingBottom: 32 } },
      h('h1', { className: 'mm-h1' }, 'Antes de começar'),
      h('p', { className: 'mm-sub' }, 'Esta área mostra apenas a sua moto, o seu contrato e as suas parcelas.'),
      h('section', { className: 'mm-card' },
        h('div', { style: { display: 'flex', gap: 10, alignItems: 'center' } },
          h('span', { style: { width: 36, height: 36, borderRadius: 10, background: '#f3e8fb', color: ROXO_ESC, display: 'grid', placeItems: 'center' } }, ico('shield', 18)),
          h('b', { style: { flex: 1 } }, 'Ciência sobre seus dados'), Pill('Obrigatório', 'roxo')),
        h('p', { className: 'mm-sub', style: { color: '#374151' } }, 'Seus dados são usados para o contrato, a cobrança e as vistorias da moto:'),
        h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 13.5, color: '#374151', lineHeight: 1.6 } },
          h('li', null, 'CPF, CNH e endereço: contrato e documentação da moto'),
          h('li', null, 'Pagamentos: controle das parcelas e do repasse'),
          h('li', null, 'Fotos de vistoria com data, hora e local')),
        h('label', { style: { display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5, cursor: 'pointer' } },
          h('input', { type: 'checkbox', checked: ok, onChange: function (e) { setOk(e.target.checked); }, style: { width: 20, height: 20, accentColor: ROXO, marginTop: 1, flex: 'none' } }),
          h('span', null, 'Estou ciente de como a Tutts trata meus dados (Termo LGPD ' + ((termo && termo.versao) || p.versao || '') + '). ', h('button', { type: 'button', className: 'mm-lnk', onClick: function (e) { e.preventDefault(); setVer(true); } }, 'Ler termo')))),
      h('button', { type: 'button', className: 'mm-btn pri', disabled: !ok || env, onClick: enviar }, env ? 'Registrando...' : 'Dar ciência e entrar'),
      h('p', { className: 'mm-sub', style: { textAlign: 'center', fontSize: 12.5 } }, 'A ciência fica registrada com data e hora.'),
      ver ? h(Sheet, { titulo: 'Termo de privacidade', onClose: function () { setVer(false); } }, termo ? h(TermoTexto, { texto: termo.texto }) : Carregando()) : null);
  }

  // ───── Home ─────
  function Home(p) {
    var r = p.r, mo = r.moto || {}, ct = r.contrato || {}, prox = r.proxima_parcela, qf = r.quanto_falta || {}, pend = r.vistoria_pendente, cli = r.cliente || {};
    var ag = r.vistoria_agendada, nParc = ct.prazo_qtd || ct.semanas || 0, aluguel = ct.plano === 'aluguel'; // LOCACAO_V3
    var _cf = useState(null), capa = _cf[0], setCapa = _cf[1];
    useEffect(function () { if (mo.tem_foto) p.api('/moto/capa').then(function (x) { if (x && x.foto) setCapa(x.foto); }).catch(function () {}); }, [mo.tem_foto]);
    var pct = Math.max(0, Math.min(100, num(qf.pct_pago != null ? qf.pct_pago : (nParc ? 100 * num(ct.parcelas_pagas) / num(nParc) : 0))));
    var dias = pend ? (pend.dias_restantes != null ? pend.dias_restantes : Math.round((pd(pend.prazo) - new Date(new Date().toDateString())) / 864e5)) : null;
    var baixarContrato = function () {
      p.api('/contrato/pdf', { raw: true }).then(function (res) { return res.blob(); }).then(function (b) {
        var u = URL.createObjectURL(b); var a = document.createElement('a'); a.href = u; a.download = 'contrato-' + (ct.numero || 'moto') + '.pdf'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
      }).catch(function (e) { p.toast(e.message); });
    };
    return h(React.Fragment, null,
      h('h1', { className: 'mm-h1' }, 'Olá, ' + String(cli.nome || '').split(' ')[0]),
      h('section', { className: 'mm-card', style: { padding: 12 } },
        h(MotoImg, { src: capa || mo.capa_thumb, tipo: mo.tipo, modelo: mo.modelo, cor: mo.cor, h: 180 }),
        h('div', { style: { display: 'flex', gap: 10, alignItems: 'center', padding: '0 2px' } },
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', { style: { fontWeight: 700, fontSize: 15 } }, (mo.modelo || 'Sua moto') + (mo.cor ? ' · ' + String(mo.cor).toLowerCase() : '')),
            h('div', { style: { fontSize: 12.5, color: '#6b7280' } }, h('span', { className: 'mm-mono' }, mo.placa), ct.numero ? ' · contrato ' + ct.numero : '')),
          Pill(ct.situacao_label || ct.situacao || '—', TOM_SIT[ct.situacao] || 'cinza'))),
      ct.situacao !== 'quitado' ? h('section', { className: 'mm-card' },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 } },
          h('div', null,
            h('div', { style: { fontSize: 12.5, color: '#6b7280', fontWeight: 600 } }, aluguel ? 'Quanto falta para o fim do contrato' : 'Quanto falta para a moto ser sua'),
            h('div', { className: 'mm-sora mm-num', style: { fontSize: 26, fontWeight: 700 } }, fR(qf.valor_restante != null ? qf.valor_restante : ct.saldo_devedor)),
            h('div', { style: { fontSize: 13, color: '#374151' } }, 'faltam ', h('b', null, (qf.parcelas_restantes != null ? qf.parcelas_restantes : num(nParc) - num(ct.parcelas_pagas)) + ' parcelas'), aluguel ? ' · término ' : ' · quitação prevista ', h('b', null, fD(aluguel ? (ct.termino || qf.quitacao_prevista) : (qf.quitacao_prevista || ct.termino || ct.ultimo_vencimento))))), /* LOCACAO_V3 */
          Pill((ct.parcelas_pagas || 0) + ' de ' + nParc, 'roxo')),
        h('div', null,
          h('div', { style: { position: 'relative', height: 8, background: '#f3f4f6', borderRadius: 99 } },
            h('div', { style: { position: 'absolute', left: 0, top: 0, bottom: 0, width: pct + '%', background: ROXO, borderRadius: 99 } }),
            [25, 50, 75].map(function (m) { return h('span', { key: m, style: { position: 'absolute', left: m + '%', top: -2, bottom: -2, width: 2, background: '#fff' } }); }),
            h('span', { style: { position: 'absolute', left: 'calc(' + pct + '% - 9px)', top: -5, width: 18, height: 18, borderRadius: 99, background: '#fff', border: '3px solid ' + ROXO } })),
          h('div', { style: { position: 'relative', height: 16, marginTop: 6, fontSize: 10.5, color: '#9ca3af' } }, [25, 50, 75].map(function (m) { return h('span', { key: m, style: { position: 'absolute', left: m + '%', transform: 'translateX(-50%)' } }, m + '%'); }))),
        qf.proximo_marco ? h('div', { style: { background: '#faf7fd', borderRadius: 10, padding: '9px 12px', fontSize: 12.5, color: ROXO_ESC } }, 'Próximo marco: ', h('b', null, qf.proximo_marco.pct + '%'), ' em ' + qf.proximo_marco.faltam_parcelas + ' parcela' + (qf.proximo_marco.faltam_parcelas === 1 ? '' : 's') + '. Paga antes e chega mais rápido.') : null,
        h('button', { type: 'button', className: 'mm-btn out', style: { height: 44 }, onClick: function () { p.ir('antecipar'); } }, 'Antecipar parcelas', ico('arrowright', 16))) : null,
      prox ? h('section', { className: 'mm-card' },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 } },
          h('div', null,
            h('div', { style: { fontSize: 12, color: '#6b7280', fontWeight: 600 } }, 'Próxima parcela · ' + prox.numero + '/' + (nParc || '')),
            h('div', { className: 'mm-sora mm-num', style: { fontSize: 26, fontWeight: 700 } }, fR(prox.total)),
            h('div', { style: { fontSize: 13, color: prox.status === 'atrasada' ? '#991b1b' : '#374151', fontWeight: prox.status === 'atrasada' ? 600 : 400 } },
              prox.status === 'atrasada' ? 'venceu ' + fDS(prox.vencimento) + ' · com multa e juros' : prox.status === 'vence_hoje' ? 'vence hoje' : 'vence ' + fDS(prox.vencimento)),
            num(prox.valor_extras) > 0 ? h('div', { style: { fontSize: 12, color: '#92400e', marginTop: 2 } }, 'inclui ' + fR(prox.valor_extras) + ' de tarifas') : null,
            prox.status === 'atrasada' && ct.dias_rescisao ? h('div', { style: { fontSize: 12, color: '#991b1b', marginTop: 2 } }, 'Com mais de ' + ct.dias_rescisao + ' dias de atraso a moto pode ser recolhida (Cl. 14.2).') : null),
          Pill(prox.status_label || prox.status, TOM_PARC[prox.status] || 'cinza')),
        h('button', { type: 'button', className: 'mm-btn pri', onClick: function () { p.copiarPix(prox); } }, ico('copy', 18), 'Copiar PIX copia-e-cola'),
        prox.abatimento_repasse ? h('div', { style: { fontSize: 12.5, color: '#374151', background: '#faf7fd', borderRadius: 10, padding: '10px 12px', lineHeight: 1.45 } },
          h('b', { style: { color: ROXO_ESC } }, 'Motoboy Tutts: '), 'desconto automático no repasse' + (prox.repasse_previsto ? ' de ' + fDS(prox.repasse_previsto) : '') + '; o que faltar você paga via PIX.')
          : h('div', { style: { fontSize: 12, color: '#6b7280', textAlign: 'center' } }, 'Você recebe um lembrete no WhatsApp na véspera.')) : null,
      ag ? h('section', { className: 'mm-card', style: { flexDirection: 'row', gap: 12, alignItems: 'center', background: '#faf7fd', borderColor: '#e9d5f9' } }, // LOCACAO_V3: vistoria mensal agendada na Base
        h('span', { style: { width: 44, height: 44, borderRadius: 12, background: '#fff', color: ROXO_ESC, display: 'grid', placeItems: 'center', flex: 'none', border: '1px solid #e9d5f9' } }, ico('calendar', 20)),
        h('div', { style: { flex: 1, minWidth: 0 } }, h('b', { style: { display: 'block' } }, 'Vistoria mensal na Base'), h('div', { style: { fontSize: 13, color: '#374151' } }, fDS(ag.data_hora) + ' às ' + fHM(ag.data_hora) + (ag.local ? ' · ' + ag.local : '')),
          h('div', { style: { fontSize: 12, color: '#92400e', marginTop: 2 } }, 'Leve a moto. Se faltar sem justificar, a tarifa é R$ 100,00 (Cl. 9.4.1).'))) : null,
      pend && pend.na_base ? h('section', { className: 'mm-card', style: { background: '#faf7fd', borderColor: '#e9d5f9' } }, /* LOCACAO_FLUXO_V2: retirada é na Base com a equipe */
        h('div', { style: { display: 'flex', gap: 12, alignItems: 'center' } },
          h('span', { style: { width: 44, height: 44, borderRadius: 12, background: '#fff', color: ROXO_ESC, display: 'grid', placeItems: 'center', flex: 'none', border: '1px solid #e9d5f9' } }, ico('pin', 20)),
          h('div', { style: { flex: 1, minWidth: 0 } }, h('b', { style: { display: 'block' } }, 'Retire sua moto na Base'),
            h('div', { style: { fontSize: 12.5, color: '#374151' } }, pend.base ? (pend.base.nome || 'Base Tutts') + (pend.base.endereco ? ' · ' + pend.base.endereco : '') : 'Combine o horário com a Tutts'))),
        h('div', { style: { fontSize: 12.5, color: '#6b7280', lineHeight: 1.5 } }, 'Lá a equipe faz a vistoria de retirada com você: vocês conferem a moto juntos e o termo chega para você assinar no Autentique.')) :
      pend ? h('section', { className: 'mm-card' },
        h('div', { style: { display: 'flex', gap: 14, alignItems: 'center' } },
          h(Anel, { valor: Math.max(0, dias), rotulo: dias === 1 ? 'dia' : 'dias', frac: Math.max(0.08, Math.min(1, (dias || 0) / 30)), cor: dias != null && dias <= 1 ? '#d97706' : ROXO }),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('b', null, dias != null && dias < 0 ? (pend.tipo_label || 'Vistoria') + ' atrasada' : (pend.tipo_label || 'Vistoria') + (dias === 0 ? ' vence hoje' : ' em ' + dias + ' dia' + (dias === 1 ? '' : 's'))),
            h('div', { style: { fontSize: 12.5, color: '#6b7280' } }, 'até ' + fDS(pend.prazo) + ' · 6 fotos + km + checklist'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, marginTop: 8 } }, POSICOES.map(function (x) { return h('span', { key: x[0], title: x[1], style: { height: 22, borderRadius: 6, background: '#f3f4f6', color: '#9ca3af', display: 'grid', placeItems: 'center' } }, ico('camera', 12)); })))),
        h('div', { style: { fontSize: 12.5, color: '#374151', background: '#faf7fd', borderRadius: 10, padding: '10px 12px', lineHeight: 1.45 } }, 'Leve a moto na Base: a equipe da Tutts faz a vistoria com você.' + (r.vistoria_agendada ? '' : ' Fale com a Tutts para agendar.')), /* LOCACAO_AJUSTES_V1: só a equipe registra vistoria */
        mo.tem_foto ? null : h('div', { style: { fontSize: 12, color: '#6b7280', textAlign: 'center' } }, 'A foto de frente vira a imagem da sua moto aqui.')) : null,
      (function () { /* LOCACAO_APP_CRLV_V1: CRLV-e a um toque */
        var crlv = (r.documentos_moto || []).find(function (x) { return x.id === 'crlv'; });
        if (!crlv) return null;
        return h('button', { type: 'button', className: 'mm-card', disabled: !crlv.disponivel, onClick: function () { if (crlv.disponivel) abrirArquivo(p.api, crlv.url, crlv.arquivo, p.toast); }, style: { flexDirection: 'row', alignItems: 'center', gap: 12, textAlign: 'left', opacity: crlv.disponivel ? 1 : 0.7 } },
          h('span', { style: { width: 40, height: 40, borderRadius: 10, background: '#eff6ff', color: '#1d4ed8', display: 'grid', placeItems: 'center', flex: 'none' } }, ico('idcard', 20)),
          h('span', { style: { flex: 1, minWidth: 0 } }, h('b', { style: { display: 'block' } }, 'Documento da moto (CRLV-e)'), h('span', { style: { fontSize: 12.5, color: '#6b7280' } }, crlv.disponivel ? 'Abra e mostre na hora, se pedirem na rua.' : crlv.subtitulo)),
          crlv.disponivel ? h('span', { className: 'mm-lnk' }, 'Abrir', ico('arrowright', 14)) : null);
      })(),
      h('button', { type: 'button', className: 'mm-card', onClick: function () { p.ir('problema'); }, style: { flexDirection: 'row', alignItems: 'center', gap: 12, textAlign: 'left' } },
        h('span', { style: { width: 40, height: 40, borderRadius: 10, background: '#fef2f2', color: '#dc2626', display: 'grid', placeItems: 'center', flex: 'none' } }, ico('alert', 20)),
        h('span', { style: { flex: 1, minWidth: 0 } }, h('b', { style: { display: 'block' } }, 'Algum problema com a moto?'), h('span', { style: { fontSize: 12.5, color: '#6b7280' } }, 'Pneu, pane, batida ou roubo: avise a Tutts por aqui.' + (r.avisos_abertos ? ' (' + r.avisos_abertos + ' em aberto)' : ''))),
        h('span', { className: 'mm-lnk' }, 'Avisar', ico('arrowright', 14))),
      h('section', { className: 'mm-card', style: { flexDirection: 'row', alignItems: 'center', gap: 12 } },
        h('span', { style: { width: 40, height: 40, borderRadius: 10, background: '#f3e8fb', color: ROXO_ESC, display: 'grid', placeItems: 'center', flex: 'none' } }, ico('filetext', 20)),
        h('button', { type: 'button', onClick: function () { p.ir('contrato'); }, style: { flex: 1, minWidth: 0, textAlign: 'left' } }, h('b', { style: { display: 'block' } }, 'Meu contrato'), h('span', { style: { fontSize: 12.5, color: '#6b7280' } }, [ct.plano_label, ct.tem_pdf_assinado ? 'PDF assinado' + (ct.assinado_em ? ' · ' + fD(ct.assinado_em) : '') : 'demonstrativo, tarifário e anexos'].filter(Boolean).join(' · '))), // LOCACAO_V3
        h('button', { type: 'button', className: 'mm-lnk', onClick: baixarContrato, 'aria-label': 'Baixar contrato em PDF' }, ico('download', 16), 'PDF')));
  }

  // ───── Antecipar ─────
  function Antecipar(p) {
    var r = p.r, ct = r.contrato || {}, qf = r.quanto_falta || {};
    var max = Math.max(1, num(qf.parcelas_restantes != null ? qf.parcelas_restantes : num(ct.semanas) - num(ct.parcelas_pagas)));
    var _q = useState(Math.min(4, max)), qtd = _q[0], setQtd = _q[1];
    var _s = useState(null), sim = _s[0], setSim = _s[1];
    var _e = useState(null), erro = _e[0], setErro = _e[1];
    var _g = useState(null), pix = _g[0], setPix = _g[1];
    var _b = useState(false), gerando = _b[0], setGerando = _b[1];
    useEffect(function () {
      setPix(null); setErro(null);
      var t = setTimeout(function () { p.api('/antecipar/simular', { method: 'POST', body: { quantidade: qtd } }).then(setSim).catch(function (e) { setSim(null); setErro(e.message); }); }, 250);
      return function () { clearTimeout(t); };
    }, [qtd]);
    var set = function (n) { setQtd(Math.max(1, Math.min(max, n))); };
    var nums = (sim && sim.numeros) || [];
    var faixa = nums.length ? (nums.length === 1 ? 'parcela ' + nums[0] : nums[0] + ' a ' + nums[nums.length - 1] + ' (' + nums.length + ' semanas)') : '—';
    var gerar = function () {
      setGerando(true);
      p.api('/antecipar', { method: 'POST', body: { quantidade: qtd } }).then(function (x) { setPix(x); p.toast('PIX gerado. Copie o código e pague no app do seu banco.'); })
        .catch(function (e) { p.toast(e.message); }).then(function () { setGerando(false); });
    };
    var linha = function (a, b, st) { return h('div', { className: 'mm-row', style: st || null }, h('span', { style: { color: '#6b7280' } }, a), h('span', { className: 'mm-num', style: { textAlign: 'right' } }, b)); };
    return h(React.Fragment, null,
      Voltar('Minha moto', p.voltar),
      h('div', null, h('h1', { className: 'mm-h1' }, 'Antecipar parcelas'), h('p', { className: 'mm-sub' }, 'Pague parcelas futuras agora e quite a moto antes.')),
      h('section', { className: 'mm-card' },
        h('b', null, 'Quantas parcelas você quer adiantar?'),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
          h('button', { type: 'button', 'aria-label': 'Menos uma parcela', onClick: function () { set(qtd - 1); }, disabled: qtd <= 1, style: { width: 48, height: 48, borderRadius: 12, border: '1px solid #e5e7eb', display: 'grid', placeItems: 'center', color: '#374151' } }, ico('minus', 20)),
          h('div', { style: { flex: 1, textAlign: 'center' } }, h('div', { className: 'mm-sora mm-num', style: { fontSize: 40, fontWeight: 800, lineHeight: 1.1 } }, qtd), h('div', { style: { fontSize: 12.5, color: '#6b7280' } }, 'de ' + max + ' restantes')),
          h('button', { type: 'button', 'aria-label': 'Mais uma parcela', onClick: function () { set(qtd + 1); }, disabled: qtd >= max, style: { width: 48, height: 48, borderRadius: 12, background: ROXO, color: '#fff', display: 'grid', placeItems: 'center' } }, ico('plus', 20))),
        h('input', { type: 'range', min: 1, max: max, value: qtd, onChange: function (e) { set(+e.target.value); }, className: 'mm-range', 'aria-label': 'Quantidade de parcelas' }),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 } }, [[Math.min(4, max), Math.min(4, max) + ' parcelas'], [Math.min(12, max), Math.min(12, max) + ' parcelas'], [max, 'Quitar tudo']].map(function (o, i) {
          var on = qtd === o[0];
          return h('button', { key: i, type: 'button', onClick: function () { set(o[0]); }, style: { height: 38, borderRadius: 99, border: '1px solid ' + (on ? '#e9d5f9' : '#e5e7eb'), background: on ? '#faf7fd' : '#fff', color: on ? ROXO_ESC : '#374151', fontWeight: 600, fontSize: 13 } }, o[1]);
        }))),
      erro ? h('div', { role: 'alert', style: { background: '#fef2f2', color: '#991b1b', borderRadius: 12, padding: 12, fontSize: 13 } }, erro) : null,
      h('section', { className: 'mm-card', style: { gap: 0, paddingTop: 4, paddingBottom: 4 } },
        linha('Parcelas adiantadas', faixa, { borderTop: 0 }),
        linha('Valor por parcela', fR(ct.valor_semanal)),
        linha('Desconto', sim && num(sim.desconto) > 0 ? '− ' + fR(sim.desconto) : '—'),
        h('div', { className: 'mm-row' }, h('span', { style: { color: '#374151', fontWeight: 600 } }, 'Total a pagar agora'), h('b', { className: 'mm-num', style: { fontSize: 15 } }, sim ? fR(sim.valor) : '—')),
        h('div', { className: 'mm-row' }, h('span', { style: { color: '#6b7280' } }, 'Nova quitação prevista'),
          h('span', null, sim && sim.quitacao_atual && sim.nova_quitacao !== sim.quitacao_atual ? h('s', { style: { color: '#9ca3af', marginRight: 6, fontSize: 12.5 } }, fD(sim.quitacao_atual)) : null, h('b', { style: { color: '#166534' } }, sim ? fD(sim.nova_quitacao) : '—')))),
      sim && nums.length ? h('div', { style: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 12, fontSize: 13, color: '#166534', display: 'flex', gap: 8 } }, ico('check', 16, { marginTop: 2 }),
        h('span', null, nums.length === max ? 'Com esse pagamento a moto fica quitada.' : 'As parcelas ' + nums[0] + ' a ' + nums[nums.length - 1] + ' saem do seu calendário.')) : null,
      h('p', { className: 'mm-sub', style: { fontSize: 12.5 } }, 'Sem desconto por antecipação, a menos que a Tutts ative um desconto. O valor sai só por PIX (não é abatido do repasse).'),
      pix ? null : h('button', { type: 'button', className: 'mm-btn pri', disabled: !sim || gerando, onClick: gerar }, ico('card', 18), gerando ? 'Gerando PIX...' : 'Gerar PIX de ' + (sim ? fR(sim.valor) : '...')),
      pix ? h('section', { className: 'mm-card', style: { border: '1.5px dashed #d8b4f0' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, h('b', null, 'PIX gerado'), Pill(fR(pix.valor), 'ambar')),
        h('div', { className: 'mm-mono', style: { fontSize: 11.5, background: '#f9fafb', borderRadius: 10, padding: 10, wordBreak: 'break-all', color: '#374151' } }, pix.pix_copia_cola || '—'),
        h('button', { type: 'button', className: 'mm-btn out', style: { height: 44 }, onClick: function () { copiar(pix.pix_copia_cola || '').then(function (ok) { p.toast(ok ? 'Código copiado. Cole no app do seu banco.' : 'Não deu para copiar.'); }); } }, ico('copy', 16), 'Copiar código'),
        h('div', { style: { fontSize: 12, color: '#6b7280', textAlign: 'center' } }, 'Assim que o pagamento cair, as parcelas aparecem como pagas.')) : null);
  }

  // ───── Pagamentos / extrato ─────
  function Pagamentos(p) {
    var _d = useState(null), d = _d[0], setD = _d[1];
    var _e = useState(null), erro = _e[0], setErro = _e[1];
    var _f = useState('todos'), f = _f[0], setF = _f[1];
    var _r = useState(null), recibo = _r[0], setRecibo = _r[1];
    var _a = useState(null), anexo = _a[0], setAnexo = _a[1];
    var carregar = useCallback(function () { setErro(null); p.api('/extrato').then(setD).catch(function (e) { setErro(e.message); }); }, []);
    useEffect(carregar, [carregar]);
    if (erro) return h('div', { className: 'mm-card' }, h('b', null, 'Não foi possível carregar'), h('span', { className: 'mm-sub' }, erro), h('button', { type: 'button', className: 'mm-btn sec', onClick: carregar }, 'Tentar de novo'));
    if (!d) return Carregando('Carregando pagamentos...');
    var itens = d.itens || [], rs = d.resumo || {};
    var aberto = function (x) { return x.status !== 'paga' && x.status !== 'cancelada'; };
    var lista = itens.filter(function (x) {
      if (f === 'pagos') return x.status === 'paga';
      if (f === 'aberto') return aberto(x);
      if (f === 'extras') return x.tipo === 'extra' || (x.itens && x.itens.length > 1);
      return true;
    });
    var nPagas = itens.filter(function (x) { return x.status === 'paga' && x.tipo === 'parcela'; }).length;
    var nExtras = itens.filter(function (x) { return x.tipo === 'extra'; }).length;
    var abertoExtra = itens.filter(function (x) { return x.tipo === 'extra' && aberto(x); })[0];
    var grupos = [], porMes = {};
    lista.forEach(function (x) {
      var dt = pd(x.pago_em || x.vencimento) || new Date();
      var k = dt.getFullYear() + '-' + p2(dt.getMonth() + 1);
      if (!porMes[k]) { porMes[k] = { k: k, t: MESES[dt.getMonth()] + ' ' + dt.getFullYear(), itens: [] }; grupos.push(porMes[k]); }
      porMes[k].itens.push(x);
    });
    var abrirRecibo = function (x) {
      setRecibo({ carregando: true });
      p.api('/recibo/' + x.id).then(function (r) { setRecibo(r.recibo || {}); }).catch(function (e) { setRecibo(null); p.toast(e.message); });
    };
    var abrirAnexo = function (x, a) {
      setAnexo({ titulo: a.nome || 'Documento' });
      p.api('/ocorrencias/' + x.ocorrencia_id + '/anexos/' + a.id).then(function (r) { setAnexo({ titulo: r.nome || a.nome, src: r.conteudo, mime: r.mime }); }).catch(function (e) { setAnexo(null); p.toast(e.message); });
    };
    var baixarExtrato = function () {
      var linhas = itens.map(function (x) {
        return '<tr><td>' + esc(x.tipo === 'parcela' ? 'Parcela ' + x.numero : x.descricao || 'Extra') + '</td><td>' + esc(x.vencimento ? fD(x.vencimento) : '—') + '</td><td>' + esc(x.pago_em ? fD(x.pago_em) : '—') + '</td><td>' + esc(x.forma_label || '—') + '</td><td>' + esc(x.status_label || x.status) + '</td><td class="r">' + esc(fR(x.total != null ? x.total : x.valor)) + '</td></tr>';
      }).join('');
      var ok = imprimirHtml('Extrato · ' + ((p.r.contrato || {}).numero || ''), '<h1>Extrato da locação</h1><p class="sub">' + esc((p.r.cliente || {}).nome || '') + ' · contrato ' + esc((p.r.contrato || {}).numero || '') + ' · ' + esc((p.r.moto || {}).modelo || '') + ' ' + esc((p.r.moto || {}).placa || '') + ' · gerado em ' + fD(new Date()) + '</p>' +
        '<p>Pago até hoje: <b>' + esc(fR(rs.pago_total)) + '</b> · Em aberto: <b>' + esc(fR(rs.em_aberto)) + '</b></p><table><thead><tr><th>Item</th><th>Vencimento</th><th>Pago em</th><th>Forma</th><th>Status</th><th class="r">Valor</th></tr></thead><tbody>' + linhas + '</tbody></table>');
      if (!ok) p.toast('Permita pop-ups para baixar o extrato.');
    };
    var imprimirRecibo = function (rc) {
      var ok = imprimirHtml('Recibo parcela ' + rc.numero, '<div class="box"><h1>Recibo de pagamento</h1><p class="sub">Tutts Entregas Rápidas · Locação de motos</p><table>' +
        [['Locatário', rc.nome + (rc.cpf_mascarado ? ' · CPF ' + rc.cpf_mascarado : '')], ['Contrato', rc.contrato_numero], ['Moto', (rc.moto || '') + ' · ' + (rc.placa || '')], ['Parcela', rc.numero], ['Vencimento', fD(rc.vencimento)], ['Pago em', fD(rc.pago_em)], ['Forma', rc.forma_label], ['Valor', fR(rc.valor)], ['Juros', fR(rc.juros)], ['Extras', fR(rc.extras)]]
          .map(function (l) { return '<tr><td>' + esc(l[0]) + '</td><td class="r">' + esc(l[1]) + '</td></tr>'; }).join('') +
        '<tr><td class="tot">Total pago</td><td class="r tot">' + esc(fR(rc.total)) + '</td></tr></table><p class="sub mono" style="margin-top:14px">Código ' + esc(rc.codigo || '') + '</p></div>');
      if (!ok) p.toast('Permita pop-ups para salvar o recibo.');
    };
    var chip = function (id, t, n) { var on = f === id; return h('button', { key: id, type: 'button', 'aria-pressed': on, onClick: function () { setF(id); }, style: { height: 34, padding: '0 14px', borderRadius: 99, border: '1px solid ' + (on ? '#e9d5f9' : '#e5e7eb'), background: on ? '#faf7fd' : '#fff', color: on ? ROXO_ESC : '#374151', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' } }, t, n != null ? ' ' + n : ''); };
    return h(React.Fragment, null,
      h('h1', { className: 'mm-h1' }, 'Pagamentos'),
      h('section', { className: 'mm-card', style: { flexDirection: 'row', padding: 0, gap: 0 } },
        h('div', { style: { flex: 1, padding: 14, borderRight: '1px solid #f3f4f6' } }, h('div', { style: { fontSize: 12, color: '#6b7280' } }, 'Pago até hoje'), h('div', { className: 'mm-sora mm-num', style: { fontSize: 20, fontWeight: 700 } }, fR(rs.pago_total)), h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, nPagas + ' parcela' + (nPagas === 1 ? '' : 's') + (nExtras ? ' + ' + nExtras + ' extra' + (nExtras === 1 ? '' : 's') : ''))),
        h('div', { style: { flex: 1, padding: 14 } }, h('div', { style: { fontSize: 12, color: '#6b7280' } }, 'Em aberto'), h('div', { className: 'mm-sora mm-num', style: { fontSize: 20, fontWeight: 700, color: num(rs.em_aberto) > 0 ? '#92400e' : '#111827' } }, fR(rs.em_aberto)), abertoExtra ? h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, (abertoExtra.descricao || 'extra').toLowerCase() + (abertoExtra.vencimento ? ' · vence ' + fDC(abertoExtra.vencimento) : '')) : null)),
      h('div', { style: { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 } }, chip('todos', 'Todos'), chip('pagos', 'Pagos'), chip('aberto', 'Em aberto'), chip('extras', 'Tarifas', nExtras)), // LOCACAO_V3
      grupos.length === 0 ? h('div', { className: 'mm-card' }, h('span', { className: 'mm-sub' }, 'Nada neste filtro.')) :
      grupos.map(function (g) {
        return h('section', { key: g.k, className: 'mm-card', style: { gap: 0, padding: 0, overflow: 'hidden' } },
          h('div', { style: { padding: '12px 14px 8px', fontSize: 11.5, fontWeight: 700, color: '#6b7280', letterSpacing: '.06em', textTransform: 'uppercase' } }, g.t),
          g.itens.map(function (x) {
            var ext = x.tipo === 'extra', pago = x.status === 'paga';
            var desc = ext ? [x.vencimento ? 'vence ' + fDC(x.vencimento) : null, x.descricao_cobranca || null].filter(Boolean).join(' · ')
              : pago ? [fDC(x.pago_em), x.forma_label || x.forma, num(x.juros) > 0 ? 'juros ' + fR(x.juros) : null, num(x.extras) > 0 ? 'extras ' + fR(x.extras) : null].filter(Boolean).join(' · ')
              : [x.vencimento ? 'vence ' + fDS(x.vencimento) : null, num(x.extras) > 0 ? 'inclui extras ' + fR(x.extras) : null].filter(Boolean).join(' · ');
            return h('div', { key: x.tipo + x.id, style: { display: 'flex', justifyContent: 'space-between', gap: 10, padding: '11px 14px', borderTop: '1px solid #f3f4f6', background: ext && !pago ? '#fffbeb' : '#fff' } },
              h('div', { style: { minWidth: 0, flex: 1 } },
                h('div', { style: { fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } }, ext ? (x.descricao || 'Extra') : x.tipo === 'antecipacao' ? (x.descricao || 'Antecipação') : 'Parcela ' + x.numero, ext ? h('span', { style: { fontSize: 11, fontWeight: 700, color: '#92400e' } }, x.tarifa_codigo || x.clausula ? 'Tarifário' : 'Extra') : null, Cl(x.clausula)),
                h('div', { style: { fontSize: 12, color: '#6b7280' } }, desc || '—', x.detalhes && x.detalhes.ait ? ' · AIT ' + x.detalhes.ait : '', x.detalhes && x.detalhes.local ? ' · ' + x.detalhes.local : ''),
                x.status === 'atrasada' && x.dias_atraso ? h('div', { style: { fontSize: 12, color: '#991b1b' } }, 'em atraso há ' + x.dias_atraso + ' dia' + (x.dias_atraso === 1 ? '' : 's')) : null,
                DetalheItens(x), // LOCACAO_V3: tarifas da parcela e encargos (multa + juros + IPCA)
                !pago && x.tipo === 'parcela' && (x.status === 'atrasada' || x.status === 'vence_hoje') ? h('button', { type: 'button', className: 'mm-lnk', style: { fontSize: 12.5, marginTop: 4 }, onClick: function () { p.copiarPix(x); } }, ico('copy', 14), 'Copiar PIX · ' + fR(x.total != null ? x.total : x.valor)) : null,
                (x.anexos || []).length ? h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 } }, x.anexos.map(function (a) { return h('button', { key: a.id, type: 'button', className: 'mm-lnk', style: { fontSize: 12.5 }, onClick: function () { abrirAnexo(x, a); } }, 'Ver ' + (a.nome || 'documento')); })) : null),
              h('div', { style: { textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flex: 'none' } },
                h('b', { className: 'mm-num' }, fR(x.total != null ? x.total : x.valor)),
                pago && x.tipo === 'parcela' ? h('button', { type: 'button', className: 'mm-lnk', style: { fontSize: 12.5 }, onClick: function () { abrirRecibo(x); } }, ico('download', 14), 'Recibo')
                  : pago ? Pill('Pago', 'verde') : h('span', { style: { fontSize: 12, fontWeight: 600, color: x.status === 'atrasada' ? '#991b1b' : '#92400e' } }, x.status_label || 'Em aberto')));
          }));
      }),
      h('div', { style: { fontSize: 12.5, color: '#6b7280', lineHeight: 1.5, textAlign: 'center' } }, 'Todas as tarifas seguem o Anexo I (Tarifário) do seu contrato. ', h('button', { type: 'button', className: 'mm-lnk', style: { fontSize: 12.5 }, onClick: function () { p.ir('contrato'); } }, 'Ver em Meu contrato')), // LOCACAO_V3
      h('button', { type: 'button', className: 'mm-btn sec', onClick: baixarExtrato }, ico('download', 18), 'Baixar extrato completo (PDF)'),
      recibo ? h(Sheet, { titulo: 'Recibo', onClose: function () { setRecibo(null); } }, recibo.carregando ? Carregando() : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 0 } },
        [['Parcela', recibo.numero], ['Contrato', recibo.contrato_numero], ['Moto', [recibo.moto, recibo.placa].filter(Boolean).join(' · ')], ['Vencimento', fD(recibo.vencimento)], ['Pago em', fD(recibo.pago_em)], ['Forma', recibo.forma_label], ['Valor', fR(recibo.valor)], ['Juros', num(recibo.juros) ? fR(recibo.juros) : '—'], ['Extras', num(recibo.extras) ? fR(recibo.extras) : '—']]
          .map(function (l, i) { return h('div', { key: i, className: 'mm-row', style: i === 0 ? { borderTop: 0 } : null }, h('span', { style: { color: '#6b7280' } }, l[0]), h('span', { className: 'mm-num', style: { textAlign: 'right' } }, l[1] != null && l[1] !== '' ? String(l[1]) : '—')); }),
        h('div', { className: 'mm-row' }, h('b', null, 'Total pago'), h('b', { className: 'mm-num', style: { fontSize: 16 } }, fR(recibo.total))),
        recibo.codigo ? h('div', { className: 'mm-mono', style: { fontSize: 11, color: '#9ca3af', margin: '6px 0 12px' } }, 'Código ' + recibo.codigo) : null,
        h('button', { type: 'button', className: 'mm-btn pri', onClick: function () { imprimirRecibo(recibo); } }, ico('download', 18), 'Salvar / imprimir recibo'))) : null,
      anexo ? h(Sheet, { titulo: anexo.titulo, onClose: function () { setAnexo(null); } }, !anexo.src ? Carregando() : /pdf/.test(anexo.mime || anexo.src.slice(0, 30))
        ? h('iframe', { src: anexo.src, title: anexo.titulo, style: { width: '100%', height: '65vh', border: 0, borderRadius: 10 } })
        : h('img', { src: anexo.src, alt: anexo.titulo, style: { width: '100%', borderRadius: 10 } })) : null);
  }

  // ───── Vistorias ─────
  function Vistorias(p) {
    var r = p.r, vist = r.vistorias || [], pend = r.vistoria_pendente;
    return h(React.Fragment, null,
      h('h1', { className: 'mm-h1' }, 'Vistorias'),
      pend ? h('section', { className: 'mm-card', style: { background: '#fffbeb', borderColor: '#fde68a' } },
        h('div', { style: { display: 'flex', gap: 8, color: '#92400e' } }, ico('clock', 18), h('div', null, h('b', null, pend.label || ((pend.tipo_label || 'Vistoria') + ' pendente até ' + fDS(pend.prazo))), h('div', { style: { fontSize: 12.5, marginTop: 2 } }, '6 fotos da moto + quilometragem. Leva uns 2 minutos.'))),
        pend.na_base ? h('div', { style: { fontSize: 12.5, color: '#92400e' } }, 'A vistoria de retirada é feita na Base, com a equipe' + (pend.base && pend.base.endereco ? ' · ' + pend.base.endereco : '') + '.') /* LOCACAO_FLUXO_V2 */
          : h('div', { style: { fontSize: 12.5, color: '#92400e' } }, 'Leve a moto na Base: a equipe da Tutts faz a vistoria com você.')) : null, /* LOCACAO_AJUSTES_V1 */
      h('section', { className: 'mm-card', style: { gap: 0 } },
        vist.length === 0 ? h('span', { className: 'mm-sub' }, 'Nenhuma vistoria ainda.') :
        vist.map(function (v, i) {
          return h('button', { key: v.id, type: 'button', className: 'mm-row', style: Object.assign({ width: '100%', textAlign: 'left' }, i === 0 ? { borderTop: 0 } : {}), onClick: function () { p.ir('verVist', { id: v.id }); } },
            h('div', null, h('div', { style: { fontWeight: 600 } }, (v.tipo_label || v.tipo) + (v.km != null ? ' · ' + num(v.km).toLocaleString('pt-BR') + ' km' : '')), h('div', { style: { fontSize: 12, color: '#6b7280' } }, fDC(v.criado_em) + ' · ' + (v.qtd_fotos || 0) + ' fotos')),
            Pill(v.status_label || ROT_VIST[v.status] || v.status, TOM_VIST[v.status] || 'cinza'));
        })),
      h('p', { className: 'mm-sub', style: { textAlign: 'center', fontSize: 12.5 } }, 'As vistorias são feitas pela equipe da Tutts na Base. Aqui você vê as fotos e os termos.')); /* LOCACAO_AJUSTES_V1 */
  }

  // ═════ LOCACAO_V3: contrato real · Meu contrato, vistoria Anexo IV ═════
  var CHECKLIST_PADRAO = ['Pintura / carenagens / tanque', 'Farol, lanterna, setas e luz de placa', 'Retrovisores (2)', 'Pneus (dianteiro / traseiro)', 'Freios (dianteiro / traseiro)', 'Kit relação (corrente, coroa, pinhão)', 'Painel, hodômetro e buzina', 'Escapamento e filtro de ar originais', 'Placa e lacre', 'Rastreador / bloqueador (lacre)', 'Bancos, rabeta e para-lamas', 'Chave principal / chave reserva', 'Antena corta-pipa / protetor de motor'];
  var POS_V3 = [['frente', '1. Frente', true], ['traseira', '2. Traseira', true], ['lateral_esq', '3. Lateral esquerda', true], ['lateral_dir', '4. Lateral direita', true], ['painel', '5. Painel e hodômetro', true], ['motor_chassi', '6. Motor e nº do chassi', true], ['avaria1', '7. Avaria (detalhe)', false], ['avaria2', '8. Avaria (detalhe)', false]];
  var POS_LABEL = { frente: 'Frente', traseira: 'Traseira', lateral_esq: 'Lateral esq.', lateral_dir: 'Lateral dir.', painel: 'Painel/hodômetro', motor_chassi: 'Motor/chassi', avaria1: 'Avaria 1', avaria2: 'Avaria 2', pneus: 'Pneus', extra: 'Extra' };
  var COMBUST = [['reserva', 'Reserva'], ['1/4', '1/4'], ['1/2', '1/2'], ['3/4', '3/4'], ['cheio', 'Cheio']];
  function itensChecklist(r) {
    var l = r && r.checklist_itens;
    if (!l || !l.length) return CHECKLIST_PADRAO;
    return l.map(function (x) { return typeof x === 'string' ? x : (x.item || x.nome || ''); }).filter(Boolean);
  }
  function baixarPdf(api, path, nome, toast) {
    return api(path, { raw: true }).then(function (res) { return res.blob(); }).then(function (b) {
      var u = URL.createObjectURL(b); var a = document.createElement('a'); a.href = u; a.download = nome || 'documento.pdf'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
    }).catch(function (e) { toast(e.message); });
  }
  /* LOCACAO_APP_CRLV_V1: abre o documento numa aba (para mostrar na hora, ex.: blitz); se o navegador bloquear, baixa */
  function abrirArquivo(api, path, nome, toast) {
    var w = null;
    try { w = window.open('', '_blank'); } catch (e) { w = null; }
    return api(path, { raw: true }).then(function (res) { return res.blob(); }).then(function (b) {
      var u = URL.createObjectURL(b);
      if (w && !w.closed) { try { w.opener = null; } catch (e) { /* ok */ } w.location.href = u; }
      else { var a = document.createElement('a'); a.href = u; a.download = nome || 'documento'; document.body.appendChild(a); a.click(); a.remove(); }
      setTimeout(function () { URL.revokeObjectURL(u); }, 60000);
    }).catch(function (e) { if (w) w.close(); toast(e.message); });
  }
  function Cl(t) { return t ? h('span', { style: { fontSize: 10.5, fontWeight: 700, color: '#6b7280', background: '#f3f4f6', borderRadius: 5, padding: '1px 5px', whiteSpace: 'nowrap' } }, /^cl/i.test(t) ? t : 'Cl. ' + t) : null; }
  function Rotulo(t) { return h('div', { style: { fontSize: 11.5, fontWeight: 700, color: '#6b7280', letterSpacing: '.06em', textTransform: 'uppercase' } }, t); }

  // ───── Meu contrato ─────
  function MeuContrato(p) {
    var r = p.r, mo = r.moto || {}, ct = r.contrato || {};
    var _d = useState(null), d = _d[0], setD = _d[1];
    var _e = useState(null), erro = _e[0], setErro = _e[1];
    var _t = useState(false), todos = _t[0], setTodos = _t[1];
    var _rg = useState(null), regra = _rg[0], setRegra = _rg[1];
    var _b = useState(false), env = _b[0], setEnv = _b[1];
    var _bx = useState(null), baixando = _bx[0], setBaixando = _bx[1];
    var carregar = useCallback(function () { setErro(null); p.api('/contrato').then(setD).catch(function (e) { setErro(e.message); }); }, []);
    useEffect(carregar, [carregar]);
    if (erro) return h(React.Fragment, null, Voltar('Voltar', p.voltar), h('div', { className: 'mm-card' }, h('b', null, 'Não foi possível carregar'), h('span', { className: 'mm-sub' }, erro), h('button', { type: 'button', className: 'mm-btn sec', onClick: carregar }, 'Tentar de novo')));
    if (!d) return h(React.Fragment, null, Voltar('Voltar', p.voltar), Carregando('Carregando seu contrato...'));
    var dm = d.demonstrativo || {}, op = d.opcao, dr = d.desconto_repasse || {}, tar = d.tarifario || [], docs = d.documentos || [], regras = d.regras || [];
    var linhas = [['Plano', dm.plano_label], ['Prazo', [dm.prazo_label, dm.inicio && dm.termino ? fD(dm.inicio) + ' → ' + fD(dm.termino) : null].filter(Boolean).join(' · ')], ['Parcela', dm.valor_parcela != null ? fR(dm.valor_parcela) + (dm.periodicidade === 'semanal' ? ' por semana' : dm.periodicidade === 'mensal' ? ' por mês' : '') : null], ['Vencimento', dm.vencimento_label], ['Caução', dm.caucao_label], ['Área de circulação', dm.area_label], ['Manutenção', dm.manutencao_label], ['Pagamento', dm.formas_pagamento_label], ['Base', dm.base_retirada]].filter(function (x) { return x[1]; });
    var pagas = num(ct.parcelas_pagas), totalP = num(ct.prazo_qtd || ct.semanas);
    var pctOp = totalP ? Math.max(0, Math.min(100, 100 * pagas / totalP)) : 0;
    var baixar = function (doc) {
      var path = doc.url || (doc.id === 'contrato' ? '/contrato/pdf' : doc.id === 'anexo_iv' && doc.vistoria_id ? '/vistorias/' + doc.vistoria_id + '/anexo-iv.pdf' : null);
      if (!path) { p.toast('Documento indisponível no momento.'); return; }
      setBaixando(doc.id);
      if (doc.ver) { abrirArquivo(p.api, path, doc.arquivo, p.toast).then(function () { setBaixando(null); }); return; } // LOCACAO_APP_CRLV_V1
      baixarPdf(p.api, path.replace(/^\/api\/locacao-minha/, ''), (doc.arquivo || doc.id) + '-' + (ct.numero || 'moto') + '.pdf', p.toast).then(function () { setBaixando(null); });
    };
    var mudarDesconto = function (v) {
      setEnv(true);
      p.api('/desconto-repasse', { method: 'POST', body: { autorizar: v } }).then(function () { p.toast(v ? 'Desconto em repasses autorizado.' : 'Autorização revogada. As parcelas seguem por Pix.'); carregar(); p.recarregar && p.recarregar(); })
        .catch(function (e) { p.toast(e.message); }).then(function () { setEnv(false); });
    };
    var tarVis = todos ? tar : tar.slice(0, 9);
    return h(React.Fragment, null,
      Voltar('Voltar', p.voltar),
      h('h1', { className: 'mm-h1' }, 'Meu contrato'),
      h('section', { className: 'mm-card', style: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 } },
        h(MotoImg, { src: mo.capa_thumb, tipo: mo.tipo, modelo: mo.modelo, cor: mo.cor, w: 92, h: 60, r: 10 }),
        h('div', { style: { minWidth: 0 } }, h('b', null, (mo.modelo || '') + (mo.cor ? ' · ' + String(mo.cor).toLowerCase() : '')), h('div', { style: { fontSize: 12.5, color: '#6b7280' } }, h('span', { className: 'mm-mono' }, mo.placa), ct.numero ? ' · contrato ' + ct.numero : ''))),
      h('section', { className: 'mm-card', style: { gap: 0 } },
        Rotulo('Demonstrativo do contrato'),
        h('div', { style: { height: 6 } }),
        linhas.map(function (l, i) { return h('div', { key: l[0], className: 'mm-row', style: Object.assign({ alignItems: 'flex-start' }, i === 0 ? { borderTop: 0 } : {}) }, h('span', { style: { color: '#6b7280', flex: 'none' } }, l[0]), h('span', { className: 'mm-num', style: { textAlign: 'right', fontWeight: 600 } }, l[1])); }),
        dm.locadora ? h('div', { style: { fontSize: 11.5, color: '#9ca3af', paddingTop: 8 } }, 'Locadora: ' + dm.locadora) : null),
      op ? h('section', { className: 'mm-card' },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 } }, h('b', null, 'Opção de compra'), Pill(op.status_label || (op.status === 'extinta' ? 'Extinta' : 'Em andamento') + (totalP ? ' · ' + pagas + ' de ' + totalP : ''), op.status === 'extinta' ? 'vermelho' : 'roxo')),
        op.status === 'extinta' ? h('div', { style: { fontSize: 13, color: '#991b1b' } }, 'O contrato foi encerrado antes do prazo e a opção de compra foi extinta (Cl. 6.3).') : h(React.Fragment, null,
          h('div', { style: { fontSize: 13, color: '#374151', lineHeight: 1.5 } }, 'Cumpra os ' + (dm.prazo_label || 'meses do contrato') + ' ', h('b', null, 'em dia'), ', sem débitos, e a moto pode ser sua pelo valor de exercício de ', h('b', null, op.valor_corrigido != null ? fR(op.valor_corrigido) : op.valor_label || (ct.valor_opcao_compra != null ? fR(ct.valor_opcao_compra) + ' + IPCA' : 'R$ 10,00 + IPCA')), ' (Anexo II).'),
          h('div', null,
            h('div', { style: { position: 'relative', height: 8, background: '#f3f4f6', borderRadius: 99 } }, h('div', { style: { position: 'absolute', left: 0, top: 0, bottom: 0, width: pctOp + '%', background: ROXO, borderRadius: 99 } })),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#6b7280', marginTop: 6 } }, h('span', null, pagas + ' de ' + totalP + ' parcelas'), h('span', null, 'aviso 30 dias antes do fim'))),
          op.pix_copia_cola && !op.pago_em ? h('button', { type: 'button', className: 'mm-btn pri', style: { height: 44 }, onClick: function () { copiar(op.pix_copia_cola).then(function (ok) { p.toast(ok ? 'PIX copiado. Cole no app do seu banco.' : 'Não deu para copiar.'); }); } }, ico('copy', 16), 'Copiar PIX do valor de exercício') : null,
          h('div', { style: { fontSize: 12, color: '#92400e', background: '#fffbeb', borderRadius: 10, padding: '8px 10px', lineHeight: 1.45 } }, 'Encerrar antes do prazo, ou rescisão por descumprimento, extingue a opção de compra (Cl. 6.3).'))) : null,
      docs.length ? h('section', { className: 'mm-card', style: { gap: 0 } },
        Rotulo('Documentos'),
        docs.map(function (dc, i) {
          return h('div', { key: dc.id + i, className: 'mm-row', style: i === 0 ? { borderTop: 0, marginTop: 4 } : null },
            h('div', { style: { display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 } }, h('span', { style: { width: 34, height: 34, borderRadius: 9, background: '#f3e8fb', color: ROXO_ESC, display: 'grid', placeItems: 'center', flex: 'none' } }, ico('filetext', 16)),
              h('div', { style: { minWidth: 0 } }, h('div', { style: { fontWeight: 600 } }, dc.titulo), dc.subtitulo ? h('div', { style: { fontSize: 12, color: '#6b7280' } }, dc.subtitulo) : null)),
            dc.disponivel === false ? h('span', { style: { fontSize: 12, color: '#9ca3af' } }, 'em breve') : h('button', { type: 'button', className: 'mm-lnk', disabled: baixando === dc.id, onClick: function () { baixar(dc); } }, ico(dc.ver ? 'eye' : 'download', 15), baixando === dc.id ? '...' : (dc.ver ? 'Abrir' : 'Baixar')));
        })) : null,
      tar.length ? h('section', { className: 'mm-card', style: { gap: 0 } },
        Rotulo('Tarifário · Anexo I'),
        tarVis.map(function (t, i) { return h('div', { key: i, className: 'mm-row', style: i === 0 ? { borderTop: 0, marginTop: 4 } : null }, h('span', { style: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', minWidth: 0 } }, t.evento, Cl(t.clausula)), h('b', { className: 'mm-num', style: { textAlign: 'right', fontSize: 13, flex: '0 0 auto', maxWidth: '45%', whiteSpace: String(t.valor_label || '').length < 16 ? 'nowrap' : 'normal' } }, t.valor_label)); }),
        tar.length > 9 ? h('button', { type: 'button', className: 'mm-lnk', style: { paddingTop: 10, alignSelf: 'flex-start' }, onClick: function () { setTodos(!todos); } }, todos ? 'Ver menos' : 'Ver os ' + tar.length + ' itens') : null) : null,
      dr.pode || dr.autorizado ? h('section', { className: 'mm-card' },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 } }, h('b', null, 'Desconto em repasses · Anexo III'), Pill(dr.autorizado ? 'Autorizado' : 'Não autorizado', dr.autorizado ? 'verde' : 'cinza')),
        h('div', { style: { fontSize: 13, color: '#374151', lineHeight: 1.5 } }, dr.autorizado ? 'Suas parcelas são descontadas dos repasses do app Tutts. Se o repasse não cobrir, o resto vai por Pix no vencimento. Você pode revogar quando quiser, sem afetar a locação.' : 'Se você faz entregas pelo app Tutts, pode autorizar que a parcela seja descontada dos seus repasses. É facultativo e pode ser revogado quando quiser, sem afetar a locação.'),
        dr.motivo && !dr.pode ? h('div', { style: { fontSize: 12.5, color: '#6b7280' } }, dr.motivo) : null,
        dr.pode !== false ? h('button', { type: 'button', className: dr.autorizado ? 'mm-btn sec' : 'mm-btn out', style: { height: 44 }, disabled: env, onClick: function () { if (dr.autorizado && !window.confirm('Revogar a autorização de desconto em repasses?')) return; mudarDesconto(!dr.autorizado); } }, env ? 'Salvando...' : dr.autorizado ? 'Revogar autorização' : 'Autorizar desconto') : null) : null,
      regras.length ? h('section', { className: 'mm-card', style: { gap: 0 } },
        Rotulo('Regras importantes'),
        regras.map(function (rg, i) {
          var ab = regra === i;
          return h('div', { key: i, style: { borderTop: i ? '1px solid #f3f4f6' : 0, marginTop: i ? 0 : 4 } },
            h('button', { type: 'button', 'aria-expanded': ab, onClick: function () { setRegra(ab ? null : i); }, style: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', textAlign: 'left', fontWeight: 600, fontSize: 13.5 } }, rg.titulo, ico(ab ? 'minus' : 'plus', 15, { color: '#9ca3af' })),
            ab ? h('div', { style: { fontSize: 13, color: '#374151', lineHeight: 1.5, paddingBottom: 12 } }, rg.texto) : null);
        })) : null,
      h('div', { style: { fontSize: 12.5, color: '#6b7280', lineHeight: 1.5, textAlign: 'center' } }, 'Dúvidas sobre o contrato? Fale com a Tutts pelo WhatsApp.'));
  }

  // Encargos e itens (tarifas) de um lançamento do extrato
  function DetalheItens(x) {
    var linhas = [];
    if (x.itens && x.itens.length) x.itens.forEach(function (it) { linhas.push([it.descricao, it.clausula, it.valor]); });
    if (x.encargos && x.status !== 'paga') {
      if (!linhas.length) linhas.push(['Parcela', null, x.valor]);
      if (num(x.encargos.multa) > 0) linhas.push(['Multa ' + (x.encargos.multa_pct != null ? String(x.encargos.multa_pct).replace('.', ',') + '%' : ''), '5.10 i', x.encargos.multa]);
      if (num(x.encargos.juros) > 0) linhas.push(['Juros 1% a.m. pro rata' + (x.dias_atraso ? ' (' + x.dias_atraso + ' dia' + (x.dias_atraso === 1 ? '' : 's') + ')' : ''), null, x.encargos.juros]);
      if (num(x.encargos.correcao) > 0) linhas.push(['Correção IPCA', null, x.encargos.correcao]);
    }
    if (!linhas.length) return null;
    return h('div', { style: { marginTop: 6, background: '#f9fafb', borderRadius: 10, padding: '6px 10px' } },
      linhas.map(function (l, i) { return h('div', { key: i, style: { display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, padding: '3px 0', color: '#374151' } }, h('span', { style: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' } }, l[0], Cl(l[1])), h('span', { className: 'mm-num', style: { whiteSpace: 'nowrap', flex: 'none' } }, fR(l[2]))); }));
  }

  // ───── Vistoria · Anexo IV (locatário) ─────
  function NovaVistoria(p) {
    var r = p.r, mo = r.moto || {}, vist = r.vistorias || [], pend = r.vistoria_pendente;
    var itens = itensChecklist(r);
    var _t = useState(p.tipo || 'revisao'), tipo = _t[0], setTipo = _t[1];
    var _f = useState({}), fotos = _f[0], setFotos = _f[1];
    var _k = useState(''), km = _k[0], setKm = _k[1];
    var _c = useState(null), comb = _c[0], setComb = _c[1];
    var _ck = useState({}), ck = _ck[0], setCk = _ck[1];
    var _dc = useState(false), decl = _dc[0], setDecl = _dc[1];
    var _s = useState(false), env = _s[0], setEnv = _s[1];
    var geo = useRef(null);
    useEffect(function () {
      try { if (navigator.geolocation) navigator.geolocation.getCurrentPosition(function (pos) { geo.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }; }, function () {}, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }); } catch (e) { /* ok */ }
    }, []);
    var obrig = POS_V3.filter(function (x) { return x[2]; });
    var nObr = obrig.filter(function (x) { return fotos[x[0]]; }).length;
    var pegar = function (pos, file) {
      var quando = new Date().toISOString();
      lerFoto(file, 1280, 0.8).then(function (u) { setFotos(function (x) { var m = Object.assign({}, x); m[pos] = { foto: u, capturada_em: quando }; return m; }); }).catch(function (e) { p.toast(e.message); });
    };
    var setItem = function (i, k, v) { setCk(function (x) { var n = Object.assign({}, x); n[i] = Object.assign({ situacao: null, obs: '' }, n[i] || {}); n[i][k] = v; return n; }); };
    var nAv = itens.filter(function (_, i) { return ck[i] && ck[i].situacao === 'avaria'; }).length;
    var nMarc = itens.filter(function (_, i) { return ck[i] && ck[i].situacao; }).length;
    var ckOk = nMarc === itens.length && itens.every(function (_, i) { return !(ck[i] && ck[i].situacao === 'avaria') || String(ck[i].obs || '').trim().length > 2; });
    var ultima = vist.find(function (v) { return v.km != null; });
    var faltas = [];
    if (nObr < obrig.length) faltas.push(obrig.length - nObr === 1 ? '1 foto' : (obrig.length - nObr) + ' fotos');
    if (km === '') faltas.push('km');
    if (!comb) faltas.push('combustível');
    if (!ckOk) faltas.push('checklist');
    if (!decl) faltas.push('declaração');
    var passo = nObr < obrig.length ? 1 : !ckOk || km === '' || !comb ? 2 : 3;
    var enviar = function () {
      setEnv(true);
      var g = geo.current || {};
      var checklist = itens.map(function (it, i) { var x = ck[i] || {}; return { item: it, situacao: x.situacao, obs: String(x.obs || '').trim() || null }; });
      var avs = checklist.filter(function (x) { return x.situacao === 'avaria'; });
      p.api('/vistorias', { method: 'POST', body: { tipo: tipo, km: parseInt(km, 10), combustivel: comb, checklist: checklist, avarias: [], sem_avarias: avs.length === 0, declaracao_aceita: true,
        avaria: avs.length > 0, observacoes: avs.length ? avs.map(function (x) { return x.item + ': ' + (x.obs || ''); }).join('; ') : null, lat: g.lat != null ? g.lat : null, lng: g.lng != null ? g.lng : null,
        fotos: POS_V3.filter(function (x) { return fotos[x[0]]; }).map(function (x) { return { posicao: x[0], foto: fotos[x[0]].foto, capturada_em: fotos[x[0]].capturada_em }; }) } })
        .then(function () { p.toast('Vistoria enviada. O time Tutts confere e o termo vai para assinatura.'); p.onOk(); })
        .catch(function (e) { p.toast(e.message); setEnv(false); });
    };
    var titulo = { retirada: 'Vistoria de entrega', devolucao: 'Vistoria de devolução', periodica: 'Vistoria mensal', revisao: 'Vistoria de revisão' }[tipo] || 'Nova vistoria';
    var etapa = function (n, t) { var on = passo === n, feito = passo > n; return h('div', { key: n, style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: on ? 700 : 600, color: on ? ROXO_ESC : feito ? '#166534' : '#9ca3af' } }, h('span', { style: { width: 22, height: 22, borderRadius: 99, display: 'grid', placeItems: 'center', fontSize: 11.5, background: on ? ROXO : feito ? '#16a34a' : '#f3f4f6', color: on || feito ? '#fff' : '#9ca3af' } }, feito ? ico('check', 12) : n), t); };
    return h(React.Fragment, null,
      Voltar('Voltar', p.voltar),
      h('div', null, h('h1', { className: 'mm-h1' }, titulo), h('p', { className: 'mm-sub' }, (mo.modelo || '') + ' · ' + (mo.placa || '') + ' · Anexo IV do contrato')),
      h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8 } }, etapa(1, 'Fotos'), etapa(2, 'Checklist'), etapa(3, 'Confirmar')),
      p.tipo ? null : h('section', { className: 'mm-card' }, h('b', null, 'Tipo de vistoria'), Seg(TIPOS_VIST, tipo, setTipo, 'Tipo de vistoria', 2),
        pend && pend.tipo === tipo ? h('div', { style: { fontSize: 12.5, color: '#6b7280' } }, pend.label || ('vence ' + fDS(pend.prazo))) : null),
      h('section', { className: 'mm-card' },
        h('div', { style: { display: 'flex', justifyContent: 'space-between' } }, h('b', null, 'Fotos da moto'), h('span', { style: { fontSize: 12.5, fontWeight: 700, color: nObr === obrig.length ? '#166534' : ROXO } }, nObr + ' de ' + obrig.length + ' obrigatórias')),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 } }, POS_V3.map(function (x) {
          var f = fotos[x[0]];
          return h('label', { key: x[0], style: { display: 'flex', flexDirection: 'column', gap: 4, cursor: 'pointer' } },
            h('input', { type: 'file', accept: 'image/*', capture: 'environment', className: 'mm-sr', onChange: function (e) { var fl = e.target.files && e.target.files[0]; e.target.value = ''; if (fl) pegar(x[0], fl); } }),
            h('div', { className: 'mm-foto', style: Object.assign({ aspectRatio: '4 / 3' }, f ? { background: '#111827' } : x[2] ? { background: '#faf7fd', border: '1.5px dashed #d8b4f0', color: ROXO } : { background: '#fafafa', border: '1.5px dashed #e5e7eb', color: '#9ca3af' }) },
              f ? h('img', { src: f.foto, alt: x[1] }) : h('span', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600 } }, ico('camera', 22), x[2] ? 'Tirar foto' : 'Opcional'),
              f ? h('span', { style: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 99, background: '#16a34a', color: '#fff', display: 'grid', placeItems: 'center' } }, ico('check', 14)) : null,
              f ? h('span', { style: { position: 'absolute', left: 6, bottom: 6, fontSize: 9.5, color: '#fff', background: 'rgba(17,24,39,.55)', borderRadius: 4, padding: '1px 4px' } }, fDC(f.capturada_em) + ' ' + fHM(f.capturada_em)) : null),
            h('span', { style: { fontSize: 12, color: f ? '#374151' : x[2] ? ROXO : '#6b7280', fontWeight: 600 } }, x[1]));
        })),
        h('div', { style: { fontSize: 12, color: '#6b7280', display: 'flex', gap: 6, alignItems: 'flex-start' } }, ico('pin', 14), 'Só pela câmera, com data, hora e localização. Fotos 7 e 8 são para detalhar avarias.')),
      h('section', { className: 'mm-card' },
        h('b', null, 'Quilometragem e combustível'),
        h(Campo, { label: 'Quilometragem atual', hint: ultima ? 'Última vistoria: ' + num(ultima.km).toLocaleString('pt-BR') + ' km em ' + fDC(ultima.criado_em) : null },
          h('div', { style: { position: 'relative' } }, h('input', { className: 'mm-inp', inputMode: 'numeric', value: km, onChange: function (e) { setKm(dig(e.target.value).slice(0, 7)); }, style: { paddingRight: 40 } }), h('span', { style: { position: 'absolute', right: 12, top: 13, color: '#6b7280' } }, 'km'))),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 5 } }, h('span', { style: { fontSize: 12.5, fontWeight: 600, color: '#374151' } }, 'Combustível'), Seg(COMBUST, comb, setComb, 'Combustível', 5))),
      h('section', { className: 'mm-card', style: { gap: 0 } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', paddingBottom: 8 } }, h('b', null, 'Checklist'), h('span', { style: { fontSize: 12.5, color: '#6b7280' } }, itens.length + ' itens' + (nAv ? ' · ' + nAv + ' avaria' + (nAv === 1 ? '' : 's') : ''))),
        itens.map(function (it, i) {
          var x = ck[i] || {};
          return h('div', { key: i, style: { borderTop: '1px solid #f3f4f6', padding: '10px 0', display: 'flex', flexDirection: 'column', gap: 8 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 } }, h('span', { style: { fontSize: 13, fontWeight: 500, flex: 1 } }, it),
              h('div', { style: { width: 150, flex: 'none' } }, Seg([['ok', 'OK'], ['avaria', 'Avaria']], x.situacao || null, function (v) { setItem(i, 'situacao', v); }, it, 2, x.situacao === 'avaria'))),
            x.situacao === 'avaria' ? h('input', { className: 'mm-inp', style: { height: 40, fontSize: 14 }, value: x.obs || '', placeholder: 'O que tem? Ex.: risco no tanque (foto 7)', 'aria-label': 'Descreva a avaria · ' + it, onChange: function (e) { setItem(i, 'obs', e.target.value); } }) : null);
        }),
        nMarc < itens.length ? h('button', { type: 'button', className: 'mm-lnk', style: { paddingTop: 10, alignSelf: 'flex-start' }, onClick: function () { var n = {}; itens.forEach(function (_, i) { n[i] = Object.assign({ obs: '' }, ck[i] || {}, { situacao: (ck[i] && ck[i].situacao) || 'ok' }); }); setCk(n); } }, 'Marcar os demais como OK') : null),
      h('label', { className: 'mm-card', style: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', cursor: 'pointer', background: '#faf7fd', borderColor: '#e9d5f9' } },
        h('input', { type: 'checkbox', checked: decl, onChange: function (e) { setDecl(e.target.checked); }, style: { width: 20, height: 20, accentColor: ROXO, marginTop: 1, flex: 'none' } }),
        h('span', { style: { fontSize: 13, lineHeight: 1.5, color: '#374151' } }, 'Declaro que vistoriei a moto, que as avarias estão registradas aqui e nas fotos e que a recebo no estado em que se encontra (Cl. 1.2.1).')),
      h('button', { type: 'button', className: 'mm-btn pri', disabled: faltas.length > 0 || env, onClick: enviar }, env ? 'Enviando...' : faltas.length ? 'Enviar vistoria (falta ' + faltas.join(', ') + ')' : 'Enviar vistoria'),
      h('p', { className: 'mm-sub', style: { textAlign: 'center', fontSize: 12.5 } }, 'Depois de enviar, o time Tutts confere e o termo vai para assinatura.'));
  }

  function VerVistoria(p) {
    var _v = useState(null), v = _v[0], setV = _v[1];
    useEffect(function () { p.api('/vistorias/' + p.id).then(function (r) { setV(r.vistoria); }).catch(function (e) { p.toast(e.message); p.voltar(); }); }, [p.id]);
    return h(React.Fragment, null,
      Voltar('Vistorias', p.voltar),
      !v ? Carregando() : h('section', { className: 'mm-card' },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, h('b', null, v.tipo_label || v.tipo), Pill(v.status_label || ROT_VIST[v.status], TOM_VIST[v.status] || 'cinza')),
        h('span', { className: 'mm-sub' }, fD(v.criado_em) + (v.km != null ? ' · ' + num(v.km).toLocaleString('pt-BR') + ' km' : '')),
        v.observacoes ? h('div', { style: { fontSize: 13, color: '#374151' } }, v.observacoes) : null,
        v.avaria_descricao ? h('div', { style: { fontSize: 13, color: '#991b1b', background: '#fef2f2', borderRadius: 10, padding: 10 } }, h('b', null, 'Avaria: '), v.avaria_descricao) : null,
        v.combustivel || (v.checklist && v.checklist.length) ? h('div', { style: { fontSize: 13, color: '#374151' } }, [v.combustivel ? 'Combustível ' + v.combustivel : null, v.checklist && v.checklist.length ? v.checklist.filter(function (x) { return x.situacao !== 'avaria'; }).length + ' itens OK · ' + v.checklist.filter(function (x) { return x.situacao === 'avaria'; }).length + ' com avaria' : null].filter(Boolean).join(' · ')) : null, // LOCACAO_V3
        (v.checklist || []).filter(function (x) { return x.situacao === 'avaria'; }).map(function (x, i) { return h('div', { key: 'ck' + i, style: { fontSize: 12.5, color: '#991b1b' } }, h('b', null, x.item + ': '), x.obs || 'avaria'); }),
        (v.avarias || []).map(function (a, i) { return h('div', { key: 'av' + i, style: { fontSize: 12.5, color: '#374151' } }, (i + 1) + '. ' + [a.local, a.descricao].filter(Boolean).join(' · ')); }),
        v.assinar_link ? h('a', { href: v.assinar_link, target: '_blank', rel: 'noopener noreferrer', className: 'mm-btn pri', style: { height: 44, textDecoration: 'none' } }, ico('pencil', 16), 'Assinar o termo no Autentique') : null, /* LOCACAO_FLUXO_V2 */
        v.assinado_em ? h('div', { style: { fontSize: 12.5, color: '#166534', fontWeight: 600 } }, 'Termo assinado em ' + fD(v.assinado_em)) : null,
        v.tem_anexo_pdf !== false && (v.checklist || v.tem_anexo_pdf) ? h('button', { type: 'button', className: 'mm-btn sec', style: { height: 42, fontSize: 14 }, onClick: function () { baixarPdf(p.api, '/vistorias/' + v.id + '/anexo-iv.pdf', 'anexo-iv-vistoria-' + v.id + '.pdf', p.toast); } }, ico('download', 16), 'Baixar termo · Anexo IV (PDF)') : null,
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 } }, (v.fotos || []).map(function (f) {
          var lab = POS_LABEL[f.posicao] || f.posicao;
          return h('div', { key: f.posicao }, h('div', { className: 'mm-foto', style: { background: '#f3f4f6' } }, f.thumb ? h('img', { src: f.thumb, alt: lab }) : null), h('div', { style: { fontSize: 11.5, textAlign: 'center', marginTop: 4, color: '#374151' } }, lab));
        }))));
  }

  // ───── Avisar problema ─────
  function Problema(p) {
    var mo = p.r.moto || {};
    var _t = useState(null), tipo = _t[0], setTipo = _t[1];
    var _u = useState(null), urg = _u[0], setUrg = _u[1];
    var _d = useState(''), desc = _d[0], setDesc = _d[1];
    var _f = useState([]), fotos = _f[0], setFotos = _f[1];
    var _g = useState(null), geo = _g[0], setGeo = _g[1];
    var _gs = useState(''), geoSt = _gs[0], setGeoSt = _gs[1];
    var _s = useState(false), env = _s[0], setEnv = _s[1];
    var _l = useState(null), avisos = _l[0], setAvisos = _l[1];
    var carregarAvisos = useCallback(function () { p.api('/avisos').then(function (r) { setAvisos(r.avisos || []); }).catch(function () { setAvisos([]); }); }, []);
    useEffect(carregarAvisos, [carregarAvisos]);
    var localizar = function () {
      if (!navigator.geolocation) { setGeoSt('Seu celular não informou a localização.'); return; }
      setGeoSt('Buscando sua localização...');
      navigator.geolocation.getCurrentPosition(function (pos) { setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude, prec: Math.round(pos.coords.accuracy || 0) }); setGeoSt(''); },
        function () { setGeoSt('Não deu para pegar a localização. Permita o acesso ou descreva onde você está.'); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
    };
    useEffect(localizar, []);
    var addFoto = function (file) {
      var quando = new Date().toISOString();
      lerFoto(file, 1280, 0.8).then(function (u) { setFotos(function (x) { return x.length >= 4 ? x : x.concat([{ foto: u, capturada_em: quando }]); }); }).catch(function (e) { p.toast(e.message); });
    };
    var ok = tipo && urg && desc.trim().length >= 5;
    var enviar = function () {
      setEnv(true);
      p.api('/avisos', { method: 'POST', body: { tipo: tipo, urgencia: urg, descricao: desc.trim(), fotos: fotos, lat: geo ? geo.lat : null, lng: geo ? geo.lng : null } })
        .then(function () { p.toast('Aviso enviado. A Tutts vai responder por aqui e no WhatsApp.'); setTipo(null); setUrg(null); setDesc(''); setFotos([]); carregarAvisos(); p.recarregar(); })
        .catch(function (e) { p.toast(e.message); }).then(function () { setEnv(false); });
    };
    return h(React.Fragment, null,
      Voltar('Minha moto', p.voltar),
      h('div', null, h('h1', { className: 'mm-h1' }, 'Avisar problema'), h('p', { className: 'mm-sub' }, (mo.modelo || '') + ' · ' + (mo.placa || ''))),
      h('section', { className: 'mm-card' }, h('b', null, 'O que aconteceu?'),
        h('div', { role: 'radiogroup', 'aria-label': 'Tipo do problema', style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 } }, TIPOS_AVISO.map(function (t) {
          var on = tipo === t[0];
          return h('button', { key: t[0], type: 'button', role: 'radio', 'aria-checked': on, onClick: function () { setTipo(t[0]); },
            style: { minHeight: 80, borderRadius: 12, border: on ? '1.5px solid ' + ROXO : '1px solid #e5e7eb', background: on ? '#faf7fd' : '#fff', color: on ? ROXO_ESC : '#374151', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, padding: 8, textAlign: 'center' } },
            ico(t[2], 20), t[1]);
        }))),
      h('section', { className: 'mm-card' },
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } }, h('b', null, 'Você consegue rodar?'), Seg([['rodando', 'Consigo rodar'], ['parada', 'Moto parada']], urg, setUrg, 'Urgência', 2, urg === 'parada')),
        h(Campo, { label: 'Descreva' }, h('textarea', { className: 'mm-inp', rows: 3, value: desc, placeholder: 'O que aconteceu e onde você está', onChange: function (e) { setDesc(e.target.value); } })),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
          h('span', { style: { fontSize: 12.5, fontWeight: 600, color: '#374151' } }, 'Fotos', h('span', { style: { color: '#9ca3af', fontWeight: 500 } }, ' · até 4')),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 } },
            fotos.map(function (f, i) { return h('div', { key: i, className: 'mm-foto', style: { background: '#111827' } }, h('img', { src: f.foto, alt: 'Foto ' + (i + 1) }),
              h('button', { type: 'button', 'aria-label': 'Remover foto', onClick: function () { setFotos(function (x) { return x.filter(function (_, j) { return j !== i; }); }); }, style: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 99, background: 'rgba(17,24,39,.65)', color: '#fff', display: 'grid', placeItems: 'center' } }, ico('x', 12))); }),
            fotos.length < 4 ? h('label', { className: 'mm-foto', style: { background: '#faf7fd', border: '1.5px dashed #d8b4f0', color: ROXO, cursor: 'pointer' } },
              h('input', { type: 'file', accept: 'image/*', capture: 'environment', className: 'mm-sr', onChange: function (e) { var fl = e.target.files && e.target.files[0]; e.target.value = ''; if (fl) addFoto(fl); } }), ico('camera', 20)) : null)),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
          h('span', { style: { fontSize: 12.5, fontWeight: 600, color: '#374151' } }, 'Onde você está'),
          h('div', { 'aria-hidden': 'true', style: { position: 'relative', height: 120, borderRadius: 12, overflow: 'hidden', background: '#eef0f3',
            backgroundImage: 'linear-gradient(90deg, transparent 47%, #fff 47%, #fff 53%, transparent 53%), linear-gradient(0deg, transparent 45%, #fff 45%, #fff 52%, transparent 52%), linear-gradient(35deg, transparent 60%, #fff 60%, #fff 64%, transparent 64%)', backgroundSize: '90px 90px, 70px 70px, 100% 100%' } },
            h('span', { style: { position: 'absolute', left: '50%', top: '42%', transform: 'translate(-50%,-50%)', color: geo ? '#dc2626' : '#9ca3af' } }, ico('pin', 30)),
            h('span', { style: { position: 'absolute', left: 8, bottom: 8, background: '#fff', borderRadius: 8, padding: '3px 8px', fontSize: 11.5, color: '#374151', maxWidth: 'calc(100% - 16px)' } },
              geo ? geo.lat.toFixed(5) + ', ' + geo.lng.toFixed(5) + (geo.prec ? ' · precisão ' + geo.prec + ' m' : '') : (geoSt || 'Localização não informada'))),
          h('button', { type: 'button', className: 'mm-btn sec', style: { height: 42, fontSize: 14 }, onClick: localizar }, ico('pin', 16), 'Usar minha localização'))),
      h('button', { type: 'button', className: 'mm-btn pri', disabled: !ok || env, onClick: enviar }, env ? 'Enviando...' : 'Enviar aviso para a Tutts'),
      avisos && avisos.length ? h('section', { className: 'mm-card', style: { gap: 0 } },
        h('div', { style: { fontSize: 11.5, fontWeight: 700, color: '#6b7280', letterSpacing: '.06em', textTransform: 'uppercase', paddingBottom: 8 } }, 'Últimos avisos'),
        avisos.slice(0, 5).map(function (a) {
          return h('div', { key: a.id, style: { borderTop: '1px solid #f3f4f6', padding: '10px 0', display: 'flex', flexDirection: 'column', gap: 6 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' } }, h('b', null, (a.tipo_label || a.tipo) + ' · ' + fDC(a.criado_em)), Pill(a.status_label || a.status, TOM_AVISO[a.status] || 'cinza')),
            a.resposta ? h('div', { style: { background: '#faf7fd', borderRadius: 10, padding: '8px 10px', fontSize: 12.5, color: '#374151' } }, h('b', { style: { color: ROXO_ESC } }, 'Tutts respondeu: '), a.resposta) : h('div', { style: { fontSize: 12.5, color: '#6b7280' } }, a.descricao));
        })) : null);
  }

  // ───── Mais ─────
  function Mais(p) {
    var r = p.r, cli = r.cliente || {}, ct = r.contrato || {}, mo = r.moto || {};
    return h(React.Fragment, null,
      h('h1', { className: 'mm-h1' }, 'Mais'),
      h('section', { className: 'mm-card', style: { gap: 0 } }, [
        ['Nome', cli.nome], ['Tipo', cli.tipo_label || (cli.tipo === 'tutts' ? 'Motoboy Tutts' : 'Locatário')], ['Contrato', ct.numero], ['Plano', ct.plano_label], ['Moto', [mo.modelo, mo.placa].filter(Boolean).join(' · ')], ['Vencimento', ct.vencimento_label || (ct.dia_label ? 'toda ' + ct.dia_label : '—')], [ct.plano === 'aluguel' ? 'Término' : 'Quitação prevista', fD(ct.termino || ct.ultimo_vencimento)]
      ].map(function (x, i) { return h('div', { key: i, className: 'mm-row', style: i === 0 ? { borderTop: 0 } : null }, h('span', { style: { color: '#6b7280' } }, x[0]), h('b', { style: { textAlign: 'right' } }, x[1] || '—')); })),
      h('button', { type: 'button', className: 'mm-btn out', onClick: function () { p.ir('contrato'); } }, ico('filetext', 18), 'Meu contrato'), // LOCACAO_V3
      h('button', { type: 'button', className: 'mm-btn sec', onClick: function () { p.ir('problema'); } }, ico('alert', 18), 'Avisar problema com a moto'),
      h('div', { style: { fontSize: 12.5, color: '#6b7280', lineHeight: 1.5 } }, 'Para mudar seus dados ou pedir cópia, correção ou exclusão (LGPD), fale com o time Tutts pelo WhatsApp.'),
      p.onLogout ? h('button', { type: 'button', className: 'mm-btn sec', onClick: p.onLogout }, ico('logout', 18), 'Sair') : null);
  }

  // ───── LOCACAO_ASSINATURA_V2: contrato pronto para assinar (o locatário assina pelo app) ─────
  function baixarPdfContrato(api, numero, toast) {
    api('/contrato/pdf', { raw: true }).then(function (res) { return res.blob(); }).then(function (b) {
      var u = URL.createObjectURL(b); var a = document.createElement('a'); a.href = u; a.download = 'contrato-' + (numero || 'moto') + '.pdf'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
    }).catch(function (e) { toast(e.message); });
  }
  function Passo(feito, texto) {
    return h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 } },
      feito ? h('span', { style: { width: 20, height: 20, borderRadius: 99, background: '#22c55e', color: '#fff', display: 'grid', placeItems: 'center', flex: 'none' } }, ico('check', 12))
        : h('span', { style: { width: 20, height: 20, borderRadius: 99, border: '2px solid #fff', boxSizing: 'border-box', flex: 'none' } }),
      feito ? h('span', null, texto) : h('b', null, texto));
  }
  function fDH(s) { var d = s ? new Date(String(s).replace(' ', 'T')) : null; return d && !isNaN(d) ? fDC(d) + ' às ' + fHM(d) : ''; }

  // ───── LOCACAO_FLUXO_V1: vistoria de entrega antes da assinatura + "recebemos sua assinatura · liberando" ─────
  var FLAG_RECEBIDA = 'tutts_loc_assinatura_recebida';
  function flagRecebida(numero, valor) {
    try {
      if (valor === undefined) return localStorage.getItem(FLAG_RECEBIDA) === String(numero || '');
      if (valor) localStorage.setItem(FLAG_RECEBIDA, String(numero || '')); else localStorage.removeItem(FLAG_RECEBIDA);
    } catch (e) { return false; }
    return valor;
  }
  function PassoClaro(estado, texto) {
    var ok = estado === 'ok', atual = estado === 'atual';
    return h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', fontSize: 12.5, color: ok || atual ? '#111827' : '#9ca3af' } },
      ok ? h('span', { style: { width: 20, height: 20, borderRadius: 99, background: '#22c55e', color: '#fff', display: 'grid', placeItems: 'center', flex: 'none' } }, ico('check', 12))
        : h('span', { style: { width: 20, height: 20, borderRadius: 99, border: '2px solid ' + (atual ? ROXO : '#d1d5db'), boxSizing: 'border-box', flex: 'none' } }),
      atual ? h('b', null, texto) : h('span', null, texto));
  }
  function VistoriaNaBase(p) {
    var r = p.r, mo = r.moto || {}, as = r.assinatura || {}, cli = r.cliente || {}, b = as.base;
    var nome1 = String(cli.nome || '').split(' ')[0];
    return h(React.Fragment, null,
      h('div', { className: 'mm-sora', style: { fontSize: 20, fontWeight: 700 } }, 'Olá' + (nome1 ? ', ' + nome1 : '')),
      h('section', { style: { background: '#fff', border: '2px solid ' + ROXO, borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 } },
        h('div', { style: { display: 'flex', gap: 10, alignItems: 'center' } },
          h('span', { style: { width: 38, height: 38, borderRadius: 12, background: '#f3e8fb', color: ROXO_ESC, display: 'grid', placeItems: 'center', flex: 'none' } }, ico('camera', 18)),
          h('div', null, h('div', { className: 'mm-sora', style: { fontSize: 16, fontWeight: 700 } }, 'Próximo passo: vistoria na Base'), h('div', { style: { fontSize: 12, color: '#6b7280' } }, 'Leve um documento com foto'))),
        b ? h('div', { style: { background: '#faf7fd', borderRadius: 12, padding: '10px 12px', fontSize: 12.5, lineHeight: 1.5 } }, h('b', null, b.nome || 'Base Tutts'), b.endereco ? h('div', null, b.endereco) : null) : null,
        h('div', { style: { fontSize: 12.5, color: '#374151', lineHeight: 1.5 } }, 'A equipe tira as fotos da moto com você. Depois disso o contrato chega aqui para você assinar.'),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
          PassoClaro('ok', 'Cadastro aprovado'), PassoClaro('atual', 'Vistoria de entrega'), PassoClaro('bloq', 'Assinar o contrato'), PassoClaro('bloq', 'Retirar a moto'))),
      h('section', { className: 'mm-card', style: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: '12px 14px' } },
        h(MotoImg, { src: mo.capa_thumb, tipo: mo.tipo, modelo: mo.modelo, cor: mo.cor, w: 64, h: 46, r: 10 }),
        h('div', { style: { flex: 1, minWidth: 0 } }, h('b', { style: { display: 'block' } }, (mo.modelo || '') + ' · ' + (mo.placa || '')), h('span', { className: 'mm-sub', style: { fontSize: 12 } }, 'Reservada para você')),
        Pill('Reservada', 'ambar')));
  }
  function ContratoLiberado(p) {
    return h(React.Fragment, null,
      h('section', { style: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 18, padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' } },
        h('span', { style: { width: 56, height: 56, borderRadius: 99, background: '#22c55e', color: '#fff', display: 'grid', placeItems: 'center' } }, ico('check', 28)),
        h('div', { className: 'mm-sora', style: { fontSize: 19, fontWeight: 700, color: '#166534' } }, 'Contrato assinado'),
        h('div', { style: { fontSize: 13, color: '#166534' } }, 'Você e a Tutts assinaram. A moto está liberada.')),
      h('section', { className: 'mm-card', style: { gap: 10 } },
        h('b', null, p.vistoriaFeita ? 'Próximo passo: retirar a moto' : 'Próximo passo: vistoria de retirada'),
        h('span', { className: 'mm-sub', style: { fontSize: 12.5 } }, p.vistoriaFeita ? 'A vistoria de entrega já está no contrato. As parcelas e o PIX aparecem em Pagamentos.' : '6 fotos + km + combustível + checklist. Leva uns 5 minutos.'),
        h('button', { type: 'button', className: 'mm-btn pri', onClick: function () { p.voltar(); p.recarregar(); } }, 'Ver minha moto')));
  }
  function AssinaturaRecebida(p) {
    var r = p.r, ct = r.contrato || {}, as = r.assinatura || {};
    var _st = useState({ loc: as.locatario_assinou_em || p.locEm || null, tut: as.tutts_assinou_em || null }), st = _st[0], setSt = _st[1];
    var _ok = useState(false), liberado = _ok[0], setLiberado = _ok[1];
    var _n = useState(5), seg = _n[0], setSeg = _n[1];
    var _t = useState(0), tent = _t[0], setTent = _t[1];
    var _c = useState(false), conf = _c[0], setConf = _c[1];
    var MAX = 36; /* 36 × 5 s ≈ 3 min */
    var conferir = useCallback(function () {
      setConf(true);
      return p.api('/assinatura/verificar', { method: 'POST', body: {} }).then(function (x) {
        if (x && x.assinado) { flagRecebida(ct.numero, null); setLiberado(true); return; }
        if (x && x.locatario_assinou_em) setSt(function (o) { return Object.assign({}, o, { loc: o.loc || x.locatario_assinou_em }); });
      }).catch(function () { /* tenta de novo */ }).then(function () { setConf(false); setTent(function (n) { return n + 1; }); setSeg(5); });
    }, [p.api, ct.numero]);
    useEffect(function () { flagRecebida(ct.numero, true); conferir(); }, []);
    useEffect(function () {
      if (liberado || tent >= MAX || conf) return;
      var id = setTimeout(function () { if (seg <= 1) conferir(); else setSeg(seg - 1); }, 1000);
      return function () { clearTimeout(id); };
    }, [seg, liberado, tent, conf]);
    if (liberado) return h(ContratoLiberado, { voltar: p.voltar, recarregar: p.recarregar, vistoriaFeita: as.etapa === 'assinatura' });
    var esgotou = tent >= MAX;
    var hm = function (v) { var d = v ? new Date(String(v).replace(' ', 'T')) : null; return d && !isNaN(d) ? ' · ' + fHM(d) : ''; };
    return h(React.Fragment, null,
      h('section', { className: 'mm-card', style: { alignItems: 'center', textAlign: 'center', gap: 12, padding: '22px 16px' } },
        esgotou ? h('span', { style: { width: 56, height: 56, borderRadius: 99, background: '#f3e8fb', color: ROXO_ESC, display: 'grid', placeItems: 'center' } }, ico('clock', 26)) : h('div', { className: 'mm-spin', role: 'presentation', style: { width: 56, height: 56, borderWidth: 5 } }),
        h('div', { className: 'mm-sora', style: { fontSize: 18, fontWeight: 700 } }, 'Recebemos sua assinatura'),
        h('div', { style: { fontSize: 13, color: '#6b7280', lineHeight: 1.5 } }, esgotou ? 'Está levando mais que o normal. A Tutts já foi avisada pelo Autentique; confira de novo em instantes.' : 'Estamos liberando seu contrato. Isso leva alguns segundos — pode deixar esta tela aberta.'),
        h('div', { style: { width: '100%', display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left', marginTop: 4 } },
          PassoClaro('ok', 'Você assinou' + hm(st.loc)),
          as.tutts_assina ? PassoClaro(st.tut ? 'ok' : 'atual', st.tut ? 'Tutts assinou' + hm(st.tut) : 'Tutts assinando…') : null,
          PassoClaro('atual', 'Liberando contrato e parcelas…')),
        esgotou ? h('button', { type: 'button', className: 'mm-btn out', disabled: conf, onClick: function () { setTent(0); conferir(); } }, ico('refresh', 16), conf ? 'Conferindo...' : 'Conferir agora')
          : h('div', { role: 'status', style: { fontSize: 11.5, color: '#9ca3af' } }, conf ? 'Conferindo...' : 'Conferindo de novo em ' + seg + ' s')),
      h('div', { style: { fontSize: 12, color: '#6b7280', textAlign: 'center', lineHeight: 1.5 } }, 'Se fechar o app, tudo bem: quando abrir de novo, já aparece liberado.'));
  }

  function AssinarHome(p) {
    var r = p.r, mo = r.moto || {}, ct = r.contrato || {}, as = r.assinatura || {}, cli = r.cliente || {};
    var nome1 = String(cli.nome || '').split(' ')[0];
    var porMes = ct.periodicidade === 'mensal' ? ' / mês' : ' / semana';
    var item = function (rot, val) { return h('div', null, h('div', { style: { color: '#e9d5f9', fontSize: 11 } }, rot), h('b', null, val)); };
    return h(React.Fragment, null,
      h('div', { className: 'mm-sora', style: { fontSize: 20, fontWeight: 700 } }, 'Olá' + (nome1 ? ', ' + nome1 : '')),
      h('section', { style: { background: 'linear-gradient(160deg,#3a1556,#770fa8)', color: '#fff', borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 10px 24px rgba(119,15,168,.25)' } },
        h('div', { style: { display: 'flex', gap: 10, alignItems: 'center' } },
          h('span', { style: { width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,.16)', display: 'grid', placeItems: 'center', flex: 'none' } }, ico('pencil', 18)),
          h('div', null, h('div', { className: 'mm-sora', style: { fontSize: 17, fontWeight: 700 } }, 'Seu contrato está pronto'), h('div', { style: { fontSize: 12.5, color: '#e9d5f9' } }, 'Assine para liberar a moto'))),
        h('div', { style: { background: 'rgba(255,255,255,.1)', borderRadius: 12, padding: '10px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', fontSize: 12.5 } },
          item('Plano', ct.plano_label || '—'), item('Parcela', fR(ct.valor_parcela) + porMes),
          item('Prazo', ct.prazo_label || '—'), item('1º vencimento', fD(ct.primeiro_vencimento))),
        as.disponivel ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
          as.tutts_assina ? Passo(!!as.tutts_assinou_em, as.tutts_assinou_em ? 'Tutts já assinou · ' + fDH(as.tutts_assinou_em) : 'Tutts assina em seguida') : null,
          Passo(false, 'Falta a sua assinatura')) : h('div', { style: { fontSize: 12.5, color: '#e9d5f9', display: 'flex', gap: 6, alignItems: 'center' } }, ico('clock', 14), 'O contrato está sendo preparado. Você recebe um aviso no WhatsApp quando estiver pronto.'),
        h('button', { type: 'button', disabled: !as.disponivel, onClick: function () { p.ir('assinar'); }, style: { height: 48, borderRadius: 12, background: '#fff', color: ROXO_ESC, fontWeight: 800, fontSize: 15, opacity: as.disponivel ? 1 : 0.55 } }, 'Revisar e assinar')),
      h('section', { className: 'mm-card', style: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: '12px 14px' } },
        h(MotoImg, { src: mo.capa_thumb, tipo: mo.tipo, modelo: mo.modelo, cor: mo.cor, w: 64, h: 46, r: 10 }),
        h('div', { style: { flex: 1, minWidth: 0 } }, h('b', { style: { display: 'block' } }, (mo.modelo || '') + ' · ' + (mo.placa || '')), h('span', { className: 'mm-sub', style: { fontSize: 12 } }, 'Reservada para você até a assinatura')),
        Pill('Reservada', 'ambar')),
      h('section', { className: 'mm-card', style: { gap: 8 } },
        h('b', null, 'Depois de assinar'),
        ['Você retira a moto na Base: a equipe faz a vistoria de retirada com você e o termo chega para assinar.', /* LOCACAO_FLUXO_V2 */ 'As parcelas e o PIX aparecem em Pagamentos.', 'O contrato assinado fica em Meu contrato para baixar.'].map(function (t, i) {
          return h('div', { key: i, style: { display: 'flex', gap: 8, color: '#374151', fontSize: 12.5 } }, h('span', { style: { color: ROXO, fontWeight: 700 } }, (i + 1) + '.'), t);
        })),
      h('p', { style: { margin: 0, textAlign: 'center', fontSize: 11.5, color: '#9ca3af', display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' } }, ico('lock', 13), 'Assinatura eletrônica com validade jurídica pelo Autentique'));
  }

  function AssinarRevisao(p) {
    var r = p.r, mo = r.moto || {}, ct = r.contrato || {}, as = r.assinatura || {};
    var _ok = useState(false), li = _ok[0], setLi = _ok[1];
    var _ab = useState(false), abrindo = _ab[0], setAbrindo = _ab[1];
    var _ab2 = useState(false), aberto = _ab2[0], setAberto = _ab2[1];
    var _vf = useState(false), conferindo = _vf[0], setConferindo = _vf[1];
    var _fim = useState(false), assinado = _fim[0], setAssinado = _fim[1];
    var _lk = useState(null), link = _lk[0], setLink = _lk[1];
    var conferir = function (silencioso) {
      if (conferindo) return;
      setConferindo(true);
      p.api('/assinatura/verificar', { method: 'POST', body: {} }).then(function (x) {
        if (x && x.assinado) { flagRecebida(ct.numero, null); setAssinado(true); }
        else if (x && x.locatario_assinou) { flagRecebida(ct.numero, true); p.ir('recebida', { locEm: x.locatario_assinou_em }); } // LOCACAO_FLUXO_V1
        else if (!silencioso) p.toast('Ainda não recebemos a sua assinatura. Termine no Autentique e confira de novo.');
      }).catch(function (e) { if (!silencioso) p.toast(e.message); }).then(function () { setConferindo(false); });
    };
    useEffect(function () {
      if (!aberto || assinado) return;
      var fn = function () { if (document.visibilityState === 'visible') conferir(true); };
      document.addEventListener('visibilitychange', fn); window.addEventListener('focus', fn);
      return function () { document.removeEventListener('visibilitychange', fn); window.removeEventListener('focus', fn); };
    }, [aberto, assinado]);
    var abrir = function () {
      setAbrindo(true);
      var w = null;
      try { w = window.open('', '_blank'); } catch (e) { w = null; }
      p.api('/assinatura/abrir', { method: 'POST', body: {} }).then(function (x) {
        if (x && x.assinado) { if (w) w.close(); setAssinado(true); return; }
        setLink(x.link); setAberto(true);
        if (w && !w.closed) { try { w.opener = null; } catch (e) { /* ok */ } w.location.href = x.link; } else window.location.href = x.link;
      }).catch(function (e) { if (w) w.close(); p.toast(e.message); }).then(function () { setAbrindo(false); });
    };
    if (assinado) return h(ContratoLiberado, { voltar: p.voltar, recarregar: p.recarregar, vistoriaFeita: as.etapa === 'assinatura' }); // LOCACAO_FLUXO_V1
    var linha = function (rot, val) { return h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderTop: '1px solid #f3f4f6', fontSize: 12.5 } }, h('span', { style: { color: '#6b7280' } }, rot), h('b', { style: { textAlign: 'right' } }, val || '—')); };
    var porMes = ct.periodicidade === 'mensal' ? ' por mês' : ' por semana';
    return h(React.Fragment, null,
      Voltar('Voltar', p.voltar),
      h('div', null, h('div', { className: 'mm-sora', style: { fontSize: 20, fontWeight: 700 } }, 'Revise antes de assinar'),
        h('span', { className: 'mm-sub', style: { fontSize: 12.5 } }, 'Contrato ' + (ct.numero || '') + ' · ' + (mo.modelo || '') + ' · ' + (mo.placa || ''))),
      h('section', { className: 'mm-card', style: { gap: 0, padding: '12px 14px' } }, Rotulo('Demonstrativo'),
        h('div', { style: { height: 4 } }),
        linha('Plano', ct.plano_label), linha('Prazo', (ct.prazo_label || '') + (ct.data_inicio ? ' · ' + fD(ct.data_inicio) + ' a ' + fD(ct.termino) : '')),
        linha('Parcela', fR(ct.valor_parcela) + porMes), linha('Vencimento', (ct.vencimento_label || '') + (ct.primeiro_vencimento ? ' · 1º em ' + fD(ct.primeiro_vencimento) : '')),
        linha('Caução', ct.caucao_label), linha('Área', ct.area_label), linha('Manutenção', ct.manutencao_label), linha('Pagamento', ct.formas_pagamento_label),
        ct.valor_opcao_compra != null ? linha('Opção de compra', fR(ct.valor_opcao_compra) + ' + IPCA no fim do prazo') : null),
      (as.regras || []).length ? h('section', { className: 'mm-card', style: { gap: 0, padding: '12px 14px' } }, Rotulo('O mais importante'),
        h('div', { style: { height: 4 } }),
        as.regras.map(function (g, i) {
          return h('div', { key: i, style: { display: 'flex', gap: 10, padding: '9px 0', borderTop: '1px solid #f3f4f6' } },
            h('span', { style: { width: 6, height: 6, borderRadius: 99, background: ROXO, marginTop: 6, flex: 'none' } }),
            h('div', null, h('b', { style: { fontSize: 12.5 } }, g.titulo), h('div', { style: { fontSize: 12.5, color: '#4b5563', lineHeight: 1.45 } }, g.texto)));
        })) : null,
      h('button', { type: 'button', className: 'mm-card', onClick: function () { baixarPdfContrato(p.api, ct.numero, p.toast); }, style: { flexDirection: 'row', alignItems: 'center', gap: 12, textAlign: 'left' } },
        h('span', { style: { width: 38, height: 38, borderRadius: 10, background: '#f3e8fb', color: ROXO_ESC, display: 'grid', placeItems: 'center', flex: 'none' } }, ico('filetext', 18)),
        h('div', { style: { flex: 1 } }, h('b', { style: { display: 'block' } }, 'Contrato completo'), h('span', { className: 'mm-sub', style: { fontSize: 12 } }, 'Demonstrativo, cláusulas e Anexos')),
        h('span', { style: { color: ROXO, fontWeight: 700 } }, 'Ler PDF')),
      h('p', { className: 'mm-sub', style: { margin: '-4px 2px 0', fontSize: 12, lineHeight: 1.45 } }, // AUTENTIQUE_CONFERIR_V1: o PDF daqui é a cópia para leitura
        as.tutts_assinou_em ? 'A Tutts já assinou em ' + fDH(as.tutts_assinou_em) + ' e a assinatura dela aparece no PDF. A sua entra quando você assinar no Autentique.' : 'As assinaturas aparecem no PDF conforme cada um assina no Autentique.'),
      h('label', { style: { display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, lineHeight: 1.45, background: '#fff', border: '1.5px solid ' + (li ? ROXO : '#e5e7eb'), borderRadius: 14, padding: 12, cursor: 'pointer' } },
        h('input', { type: 'checkbox', checked: li, onChange: function (e) { setLi(e.target.checked); }, style: { width: 20, height: 20, accentColor: ROXO, flex: 'none', marginTop: 1 } }),
        'Li o contrato e entendi as regras de pagamento, atraso, vistoria' + (ct.plano === 'conquista' ? ' e opção de compra.' : '.')),
      h('button', { type: 'button', className: 'mm-btn pri', disabled: !li || abrindo || !as.disponivel, onClick: abrir, style: { height: 52 } }, ico('pencil', 18), abrindo ? 'Abrindo...' : aberto ? 'Abrir o Autentique de novo' : 'Assinar no Autentique'),
      aberto ? h('button', { type: 'button', className: 'mm-btn out', disabled: conferindo, onClick: function () { conferir(false); } }, ico('refresh', 16), conferindo ? 'Conferindo...' : 'Já assinei, conferir') : null,
      aberto && link ? h('p', { className: 'mm-sub', style: { textAlign: 'center', fontSize: 12 } }, 'A página não abriu? ', h('a', { href: link, target: '_blank', rel: 'noopener noreferrer', style: { color: ROXO, fontWeight: 600 } }, 'Toque aqui')) : null,
      h('p', { className: 'mm-sub', style: { textAlign: 'center', fontSize: 12 } }, 'Abre a página segura do Autentique, só para você. Depois de assinar, volte para o app: a moto é liberada na hora.'));
  }

  // ───── componente principal ─────
  window.ModuloMinhaMotoComponent = function (props) {
    injetarCss();
    var api = useCallback(criarApi(props), [props.API_URL]);
    var _r = useState(null), r = _r[0], setR = _r[1];
    var _e = useState(null), erro = _e[0], setErro = _e[1];
    var _a = useState('home'), aba = _a[0], setAba = _a[1];
    var _t = useState(null), tela = _t[0], setTela = _t[1];
    var _m = useState(false), menu = _m[0], setMenu = _m[1];
    var _ts = useState(null), msg = _ts[0], setMsg = _ts[1];
    var tRef = useRef(null);
    var toast = useCallback(function (m) {
      if (props.showToast && props.embutido) { props.showToast(m, 'info'); return; }
      setMsg(m); clearTimeout(tRef.current); tRef.current = setTimeout(function () { setMsg(null); }, 2800);
    }, []);
    var carregar = useCallback(function () {
      setErro(null);
      api('/resumo').then(setR).catch(function (e) { setErro(e); });
    }, [api]);
    useEffect(carregar, [carregar]);
    var ir = function (t, extra) { setTela(Object.assign({ t: t }, extra || {})); try { window.scrollTo(0, 0); } catch (e) { /* ok */ } };
    var voltar = function () { setTela(null); try { window.scrollTo(0, 0); } catch (e) { /* ok */ } };
    var copiarPix = function (parc) {
      var go = function (code) { copiar(code).then(function (ok) { toast(ok ? 'PIX copia-e-cola copiado. Cole no app do seu banco.' : 'Não deu para copiar. Tente de novo.'); }); };
      if (parc.pix_copia_cola) return go(parc.pix_copia_cola);
      api('/parcelas/' + parc.id + '/pix', { method: 'POST', body: {} }).then(function (x) { go(x.pix_copia_cola); carregar(); }).catch(function (e) { toast(e.message); });
    };
    var nome = (props.usuario && (props.usuario.fullName || props.usuario.full_name || props.usuario.nome)) || (r && r.cliente && r.cliente.nome) || '';
    var corpo;
    if (erro) corpo = h('div', { className: 'mm-main' }, h('section', { className: 'mm-card' }, h('b', null, erro.status === 403 ? 'Acesso não liberado' : 'Não foi possível carregar'), h('span', { className: 'mm-sub' }, erro.message), h('button', { type: 'button', className: 'mm-btn sec', onClick: carregar }, 'Tentar de novo')));
    else if (!r) corpo = Carregando('Carregando sua moto...');
    else if (!r.tem_contrato) corpo = h('div', { className: 'mm-main' }, h('section', { className: 'mm-card', style: { alignItems: 'center', textAlign: 'center', padding: '28px 18px' } },
      h('span', { style: { width: 56, height: 56, borderRadius: 99, background: '#f3e8fb', color: ROXO_ESC, display: 'grid', placeItems: 'center' } }, ico('bike', 26)),
      h('b', { className: 'mm-sora', style: { fontSize: 18 } }, 'Nenhuma moto em contrato'), h('p', { className: 'mm-sub' }, 'Quando seu contrato de locação estiver ativo, a moto, as parcelas e as vistorias aparecem aqui.')));
    else if (r.precisa_ciencia) corpo = h(Ciencia, { api: api, toast: toast, versao: r.termo_versao, onOk: carregar });
    else if (r.assinatura && r.assinatura.pendente) { /* LOCACAO_ASSINATURA_V2: só o fluxo de assinatura até assinar */
      var comumA = { r: r, api: api, toast: toast, ir: ir, voltar: voltar, recarregar: carregar };
      corpo = h('main', { className: 'mm-main', onClick: function () { if (menu) setMenu(false); } },
        r.assinatura.etapa === 'vistoria' ? h(VistoriaNaBase, comumA) // LOCACAO_FLUXO_V1
          : (tela && tela.t === 'recebida') || r.assinatura.locatario_assinou_em || flagRecebida(r.contrato && r.contrato.numero) ? h(AssinaturaRecebida, Object.assign({ locEm: tela && tela.locEm }, comumA))
          : tela && tela.t === 'assinar' ? h(AssinarRevisao, comumA) : h(AssinarHome, comumA));
    }
    else {
      var comum = { r: r, api: api, toast: toast, ir: ir, voltar: voltar, recarregar: carregar, copiarPix: copiarPix, onLogout: props.onLogout };
      var conteudo;
      if (tela && tela.t === 'antecipar') conteudo = h(Antecipar, comum);
      else if (tela && tela.t === 'problema') conteudo = h(Problema, comum);
      else if (tela && tela.t === 'vistoria') conteudo = h(NovaVistoria, Object.assign({ tipo: tela.tipo, onOk: function () { setTela(null); setAba('vist'); carregar(); } }, comum));
      else if (tela && tela.t === 'verVist') conteudo = h(VerVistoria, Object.assign({ id: tela.id }, comum));
      else if (tela && tela.t === 'contrato') conteudo = h(MeuContrato, comum); // LOCACAO_V3
      else if (aba === 'pag') conteudo = h(Pagamentos, comum);
      else if (aba === 'vist') conteudo = h(Vistorias, comum);
      else if (aba === 'mais') conteudo = h(Mais, comum);
      else conteudo = h(Home, comum);
      var navItem = function (id, t, ic) { return h('button', { key: id, type: 'button', 'aria-current': !tela && aba === id ? 'page' : null, onClick: function () { setTela(null); setAba(id); try { window.scrollTo(0, 0); } catch (e) { /* ok */ } } }, ic, t); };
      corpo = h(React.Fragment, null,
        h('main', { className: 'mm-main', onClick: function () { if (menu) setMenu(false); } }, conteudo),
        h('nav', { className: 'mm-nav', 'aria-label': 'Navegação da Minha moto' }, h('div', null,
          navItem('home', 'Minha moto', ico('bike', 22)), navItem('pag', 'Pagamentos', ico('card', 22)), navItem('vist', 'Vistorias', ico('camera', 22)), navItem('mais', 'Mais', pontos(22)))));
    }
    return h('div', { className: 'mm' },
      h('div', { className: 'mm-wrap' },
        h('header', { className: 'mm-top' },
          props.embutido && props.onVoltar ? h('button', { type: 'button', onClick: props.onVoltar, 'aria-label': 'Voltar ao início', style: { width: 34, height: 34, borderRadius: 9, background: 'rgba(255,255,255,.14)', display: 'grid', placeItems: 'center', color: '#fff', flex: 'none' } }, ico('arrowleft', 18)) : h('span', { className: 'mm-logo' }, 'T'),
          h('div', { style: { flex: 1, minWidth: 0, lineHeight: 1.2 } }, h('div', { style: { fontWeight: 700, fontSize: 15 } }, 'Central Tutts'), h('div', { style: { fontSize: 12, color: '#e9d5f9' } }, props.embutido ? 'Minha moto' : 'Locação de motos')),
          h('div', { style: { position: 'relative' } },
            h('button', { type: 'button', className: 'mm-av', 'aria-label': 'Menu da conta', 'aria-expanded': menu, onClick: function () { setMenu(!menu); } }, iniciais(nome) || 'EU'),
            menu ? h('div', { style: { position: 'absolute', right: 0, top: 40, zIndex: 30, background: '#fff', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 12px 30px -12px rgba(17,24,39,.25)', padding: 6, minWidth: 180 } },
              props.embutido && props.onVoltar ? h('button', { type: 'button', onClick: function () { setMenu(false); props.onVoltar(); }, style: { display: 'flex', gap: 8, alignItems: 'center', padding: '10px 12px', width: '100%', borderRadius: 8 } }, ico('home', 16), 'Voltar ao início') : null,
              props.onLogout ? h('button', { type: 'button', onClick: props.onLogout, style: { display: 'flex', gap: 8, alignItems: 'center', padding: '10px 12px', width: '100%', borderRadius: 8 } }, ico('logout', 16), 'Sair') : null) : null)),
        corpo),
      msg ? h('div', { className: 'mm-toast', role: 'status' }, msg) : null);
  };

  // ───── card na home do motoboy ─────
  window.MinhaMotoCard = function (props) {
    injetarCss();
    var api = useCallback(criarApi(props), [props.API_URL]);
    var _r = useState(null), r = _r[0], setR = _r[1];
    useEffect(function () { api('/resumo').then(setR).catch(function () { setR({ tem_contrato: false }); }); }, [api]);
    if (!r || !r.tem_contrato) return null;
    var mo = r.moto || {}, ct = r.contrato || {}, prox = r.proxima_parcela, pend = r.vistoria_pendente, qf = r.quanto_falta || {};
    var dias = pend ? (pend.dias_restantes != null ? pend.dias_restantes : Math.round((pd(pend.prazo) - new Date(new Date().toDateString())) / 864e5)) : null;
    var abrir = function () { if (props.onAbrir) props.onAbrir(); };
    if (!r.precisa_ciencia && r.assinatura && r.assinatura.pendente && (r.assinatura.etapa === 'vistoria' || r.assinatura.locatario_assinou_em || flagRecebida(ct.numero))) { /* LOCACAO_FLUXO_V1 */
      var emVist = r.assinatura.etapa === 'vistoria', bs = r.assinatura.base;
      return h('div', { className: 'mm', style: { minHeight: 0, background: 'transparent', marginBottom: 16 } },
        h('button', { type: 'button', onClick: abrir, 'aria-label': emVist ? 'Ver próximo passo da moto: vistoria na Base' : 'Ver liberação do contrato da moto', style: { width: '100%', textAlign: 'left', background: '#fff', border: '2px solid ' + ROXO, borderRadius: 16, overflow: 'hidden', display: 'block', padding: 0 } },
          h('div', { style: { display: 'flex', gap: 12, padding: 14, alignItems: 'center' } },
            h('span', { style: { width: 44, height: 44, borderRadius: 12, background: '#f3e8fb', color: ROXO_ESC, display: 'grid', placeItems: 'center', flex: 'none' } }, emVist ? ico('camera', 20) : h('div', { className: 'mm-spin', style: { width: 22, height: 22, borderWidth: 3 } })),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { fontSize: 11, fontWeight: 800, letterSpacing: '.06em', color: ROXO } }, 'MINHA MOTO'),
              h('b', { style: { display: 'block', fontSize: 15 } }, emVist ? 'Próximo passo: vistoria na Base' : 'Recebemos sua assinatura'),
              h('div', { style: { fontSize: 12, color: '#6b7280' } }, emVist ? (bs ? (bs.nome || 'Base Tutts') + (bs.endereco ? ' · ' + bs.endereco : '') : 'Leve um documento com foto') : 'Liberando seu contrato · ' + (mo.modelo || '') + ' · ' + (mo.placa || '')))),
          h('div', { style: { borderTop: '1px solid #f3f4f6', background: '#faf7fd', padding: 10, textAlign: 'center', color: ROXO_ESC, fontWeight: 700, fontSize: 13.5, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4 } }, emVist ? 'Ver detalhes' : 'Acompanhar', ico('arrowright', 14))));
    }
    if (!r.precisa_ciencia && r.assinatura && r.assinatura.pendente) { /* LOCACAO_ASSINATURA_V2 */
      return h('div', { className: 'mm', style: { minHeight: 0, background: 'transparent', marginBottom: 16 } },
        h('button', { type: 'button', onClick: abrir, 'aria-label': 'Revisar e assinar o contrato da moto', style: { width: '100%', textAlign: 'left', background: 'linear-gradient(160deg,#3a1556,#770fa8)', color: '#fff', border: 0, borderRadius: 16, overflow: 'hidden', display: 'block', padding: 0 } },
          h('div', { style: { display: 'flex', gap: 12, padding: 14, alignItems: 'center' } },
            h('span', { style: { width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,.16)', display: 'grid', placeItems: 'center', flex: 'none' } }, ico('pencil', 20)),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { fontSize: 11, fontWeight: 800, letterSpacing: '.06em', color: '#e9d5f9' } }, 'MINHA MOTO'),
              h('b', { style: { display: 'block', fontSize: 15 } }, 'Contrato pronto para assinar'),
              h('div', { style: { fontSize: 12, color: '#e9d5f9' } }, (mo.modelo || '') + ' · ' + (mo.placa || '') + (ct.valor_parcela != null ? ' · ' + fR(ct.valor_parcela) + (ct.periodicidade === 'mensal' ? '/mês' : '/semana') : '')))),
          h('div', { style: { borderTop: '1px solid rgba(255,255,255,.18)', padding: 10, textAlign: 'center', fontWeight: 700, fontSize: 13.5, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4 } }, 'Revisar e assinar', ico('arrowright', 14))));
    }
    return h('div', { className: 'mm', style: { minHeight: 0, background: 'transparent', marginBottom: 16 } },
      h('button', { type: 'button', onClick: abrir, 'aria-label': 'Abrir Minha moto', style: { width: '100%', textAlign: 'left', background: '#fff', border: '2px solid ' + ROXO, borderRadius: 16, overflow: 'hidden', display: 'block', padding: 0 } },
        r.precisa_ciencia ? h('div', { style: { padding: 14, display: 'flex', gap: 12, alignItems: 'center' } },
          h('span', { style: { width: 44, height: 44, borderRadius: 12, background: '#f3e8fb', color: ROXO_ESC, display: 'grid', placeItems: 'center', flex: 'none' } }, ico('bike', 22)),
          h('div', { style: { flex: 1 } }, h('div', { style: { fontSize: 11, fontWeight: 800, letterSpacing: '.06em', color: ROXO } }, 'MINHA MOTO'), h('b', { style: { display: 'block' } }, 'Dê ciência ao termo de dados para ver sua moto')))
        : h('div', null,
          h('div', { style: { display: 'flex', gap: 12, padding: 12, alignItems: 'center' } },
            h(MotoImg, { src: mo.capa_thumb, tipo: mo.tipo, modelo: mo.modelo, cor: mo.cor, w: 110, h: 72, r: 10 }),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 } }, h('span', { style: { fontSize: 11, fontWeight: 800, letterSpacing: '.06em', color: ROXO } }, 'MINHA MOTO'), Pill(ct.situacao_label || '—', TOM_SIT[ct.situacao] || 'cinza')),
              h('div', { style: { fontWeight: 700, fontSize: 15 } }, (mo.modelo || '') + ' · ' + (mo.placa || '')),
              h('div', { style: { fontSize: 12, color: '#6b7280' } }, (ct.parcelas_pagas || 0) + ' de ' + (ct.prazo_qtd || ct.semanas || 0) + ' parcelas' + (qf.valor_restante != null ? ' · faltam ' + fR(qf.valor_restante) : '')))),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #f3f4f6' } },
            h('div', { style: { padding: '10px 12px', borderRight: '1px solid #f3f4f6' } },
              h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, 'Próxima parcela'),
              prox ? h('b', { className: 'mm-num', style: { display: 'block' } }, fR(prox.total)) : h('b', null, '—'),
              prox ? h('div', { style: { fontSize: 11.5, color: prox.abatimento_repasse ? '#166534' : '#6b7280' } }, prox.abatimento_repasse ? 'abatida do repasse' + (prox.repasse_previsto ? ' de ' + fDS(prox.repasse_previsto) : '') : 'vence ' + fDS(prox.vencimento)) : null),
            h('div', { style: { padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center' } },
              pend ? h(Anel, { valor: Math.max(0, dias), rotulo: 'dias', frac: Math.max(0.08, Math.min(1, (dias || 0) / 30)), tam: 44 }) : h('span', { style: { color: '#16a34a' } }, ico('check', 20)),
              h('div', { style: { minWidth: 0 } }, h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, 'Vistoria'), h('b', { style: { fontSize: 12.5 } }, pend ? (pend.tipo_label || 'Vistoria') + ' até ' + fDC(pend.prazo) : 'Em dia')))),
          h('div', { style: { borderTop: '1px solid #f3f4f6', background: '#faf7fd', padding: 10, textAlign: 'center', color: ROXO_ESC, fontWeight: 700, fontSize: 13.5, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4 } }, 'Abrir Minha moto', ico('arrowright', 14)))));
  };

  // ───── 1º acesso do locatário (tela de login) ─────
  window.LocPrimeiroAcesso = function (props) {
    injetarCss();
    var api = useCallback(criarApi(props), [props.API_URL]);
    var _p = useState(1), passo = _p[0], setPasso = _p[1];
    var _c = useState(props.cpf && dig(props.cpf).length === 11 ? mCPF(props.cpf) : ''), cpf = _c[0], setCpf = _c[1];
    var _k = useState(''), cod = _k[0], setCod = _k[1];
    var _s = useState(''), senha = _s[0], setSenha = _s[1];
    var _s2 = useState(''), senha2 = _s2[0], setSenha2 = _s2[1];
    var _e = useState(null), erro = _e[0], setErro = _e[1];
    var _w = useState(null), wa = _w[0], setWa = _w[1];
    var _b = useState(false), env = _b[0], setEnv = _b[1];
    var solicitar = function () {
      setErro(null); setEnv(true);
      api('/primeiro-acesso/solicitar', { method: 'POST', publico: true, body: { cpf: dig(cpf) } })
        .then(function (r) { setWa(r.whatsapp_final || null); setPasso(2); }).catch(function (e) { setErro(e.message); }).then(function () { setEnv(false); });
    };
    var confirmar = function () {
      setErro(null); setEnv(true);
      api('/primeiro-acesso/confirmar', { method: 'POST', publico: true, body: { cpf: dig(cpf), codigo: dig(cod), senha: senha } })
        .then(function () { setPasso(3); }).catch(function (e) { setErro(e.message); }).then(function () { setEnv(false); });
    };
    var conteudo;
    if (passo === 1) conteudo = h(React.Fragment, null,
      h('p', { className: 'mm-sub' }, 'Para locatário de moto Tutts. Informe seu CPF e enviaremos um código para o WhatsApp do seu cadastro.'),
      h(Campo, { label: 'CPF', erro: cpf && dig(cpf).length === 11 && !cpfOk(cpf) ? 'CPF inválido' : null }, h('input', { className: 'mm-inp', inputMode: 'numeric', autoComplete: 'username', value: cpf, placeholder: '000.000.000-00', onChange: function (e) { setCpf(mCPF(e.target.value)); } })),
      h('button', { type: 'button', className: 'mm-btn pri', disabled: !cpfOk(cpf) || env, onClick: solicitar }, env ? 'Enviando...' : 'Receber código no WhatsApp'));
    else if (passo === 2) conteudo = h(React.Fragment, null,
      h('p', { className: 'mm-sub' }, 'Enviamos um código de 6 números' + (wa ? ' para o WhatsApp ' + wa : ' para o WhatsApp do seu cadastro') + '. Ele vale por 48 horas.'),
      h(Campo, { label: 'Código' }, h('input', { className: 'mm-inp mm-mono', inputMode: 'numeric', autoComplete: 'one-time-code', value: cod, maxLength: 6, onChange: function (e) { setCod(dig(e.target.value).slice(0, 6)); }, style: { letterSpacing: '.3em', fontSize: 20, textAlign: 'center' } })),
      h(Campo, { label: 'Crie uma senha', hint: 'Mínimo 8 caracteres.' }, h('input', { className: 'mm-inp', type: 'password', autoComplete: 'new-password', value: senha, onChange: function (e) { setSenha(e.target.value); } })),
      h(Campo, { label: 'Repita a senha', erro: senha2 && senha2 !== senha ? 'As senhas não são iguais' : null }, h('input', { className: 'mm-inp', type: 'password', autoComplete: 'new-password', value: senha2, onChange: function (e) { setSenha2(e.target.value); } })),
      h('button', { type: 'button', className: 'mm-btn pri', disabled: cod.length !== 6 || senha.length < 8 || senha !== senha2 || env, onClick: confirmar }, env ? 'Salvando...' : 'Criar senha'),
      h('button', { type: 'button', className: 'mm-lnk', style: { alignSelf: 'center' }, onClick: function () { setPasso(1); setCod(''); } }, 'Não recebi o código'));
    else conteudo = h(React.Fragment, null,
      h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center', padding: '6px 0' } },
        h('span', { style: { width: 52, height: 52, borderRadius: 99, background: '#f0fdf4', color: '#166534', display: 'grid', placeItems: 'center' } }, ico('check', 24)),
        h('b', { className: 'mm-sora', style: { fontSize: 17 } }, 'Senha criada'),
        h('p', { className: 'mm-sub' }, 'Agora entre com seu CPF e a senha nova.')),
      h('button', { type: 'button', className: 'mm-btn pri', onClick: function () { if (props.onPronto) props.onPronto(dig(cpf)); } }, 'Entrar'));
    var el = h('div', { className: 'mm', style: { minHeight: 0, background: 'transparent' } },
      h(Sheet, { titulo: 'Primeiro acesso do locatário', onClose: props.onClose },
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
          erro ? h('div', { role: 'alert', style: { background: '#fef2f2', color: '#991b1b', borderRadius: 10, padding: '10px 12px', fontSize: 13 } }, erro) : null,
          conteudo)));
    // portal: o cartão do login tem transform (inclinação), que prenderia o position:fixed
    return window.ReactDOM && ReactDOM.createPortal && document.body ? ReactDOM.createPortal(el, document.body) : el;
  };
})();
