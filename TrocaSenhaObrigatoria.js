/* SENHA_FORTE_V1 */
// ============================================================
// TROCA DE SENHA OBRIGATÓRIA — Admin, Master e Financeiro
// Atualização de segurança da Central: protege os acessos e os dados.
// Aparece por cima de tudo logo depois do login, até a senha nova e
// forte ser salva. Sem botão de pular (só "Sair").
// Regras: mínimo 6 caracteres, letra maiúscula, número, caractere
// especial e diferente da senha atual (conferido no servidor).
// Padrão: Vanilla JS + React via CDN (sem JSX). window.TrocaSenhaObrigatoria
// ============================================================
(function () {
  const e = React.createElement;
  const { useState, useEffect, useRef } = React;

  const CSS = `
  .tso-cena{min-height:100vh;background:#f8f5fb;font-family:inherit;color:#111827;display:flex;flex-direction:column}
  .tso-topo{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 24px}
  .tso-marca{display:flex;align-items:center;gap:10px;font-weight:700;font-size:16px}
  .tso-marca i{width:30px;height:30px;border-radius:9px;background:#770fa8;display:inline-block}
  .tso-sair{border:0;background:none;font:inherit;font-size:13.5px;font-weight:600;color:#4b5563;cursor:pointer;padding:10px 8px;border-radius:10px}
  .tso-sair:hover{background:#efe4f7;color:#3a1556}
  .tso-meio{flex:1;display:flex;justify-content:center;align-items:flex-start;padding:8px 16px 48px}
  .tso-card{width:100%;max-width:480px;background:#fff;border:1px solid #efe4f7;border-radius:20px;box-shadow:0 24px 60px -30px rgba(58,21,86,.35);padding:28px;box-sizing:border-box;display:flex;flex-direction:column;gap:18px}
  .tso-h1{margin:0;font-size:21px;font-weight:700}
  .tso-aviso{background:#faf7fd;border:1px solid #efe4f7;border-radius:14px;padding:12px 14px;font-size:13.5px;color:#3a1556;line-height:1.5}
  .tso-campo{display:flex;flex-direction:column;gap:6px}
  .tso-campo label{font-size:13px;font-weight:600;color:#374151}
  .tso-box{position:relative}
  .tso-box .tso-ico{position:absolute;left:15px;top:16px;width:18px;height:18px;color:#6b7280;pointer-events:none}
  .tso-inp{width:100%;height:50px;border:1.5px solid #eadcf5;border-radius:14px;padding:0 50px 0 44px;font:inherit;font-size:15px;background:#fff;color:#111827;box-sizing:border-box;transition:border-color .2s,box-shadow .2s}
  .tso-inp:focus{outline:none;border-color:#770fa8;box-shadow:0 0 0 4px rgba(119,15,168,.12)}
  .tso-inp.err{border-color:#dc2626;box-shadow:0 0 0 4px rgba(220,38,38,.10)}
  .tso-olho{position:absolute;right:5px;top:5px;width:40px;height:40px;border:0;background:none;border-radius:10px;color:#6b7280;cursor:pointer;display:grid;place-items:center}
  .tso-olho:hover{background:#faf7fd;color:#5d0b85}
  .tso-forca{display:flex;align-items:center;gap:10px;margin-top:4px}
  .tso-barras{flex:1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}
  .tso-barras span{height:6px;border-radius:9px;background:#eee7f3;transition:background .2s}
  .tso-regras{display:flex;flex-direction:column;gap:7px}
  .tso-tit{font-size:12px;font-weight:700;color:#4b5563;letter-spacing:.04em;text-transform:uppercase}
  .tso-regra{display:flex;align-items:center;gap:9px;font-size:13.5px;color:#4b5563}
  .tso-regra.ok{color:#166534}
  .tso-bola{width:20px;height:20px;border-radius:99px;border:2px solid #d1d5db;box-sizing:border-box;flex:none;display:grid;place-items:center}
  .tso-regra.ok .tso-bola{border:0;background:#dcfce7;color:#166534}
  .tso-msg{font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px}
  .tso-btn{height:50px;border:0;border-radius:14px;font:inherit;font-size:15px;font-weight:700;color:#fff;cursor:pointer;background:#5d0b85;transition:background .2s}
  .tso-btn:hover{background:#3a1556}
  .tso-btn:disabled{background:#c9b3da;cursor:not-allowed}
  .tso-dica{font-size:12.5px;color:#4b5563;text-align:center;line-height:1.5;margin-top:-6px}
  .tso-erro{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:12px;padding:10px 12px;font-size:13px}
  @media (max-width:520px){.tso-card{padding:22px 18px;border-radius:16px}.tso-topo{padding:14px 16px}}
  `;
  function injetarCss() {
    if (typeof document === 'undefined' || document.getElementById('tso-css')) return;
    const s = document.createElement('style'); s.id = 'tso-css'; s.textContent = CSS; document.head.appendChild(s);
  }

  const svg = (d, extra) => e('svg', Object.assign({ width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' }, extra || {}), d);
  const icoCadeado = (cls) => svg([e('rect', { key: 'r', x: 4.5, y: 10.5, width: 15, height: 10, rx: 2.5 }), e('path', { key: 'p', d: 'M8 10.5V7.5a4 4 0 0 1 8 0v3' })], { className: cls });
  const icoOlho = (aberto) => svg(aberto
    ? [e('path', { key: 'a', d: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z' }), e('circle', { key: 'b', cx: 12, cy: 12, r: 3 })]
    : [e('path', { key: 'a', d: 'M3 3l18 18' }), e('path', { key: 'b', d: 'M10.6 5.6A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3 3.7M6.6 6.6C4 8.3 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1' })]);
  const icoCheck = (sz, sw) => svg(e('path', { d: 'M20 6 9 17l-5-5' }), { width: sz || 12, height: sz || 12, strokeWidth: sw || 3.5 });
  const icoEscudo = () => svg([e('path', { key: 'a', d: 'M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6z' }), e('path', { key: 'b', d: 'm9 12 2.2 2.2L15.5 10' })], { width: 24, height: 24 });

  const REGRAS = [
    { id: 'tamanho', t: 'No mínimo 6 caracteres', ok: (s) => s.length >= 6 },
    { id: 'maiuscula', t: 'Uma letra maiúscula (A–Z)', ok: (s) => /[A-Z]/.test(s) },
    { id: 'numero', t: 'Um número (0–9)', ok: (s) => /[0-9]/.test(s) },
    { id: 'especial', t: 'Um caractere especial (! @ # $ % & * …)', ok: (s) => /[^A-Za-z0-9]/.test(s) },
  ];
  const NOME_PERFIL = { admin: 'Administrador', admin_master: 'Master', admin_financeiro: 'Financeiro' };

  function TrocaSenhaObrigatoria({ usuario, apiUrl, fetchAuth, showToast, onConcluido, onSair }) {
    injetarCss();
    const _fetch = useRef(fetchAuth || (typeof window !== 'undefined' && window.fetchAuth) || fetch);
    const _api = (apiUrl || (typeof window !== 'undefined' && window.API_URL) || '');
    const [senha, setSenha] = useState('');
    const [conf, setConf] = useState('');
    const [ver, setVer] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState(null);
    const [erroAtual, setErroAtual] = useState(false);
    const [pronto, setPronto] = useState(false);
    const novaRef = useRef(null);

    // O usuário em memória pode estar desatualizado: confirma no servidor.
    useEffect(() => {
      let vivo = true;
      (async () => {
        try {
          const r = await _fetch.current(`${_api}/users/senha-obrigatoria/status`);
          if (r.ok) { const d = await r.json(); if (vivo && d && d.trocar_senha === false && onConcluido) onConcluido(); }
        } catch (_) { /* segue na tela */ }
      })();
      try { novaRef.current && novaRef.current.focus(); } catch (_) {}
      return () => { vivo = false; };
    }, []);

    const regras = REGRAS.map((r) => ({ ...r, cumpre: r.ok(senha) }));
    const n = regras.filter((r) => r.cumpre).length;
    const forca = senha ? n : 0;
    const corForca = ['#eee7f3', '#dc2626', '#d97706', '#d97706', '#16a34a'][forca];
    const forcaTxt = !senha ? '' : forca <= 1 ? 'Fraca' : forca <= 3 ? 'Média' : 'Forte';
    const todas = n === REGRAS.length;
    const igual = conf.length > 0 && conf === senha;
    const diferente = conf.length > 0 && conf !== senha && conf.length >= senha.length;
    const pode = todas && igual && !enviando;
    const primeiroNome = String((usuario && (usuario.fullName || usuario.full_name)) || '').trim().split(/\s+/)[0];
    const perfil = NOME_PERFIL[usuario && usuario.role] || 'Administrador';

    const salvar = async (ev) => {
      if (ev) ev.preventDefault();
      if (!pode) return;
      setEnviando(true); setErro(null); setErroAtual(false);
      try {
        const r = await _fetch.current(`${_api}/users/senha-obrigatoria`, { method: 'POST', body: JSON.stringify({ nova_senha: senha, confirmacao: conf }) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) {
          if (d && d.igual_atual) setErroAtual(true);
          setErro((d && d.error) || 'Não foi possível salvar a senha. Tente de novo.');
          setEnviando(false);
          return;
        }
        if (d.csrfToken) { try { sessionStorage.setItem('tutts_csrf', d.csrfToken); } catch (_) {} }
        try {
          const u = JSON.parse(sessionStorage.getItem('tutts_user') || 'null');
          if (u) sessionStorage.setItem('tutts_user', JSON.stringify({ ...u, trocar_senha: false }));
        } catch (_) {}
        setPronto(true);
        setEnviando(false);
      } catch (err) {
        setErro('Sem conexão com o servidor. Confira a internet e tente de novo.');
        setEnviando(false);
      }
    };

    const entrar = () => {
      // recarrega: a sessão nova (cookies já trocados) volta com as permissões completas
      try { window.location.reload(); } catch (_) { if (onConcluido) onConcluido(); }
    };

    const topo = e('div', { className: 'tso-topo' },
      e('div', { className: 'tso-marca' }, e('i', { 'aria-hidden': 'true' }), 'Central Tutts'),
      onSair ? e('button', { type: 'button', className: 'tso-sair', onClick: onSair }, 'Sair') : null);

    if (pronto) {
      return e('div', { className: 'tso-cena' }, topo,
        e('div', { className: 'tso-meio' },
          e('div', { className: 'tso-card', role: 'status', style: { alignItems: 'center', textAlign: 'center', gap: 12, padding: '36px 28px' } },
            e('div', { style: { width: 56, height: 56, borderRadius: 99, background: '#dcfce7', color: '#166534', display: 'grid', placeItems: 'center' } }, icoCheck(28, 3)),
            e('h1', { className: 'tso-h1' }, 'Senha atualizada'),
            e('div', { style: { fontSize: 14, color: '#4b5563', lineHeight: 1.55 } }, 'Pronto! Use a senha nova a partir do próximo acesso. Por segurança, as sessões abertas em outros aparelhos foram encerradas. Obrigado por ajudar a deixar a Central mais segura.'),
            e('button', { type: 'button', className: 'tso-btn', style: { width: '100%', marginTop: 8 }, onClick: entrar }, 'Entrar na Central'))));
    }

    return e('div', { className: 'tso-cena' }, topo,
      e('div', { className: 'tso-meio' },
        e('form', { className: 'tso-card', onSubmit: salvar, noValidate: true, 'aria-labelledby': 'tso-titulo' },
          e('div', { style: { display: 'flex', gap: 14, alignItems: 'flex-start' } },
            e('div', { style: { width: 48, height: 48, borderRadius: 14, background: '#f3e8fb', color: '#5d0b85', display: 'grid', placeItems: 'center', flex: 'none' } }, icoEscudo()),
            e('div', { style: { minWidth: 0 } },
              e('h1', { id: 'tso-titulo', className: 'tso-h1' }, 'Atualize sua senha'),
              e('div', { style: { fontSize: 13.5, color: '#4b5563', marginTop: 3 } }, (primeiroNome ? 'Olá, ' + primeiroNome + ' · ' : '') + 'perfil ' + perfil))),
          e('div', { className: 'tso-aviso' },
            e('b', null, 'Atualização de segurança da Central. '),
            'Para proteger os acessos e os dados da Central, todo usuário Administrador, Master e Financeiro precisa cadastrar uma senha nova e forte. É rápido e só acontece uma vez.'),

          e('div', { className: 'tso-campo' },
            e('label', { htmlFor: 'tso-nova' }, 'Nova senha'),
            e('div', { className: 'tso-box' },
              icoCadeado('tso-ico'),
              e('input', { id: 'tso-nova', ref: novaRef, className: 'tso-inp' + (erroAtual ? ' err' : ''), type: ver ? 'text' : 'password', value: senha, autoComplete: 'new-password', placeholder: 'Digite a nova senha', 'aria-describedby': 'tso-regras',
                onChange: (ev) => { setSenha(ev.target.value); setErro(null); setErroAtual(false); } }),
              e('button', { type: 'button', className: 'tso-olho', onClick: () => setVer(!ver), 'aria-label': ver ? 'Esconder senha' : 'Mostrar senha', 'aria-pressed': ver }, icoOlho(!ver))),
            e('div', { className: 'tso-forca' },
              e('div', { className: 'tso-barras', 'aria-hidden': 'true' }, [1, 2, 3, 4].map((i) => e('span', { key: i, style: { background: i <= forca ? corForca : '#eee7f3' } }))),
              e('span', { 'aria-live': 'polite', style: { fontSize: 12.5, fontWeight: 700, minWidth: 64, textAlign: 'right', color: forca === 4 ? '#166534' : forca >= 2 ? '#92400e' : '#b91c1c' } }, forcaTxt ? 'Senha ' + forcaTxt.toLowerCase() : ''))),

          e('div', { id: 'tso-regras', className: 'tso-regras' },
            e('div', { className: 'tso-tit' }, 'A senha precisa ter'),
            regras.map((r) => e('div', { key: r.id, className: 'tso-regra' + (r.cumpre ? ' ok' : '') },
              e('span', { className: 'tso-bola', 'aria-hidden': 'true' }, r.cumpre ? icoCheck() : null),
              e('span', null, r.t, e('span', { style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' } }, r.cumpre ? ' (ok)' : ' (falta)')))),
            e('div', { className: 'tso-regra' },
              e('span', { className: 'tso-bola', 'aria-hidden': 'true', style: erroAtual ? { borderColor: '#dc2626' } : null }),
              e('span', { style: erroAtual ? { color: '#b91c1c', fontWeight: 600 } : null }, 'Diferente da senha atual', e('span', { style: { color: '#6b7280', fontWeight: 400 } }, ' · conferido ao salvar')))),

          e('div', { className: 'tso-campo' },
            e('label', { htmlFor: 'tso-conf' }, 'Repita a nova senha'),
            e('div', { className: 'tso-box' },
              icoCadeado('tso-ico'),
              e('input', { id: 'tso-conf', className: 'tso-inp' + (diferente ? ' err' : ''), type: ver ? 'text' : 'password', value: conf, autoComplete: 'new-password', placeholder: 'Digite de novo, igual',
                onChange: (ev) => { setConf(ev.target.value); setErro(null); } })),
            igual && todas ? e('div', { className: 'tso-msg', style: { color: '#166534' } }, icoCheck(14, 3), 'As duas senhas são iguais') : null,
            diferente ? e('div', { className: 'tso-msg', role: 'alert', style: { color: '#b91c1c' } }, 'As senhas ainda não são iguais. Confira e digite de novo.') : null),

          erro ? e('div', { className: 'tso-erro', role: 'alert' }, erro) : null,
          e('button', { type: 'submit', className: 'tso-btn', disabled: !pode }, enviando ? 'Salvando...' : 'Salvar nova senha'),
          e('div', { className: 'tso-dica' }, pode ? 'Tudo certo. Pode salvar.' : !todas ? 'Cumpra os 4 itens acima para liberar o botão.' : 'Repita a mesma senha no segundo campo.'))));
  }

  window.TrocaSenhaObrigatoria = TrocaSenhaObrigatoria;
})();
